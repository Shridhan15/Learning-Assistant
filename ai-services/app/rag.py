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

def store_in_pinecone(chunks, filename):
    """
    Embeds chunks and uploads them to Pinecone with metadata.
    """
    index = pc.Index(INDEX_NAME)
    
    vectors = []
    
    print(f"Embedding {len(chunks)} chunks for {filename}...")
    
    for i, chunk in enumerate(chunks):
        # 1. Create Vector (Embedding)
        vector_values = embeddings.embed_query(chunk.page_content)
        
        # 2. Prepare Metadata (Store the text inside the DB!)
        metadata = {
            "text": chunk.page_content,
            "filename": filename,
            "chunk_id": i
        }
        
        # 3. Create ID
        vector_id = f"{filename}_{i}"
        
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

def retrieve(question, filename=None, k=5):
    """
    Queries Pinecone for relevant chunks.
    If filename is provided, it filters results to only that book.
    """
    index = pc.Index(INDEX_NAME)
    
    # 1. Embed the Question
    query_vector = embeddings.embed_query(question)
    
    # 2. Define Filter (Optional: specific book only)
    query_filter = {"filename": filename} if filename else None
    
    # 3. Query Pinecone
    results = index.query(
        vector=query_vector,
        top_k=k,
        include_metadata=True, # Important: Get the text back!
        filter=query_filter
    )
    
    # 4. Extract Text
    context_chunks = [match['metadata']['text'] for match in results['matches']]
    return context_chunks