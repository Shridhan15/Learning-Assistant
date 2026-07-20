import os
import time
import logging
import asyncio
from typing import List, Dict
from fastapi import HTTPException
from dotenv import load_dotenv
from pinecone import Pinecone, ServerlessSpec
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_huggingface import HuggingFaceEndpointEmbeddings  
from langchain_openai import AzureOpenAIEmbeddings
import cohere



load_dotenv()

# Safely fetch the key
COHERE_API_KEY = os.getenv("COHERE_API_KEY")

if not COHERE_API_KEY:
    raise ValueError("COHERE_API_KEY is missing from environment variables!")

# Initialize the Cohere client
co = cohere.Client(COHERE_API_KEY)
logger = logging.getLogger(__name__)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(name)s - %(message)s"
)
logger = logging.getLogger(__name__)
 
 
PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
INDEX_NAME = "learning-assistant" 

# embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
# Initialize Pinecone
pc = Pinecone(api_key=PINECONE_API_KEY)
 
existing_indexes = [index["name"] for index in pc.list_indexes()]
if INDEX_NAME not in existing_indexes:
    logger.info("Creating Pinecone index: %s", INDEX_NAME)
    pc.create_index(
        name=INDEX_NAME,
        dimension=1536,  
        metric="cosine",
        spec=ServerlessSpec(cloud="aws", region="us-east-1")
    )

logger.info("Connecting to Azure OpenAI Embeddings")

embeddings = AzureOpenAIEmbeddings(
    azure_deployment=os.getenv("AZURE_OPENAI_EMBEDDING_DEPLOYMENT"),  
    openai_api_version=os.getenv("OPENAI_API_VERSION"),               
    azure_endpoint=os.getenv("AZURE_OPENAI_ENDPOINT"),                 
    api_key=os.getenv("AZURE_OPENAI_API_KEY"),
)

def load_pdf(file_path):
    loader = PyPDFLoader(file_path)
    documents = loader.load()
    return documents

def chunk_text(documents):
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=800, chunk_overlap=150)
    chunks = text_splitter.split_documents(documents)
    return chunks

 
async def store_in_pinecone(chunks, filename, user_id, progress_callback=None):
    """
    Batch embed chunks and upload to Pinecone.
    Async-safe + timeout protected.
    """

    index = pc.Index(INDEX_NAME)
    vectors = []
    total_chunks = len(chunks)

    logger.info("Starting batch embedding for %d chunks", total_chunks)

    BATCH_SIZE = 32

    for i in range(0, total_chunks, BATCH_SIZE):
        batch_chunks = chunks[i: i + BATCH_SIZE]
        batch_texts = [c.page_content for c in batch_chunks]

        try:
            batch_embeddings = await asyncio.wait_for(
                asyncio.to_thread(embeddings.embed_documents, batch_texts),
                timeout=30
            )
        except asyncio.TimeoutError:
            logger.error("Embedding batch timeout at batch %d", i)
            continue
        except Exception as e:
            logger.error("Embedding batch error at batch %d: %s", i, str(e))
            continue

        for j, (chunk, vector_values) in enumerate(zip(batch_chunks, batch_embeddings)):
            absolute_index = i + j

            metadata = {
                "text": chunk.page_content,
                "filename": filename,
                "chunk_id": absolute_index,
                "user_id": user_id,
                "page": chunk.metadata.get("page", "N/A")
            }

            vector_id = f"{user_id}_{filename}_{absolute_index}"

            vectors.append({
                "id": vector_id,
                "values": vector_values,
                "metadata": metadata
            })

        if progress_callback:
            current_progress = min(i + BATCH_SIZE, total_chunks)
            await progress_callback(
                current_progress,
                total_chunks,
                "Embedding & Processing..."
            )

    logger.info("Uploading %d vectors to Pinecone", len(vectors))

    UPSERT_BATCH_SIZE = 100

    for i in range(0, len(vectors), UPSERT_BATCH_SIZE):
        batch = vectors[i: i + UPSERT_BATCH_SIZE]

        try:
            await asyncio.to_thread(index.upsert, vectors=batch)
        except Exception as e:
            logger.error("Pinecone upsert error: %s", str(e))
            continue

        if progress_callback:
            await progress_callback(
                total_chunks,
                total_chunks,
                "Saving to Database..."
            )

    logger.info("Upload complete")

 
def retrieve(question: str, filename: str, user_id: str, k: int = 15) -> List[Dict]:
    """
    Retrieves top 15 chunks from Pinecone, then uses Cohere to re-rank 
    and return the true top 3 most relevant chunks.
    """
    try:
        index = pc.Index(INDEX_NAME)
        query_vector = embeddings.embed_query(question)
        
        # 1. Fetch a broader net of chunks from Pinecone (k=15)
        results = index.query(
            vector=query_vector,
            top_k=k, 
            include_metadata=True,
            filter={"filename": filename, "user_id": user_id}
        )

        matches = results.get("matches", [])
        if not matches:
            logger.info("No matches found for query: %s", question)
            return []

        # 2. Extract the texts to send to the re-ranker
        # We also keep a dictionary mapping text -> original metadata so we don't lose page numbers
        text_to_metadata = {}
        docs_to_rerank = []
        
        for match in matches:
            text = match.get("metadata", {}).get("text", "")
            if text:
                docs_to_rerank.append(text)
                text_to_metadata[text] = match.get("metadata", {})

        if not docs_to_rerank:
            return []

        # 3. Pass the texts to Cohere for Re-ranking
        rerank_results = co.rerank(
            model="rerank-english-v3.0",
            query=question,
            documents=docs_to_rerank,
            top_n=3, # Tell Cohere to only return the absolute best 3
            return_documents=True
        )

        # 4. Format the final output exactly as your app expects it
        retrieved_chunks = []
        for result in rerank_results.results:
            reranked_text = result.document.text
            original_metadata = text_to_metadata.get(reranked_text, {})
            
            retrieved_chunks.append({
                "text": reranked_text,
                "page": original_metadata.get("page"),
                "score": result.relevance_score # This is the new, more accurate score!
            })

        logger.info(f"Successfully re-ranked and returned top 3 chunks for {user_id}")
        logger.info(f"RETRIEVED CHUNKS :{retrieved_chunks}")
        return retrieved_chunks

    except Exception as e:
        logger.error("RAG retrieval error: %s", str(e))
        return []