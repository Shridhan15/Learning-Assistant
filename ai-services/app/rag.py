import os
import time
from dotenv import load_dotenv
from pinecone import Pinecone, ServerlessSpec
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_huggingface import HuggingFaceEndpointEmbeddings
load_dotenv()
 
PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
INDEX_NAME = "learning-assistant"

# Initialize Pinecone
pc = Pinecone(api_key=PINECONE_API_KEY)
 
# embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")

embeddings = HuggingFaceEndpointEmbeddings(
    model="sentence-transformers/all-MiniLM-L6-v2",  # note: model, not model_name
    task="feature-extraction",
    huggingfacehub_api_token=os.getenv("HUGGINGFACEHUB_API_TOKEN"),
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
    Embeds chunks and uploads to Pinecone with real-time progress updates.
    """
    index = pc.Index(INDEX_NAME)
    vectors = []
    total_chunks = len(chunks)
    
    print(f"Embedding {total_chunks} chunks for {filename}...")

    # ---   Embedding Loop ---
    for i, chunk in enumerate(chunks): 
        vector_values = embeddings.embed_query(chunk.page_content)
            
        metadata = {
            "text": chunk.page_content,
            "filename": filename,
            "chunk_id": i,
            "user_id": user_id   
        }
            
        vector_id = f"{user_id}_{filename}_{i}"
        
        vectors.append({
            "id": vector_id, 
            "values": vector_values, 
            "metadata": metadata
        })

        # Update progress for every chunk
        if progress_callback:
            await progress_callback(i + 1, total_chunks, "Embedding")

    # ---   Uploading Loop ---
    batch_size = 100
    total_vectors = len(vectors)
    
    for i in range(0, total_vectors, batch_size):
        batch = vectors[i:i+batch_size]
        index.upsert(vectors=batch)
        print(f"Uploaded batch {i} to {i+batch_size}")
        
        # Send "Finalizing" update
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