import os
import json
import shutil
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from groq import Groq
from supabase import create_client, Client 

# Import your RAG functions (make sure store_in_pinecone is updated as per previous step)
from app.rag import load_pdf, chunk_text, store_in_pinecone, retrieve

load_dotenv()

app = FastAPI()

# --- CONFIGURATION ---
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY) # <--- Initialize Supabase

# Initialize Groq
client = Groq(api_key=os.environ.get("GROQ_API_KEY"))

# CORS setup... (Keep your existing CORS code)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow all for dev, restrict for prod
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = "app/data/uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

class QuizRequest(BaseModel):
    topic: str
    filename: str

# --- 1. NEW ENDPOINT: GET LIBRARY ---
@app.get("/files")
def list_files():
    """Fetches unique filenames from Supabase"""
    try:
        # Query the 'documents' table we created
        response = supabase.table("documents").select("filename").execute()
        
        # Extract just the list of strings
        # response.data looks like: [{'filename': 'book.pdf'}, {'filename': 'notes.pdf'}]
        file_list = [item['filename'] for item in response.data]
        
        return {"files": file_list}
    except Exception as e:
        print(f"Error fetching files: {e}")
        return {"files": []}

# --- 2. UPDATED UPLOAD ENDPOINT ---
@app.post("/upload")
async def upload_pdf(file: UploadFile = File(...)):
    try:
        # A. Save file locally (temp)
        path = f"{UPLOAD_DIR}/{file.filename}"
        with open(path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # B. Check if file already exists in DB to avoid duplicates
        existing = supabase.table("documents").select("filename").eq("filename", file.filename).execute()
        
        if not existing.data:
            # C. If new, process Vector Embeddings (Pinecone)
            documents = load_pdf(path)
            chunks = chunk_text(documents)
            store_in_pinecone(chunks, file.filename)
            
            # D. Save Filename to Supabase Catalog
            supabase.table("documents").insert({"filename": file.filename}).execute()
            message = "Uploaded and processed successfully"
        else:
            message = "File already exists, skipping processing."

        return {"message": message, "filename": file.filename}

    except Exception as e:
        print(e)
        raise HTTPException(status_code=500, detail="Upload failed")



@app.post("/generate-quiz")
async def generate_quiz(req: QuizRequest):
    print(f"Generating quiz for topic: {req.topic}")
    
    # 1. Retrieve Context
    retrieved_chunks = retrieve(req.topic)
    
    if not retrieved_chunks:
        return {"questions": []}
    
    context_text = "\n".join(retrieved_chunks)

    # 2. Prompt Engineering (Optimized for Llama 3.1 8B)
    system_prompt = """
    You are an expert teacher. Create a 5-question multiple choice quiz based strictly on the provided context.
    
    CRITICAL INSTRUCTIONS:
    1. Output MUST be valid JSON only.
    2. Do NOT write introductions or explanations.
    3. Do NOT use markdown code blocks (like ```json).
    
    JSON STRUCTURE:
    {
      "questions": [
        {
          "id": 1,
          "question": "Question text?",
          "options": ["Option A", "Option B", "Option C", "Option D"],
          "correctAnswer": "Option A"
        }
      ]
    }
    """

    user_prompt = f"""
    Context: {context_text}
    Topic: {req.topic}
    """

    try:
        # 3. Call Groq API with Llama 3.1 8B Instant
        chat_completion = client.chat.completions.create(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            model="llama-3.1-8b-instant",  # <--- UPDATED MODEL
            temperature=0.5,
            response_format={"type": "json_object"} 
        )

        response_content = chat_completion.choices[0].message.content
        data = json.loads(response_content)
        return data

    except Exception as e:
        print(f"Error calling Groq: {e}")
        # Fallback error handling in case JSON parsing fails
        raise HTTPException(status_code=500, detail="Failed to generate quiz")