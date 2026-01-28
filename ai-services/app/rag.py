import os
import time
from dotenv import load_dotenv
from pinecone import Pinecone, ServerlessSpec
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_huggingface import HuggingFaceEndpointEmbeddings
from langchain_community.embeddings.fastembed import FastEmbedEmbeddings
load_dotenv()
 
PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
INDEX_NAME = "learning-assistant"

# Initialize Pinecone
pc = Pinecone(api_key=PINECONE_API_KEY)
 
# embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")

MODEL_CACHE_DIR = os.path.join(os.getcwd(), "model_cache")

print(f"Loading FastEmbed model from: {MODEL_CACHE_DIR}...")

# Initialize with the explicit cache path
embeddings = FastEmbedEmbeddings(
    model_name="BAAI/bge-small-en-v1.5",
    cache_path=MODEL_CACHE_DIR 
)

def load_pdf(file_path):
    loader = PyPDFLoader(file_path)
    documents = loader.load()
    return documents

def chunk_text(documents):
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
    chunks = text_splitter.split_documents(documents)
    return chunks

 
async def store_in_pinecone(chunks, filename, user_id, progress_callback=None):
    """
    Embeds chunks in BATCHES (Much faster) and uploads to Pinecone.
    """
    index = pc.Index(INDEX_NAME)
    vectors = []
    total_chunks = len(chunks)
    
    print(f"Starting batch embedding for {total_chunks} chunks...")

    # --- BATCH EMBEDDING SETTINGS ---
    # Hugging Face Free Tier usually handles ~32 texts per request reliably.
    BATCH_SIZE = 32 
    
    # 1. Process chunks in batches
    for i in range(0, total_chunks, BATCH_SIZE):
        batch_chunks = chunks[i : i + BATCH_SIZE]
        batch_texts = [c.page_content for c in batch_chunks]
        
        # This sends ONE request for 32 chunks!
        try:
            batch_embeddings = embeddings.embed_documents(batch_texts)
        except Exception as e:
            print(f"Error embedding batch {i}: {e}")
            continue

        # 2. Pack the results
        for j, (chunk, vector_values) in enumerate(zip(batch_chunks, batch_embeddings)):
            # Calculate absolute index
            absolute_index = i + j
            
            metadata = {
                "text": chunk.page_content,
                "filename": filename,
                "chunk_id": absolute_index,
                "user_id": user_id   
            }
            
            vector_id = f"{user_id}_{filename}_{absolute_index}"
            
            vectors.append({
                "id": vector_id, 
                "values": vector_values, 
                "metadata": metadata
            })

        # Update Progress (Visual feedback for user)
        if progress_callback:
            current_progress = min(i + BATCH_SIZE, total_chunks)
            await progress_callback(current_progress, total_chunks, "Embedding & Processing...")

    # --- Uploading to Pinecone ---
    # Pinecone handles large upserts well, 100 is a good size.
    print(f"Uploading {len(vectors)} vectors to Pinecone...")
    
    upsert_batch_size = 100
    for i in range(0, len(vectors), upsert_batch_size):
        batch = vectors[i : i + upsert_batch_size]
        index.upsert(vectors=batch)
        
        if progress_callback:
             await progress_callback(total_chunks, total_chunks, "Saving to Database...")
    
    print("Upload complete.")


def retrieve(question, filename, user_id, k=3):
    """
    Queries Pinecone for relevant chunks.
    STRICTLY filters by user_id and filename.
    """
    index = pc.Index(INDEX_NAME)
     
    query_vector = embeddings.embed_query(question)
     
    query_filter = {
        "filename": filename,
        "user_id": user_id  
    }
    
    #  Query Pinecone
    results = index.query(
        vector=query_vector,
        top_k=k,
        include_metadata=True,
        filter=query_filter
    )
    
    #  Extract Text
    context_chunks = [match['metadata']['text'] for match in results['matches']]
    return context_chunks