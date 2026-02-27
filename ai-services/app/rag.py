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

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(name)s - %(message)s"
)
logger = logging.getLogger(__name__)

load_dotenv()
 
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

 
def retrieve(question: str, filename: str, user_id: str, k: int = 5) -> List[Dict]:
    """
    Retrieves top-k relevant chunks from Pinecone.
    - Multi-tenant safe
    - No hard similarity threshold
    - Explicit score sorting
    - Returns top 3 chunks
    """

    try:
        index = pc.Index(INDEX_NAME)

        query_vector = embeddings.embed_query(question)

        query_filter = {
            "filename": filename,
            "user_id": user_id
        }

        results = index.query(
            vector=query_vector,
            top_k=k,
            include_metadata=True,
            filter=query_filter
        )

        matches = results.get("matches", [])

        if not matches:
            logger.info("No matches found for query: %s", question)
            return []

        logger.info("Total matches returned by Pinecone: %d", len(matches)) 
        sorted_matches = sorted(
            matches,
            key=lambda x: x.get("score", 0),
            reverse=True
        )
 
        top_matches = sorted_matches[:3]

        retrieved_chunks = []

        for match in top_matches:
            metadata = match.get("metadata", {})

            retrieved_chunks.append({
                "text": metadata.get("text", ""),
                "page": metadata.get("page"),
                "score": match.get("score", 0)
            })

        logger.info(
            "Returning top %d chunks for user %s",
            len(retrieved_chunks),
            user_id
        )

        return retrieved_chunks

    except Exception as e:
        logger.error("RAG retrieval error: %s", str(e))
        return []