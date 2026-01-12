import os
import json
import instructor

import shutil
from fastapi import FastAPI, UploadFile, File, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel,Field
from dotenv import load_dotenv
from groq import Groq
from typing import List

from supabase import create_client, Client 

load_dotenv()

# Import your RAG functions 
from app.rag import load_pdf, chunk_text, store_in_pinecone, retrieve

app = FastAPI()

# --- CONFIGURATION ---
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Initialize Groq
client = instructor.from_groq(Groq(api_key=os.environ.get("GROQ_API_KEY")))

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = "app/data/uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

class QuizRequest(BaseModel):
    topic: str
    filename: str

# --- 1. UPDATED ENDPOINT: GET LIBRARY (FIXED) ---
@app.get("/files")
def list_files(user_id: str = Header(None)): # <--- FIXED: Accept user_id header
    """Fetches filenames belonging ONLY to the current user"""
    
    if not user_id:
        return {"files": []}

    try:
        # FIXED: Add the .eq("user_id", user_id) filter!
        response = supabase.table("documents")\
            .select("filename")\
            .eq("user_id", user_id)\
            .execute()
        
        file_list = [item['filename'] for item in response.data]
        return {"files": file_list}
        
    except Exception as e:
        print(f"Error fetching files: {e}")
        return {"files": []}
    



# --- 2. UPLOAD ENDPOINT (This was already good) ---
@app.post("/upload")
async def upload_pdf(file: UploadFile = File(...), user_id: str = Header(...)):
    try:
        # A. Save file locally (temp)
        path = f"{UPLOAD_DIR}/{file.filename}"
        with open(path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # B. Check if file already exists FOR THIS USER
        existing = supabase.table("documents").select("filename")\
            .eq("filename", file.filename)\
            .eq("user_id", user_id)\
            .execute()
            
        if not existing.data:
            # C. If new, process Vector Embeddings (Pinecone)
            documents = load_pdf(path)
            chunks = chunk_text(documents)
            store_in_pinecone(chunks, file.filename, user_id)
            
            # D. Save Filename to Supabase Catalog with User ID
            supabase.table("documents").insert({
                "filename": file.filename, 
                "user_id": user_id
            }).execute()
            message = "Uploaded and processed successfully"
        else:
            message = "File already exists, skipping processing."

        return {"message": message, "filename": file.filename}

    except Exception as e:
        print(e)
        raise HTTPException(status_code=500, detail="Upload failed")
    
@app.get("/results")
def get_user_results(user_id: str = Header(None)):
    if not user_id:
        return {"results": []}

    try:
        # Fetch all results for this user, newest first
        response = supabase.table("quiz_results")\
            .select("*")\
            .eq("user_id", user_id)\
            .order("created_at", desc=True)\
            .execute()
            
        return {"results": response.data}
    except Exception as e:
        print(f"Error fetching results: {e}")
        return {"results": []}
    

    

class QuizResultSchema(BaseModel):
    filename: str
    topic: str
    score: int
    total_questions: int

# Save Endpoint
@app.post("/save-result")
async def save_quiz_result(result: QuizResultSchema, user_id: str = Header(...)):
    try:
        supabase.table("quiz_results").insert({
            "user_id": user_id,
            "filename": result.filename,
            "topic": result.topic,
            "score": result.score,
            "total_questions": result.total_questions
        }).execute()
        
        return {"message": "Result saved successfully"}
    except Exception as e:
        print(f"Error saving result: {e}")
        # We generally don't want to crash the app if saving history fails, 
        # so we return an error but keep the status 200 or handle gracefully
        raise HTTPException(status_code=500, detail="Failed to save result")
    

class Question(BaseModel):
    id: int = Field(..., description="The question number (1, 2, 3...)")
    question: str = Field(..., description="The question text")
    options: List[str] = Field(..., min_length=4, max_length=4, description="List of exactly 4 options")
    correctAnswer: str = Field(..., description="The correct option text (must match one of the options)")
    explanation: str = Field(..., description="A clear 1-2 sentence explanation of why the answer is correct.")


class QuizResponse(BaseModel):
    questions: List[Question]


# --- 3. GENERATE QUIZ (This was already good) ---
@app.post("/generate-quiz")
async def generate_quiz(req: QuizRequest, user_id: str = Header(...)):
    print(f"Generating quiz for topic: {req.topic}")
    
    # 1. Retrieve Context
    retrieved_chunks = retrieve(req.topic, req.filename, user_id)
    
    if not retrieved_chunks:
        return {"questions": []}
    
    context_text = "\n".join(retrieved_chunks)

    # 2. Call Groq with Pydantic Validation
    try:
        # We no longer need the complex JSON instructions in the prompt.
        # The 'response_model' handles all the validation logic.
        quiz_data = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            max_retries=3,
            response_model=QuizResponse, # <--- Forces the output to match our Schema
            messages=[
                {
                    "role": "system", 
                     "content": """
                    You are an expert assessment specialist. Create a 5-question multiple choice quiz based STRICTLY on the provided context.
                    
                    CRITICAL RULES FOR OPTIONS:
                    1. **No Ambiguity:** Ensure there is only ONE indisputably correct answer based on the text.
                    2. **Handle Lists Carefully:** If the text states "A, B, and C cause X", do NOT create a question "What causes X?" with options "A", "B", and "C". This is confusing. Instead, ask "Which of the following is NOT a cause?" or combine them.
                    3. **Clear Distractors:** Incorrect options must be plausible but clearly wrong based on the text. Do not use vague options like "Other" or "Various factors".
                    4. **Self-Contained:** The question must be answerable purely from the provided text chunk.
                    5. **No Repetition:** Do not repeat questions or options.
                    """
                },
                {
                    "role": "user", 
                    "content": f"Context: {context_text}\nTopic: {req.topic}"
                }
            ],
            temperature=0.3, # Slightly lower temp for better structure adherence
        )

        # 3. Return the validated data as a dictionary
        return quiz_data.model_dump()

    except Exception as e:
        print(f"Error calling Groq: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate quiz")
    
