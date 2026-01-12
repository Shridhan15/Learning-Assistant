import os
import time
from dotenv import load_dotenv
from pinecone import Pinecone, ServerlessSpec
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings

load_dotenv()

# --- CONFIGURATION ---
PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
INDEX_NAME = "learning-assistant"

# Initialize Pinecone
pc = Pinecone(api_key=PINECONE_API_KEY)

# Initialize Embeddings (Matches your previous logic)
# Ensure this dimension matches your Pinecone Index settings! 
# 'all-MiniLM-L6-v2' outputs 384 dimensions.
embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")

def load_pdf(file_path):
    loader = PyPDFLoader(file_path)
    documents = loader.load()
    return documents

def chunk_text(documents):
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
    chunks = text_splitter.split_documents(documents)
    return chunks

def store_in_pinecone(chunks, filename, user_id):
    """
    Embeds chunks and uploads them to Pinecone with metadata AND user_id.
    """
    index = pc.Index(INDEX_NAME)
    
    vectors = []
    
    print(f"Embedding {len(chunks)} chunks for {filename} (User: {user_id})...")
    
    for i, chunk in enumerate(chunks):
        # 1. Create Vector (Embedding)
        vector_values = embeddings.embed_query(chunk.page_content)
        
        # 2. Prepare Metadata (Store text + filename + user_id)
        metadata = {
            "text": chunk.page_content,
            "filename": filename,
            "chunk_id": i,
            "user_id": user_id  # <--- SECURITY: Tag the owner
        }
        
        # 3. Create Unique ID (Include user_id to avoid collisions if two users have "math.pdf")
        vector_id = f"{user_id}_{filename}_{i}"
        
        vectors.append({
            "id": vector_id, 
            "values": vector_values, 
            "metadata": metadata
        })

    # Batch upload (Pinecone likes batches of ~100)
    batch_size = 100
    for i in range(0, len(vectors), batch_size):
        batch = vectors[i:i+batch_size]
        index.upsert(vectors=batch)
        print(f"Uploaded batch {i} to {i+batch_size}")
    
    print("Upload complete.")

def retrieve(question, filename, user_id, k=5):
    """
    Queries Pinecone for relevant chunks.
    STRICTLY filters by user_id and filename.
    """
    index = pc.Index(INDEX_NAME)
    
    # 1. Embed the Question
    query_vector = embeddings.embed_query(question)
    
    # 2. Define Filter (Must match BOTH filename and user_id)
    query_filter = {
        "filename": filename,
        "user_id": user_id # <--- SECURITY: Only search this user's data
    }
    
    # 3. Query Pinecone
    results = index.query(
        vector=query_vector,
        top_k=k,
        include_metadata=True,
        filter=query_filter
    )
    
    # 4. Extract Text
    context_chunks = [match['metadata']['text'] for match in results['matches']]
    return context_chunks