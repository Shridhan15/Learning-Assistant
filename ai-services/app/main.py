import os
import json
import instructor

import shutil
from fastapi import FastAPI, UploadFile, File, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel,Field
from dotenv import load_dotenv
from groq import Groq
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from typing import List

from supabase import create_client, Client 

load_dotenv()

#  RAG functions 
from app.rag import load_pdf, chunk_text, store_in_pinecone, retrieve

app = FastAPI()

 
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

#  Groq
client = instructor.from_groq(Groq(api_key=os.environ.get("GROQ_API_KEY")))

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = "app/data/uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

chat_model = ChatGroq(
    temperature=0.5,
    model_name="llama-3.3-70b-versatile",
    groq_api_key=os.environ.get("GROQ_API_KEY")
)


#  Get chat history
@app.get("/chat_history")
def get_chat_history(filename: str, user_id: str = Header(None)):
    if not user_id:
        raise HTTPException(status_code=400, detail="User ID required")
    
    try: 
        response = supabase.table("chat_history")\
            .select("role, content")\
            .eq("user_id", user_id)\
            .eq("filename", filename)\
            .order("created_at", desc=False)\
            .execute()
            
        return {"history": response.data}
    except Exception as e:
        print(f"Error fetching history: {e}")
        return {"history": []}
    

class ChatRequest(BaseModel):
    message: str
    filename: str

@app.post("/chat")
def chat_with_book(request: ChatRequest, user_id: str = Header(None)):
    if not user_id:
        raise HTTPException(status_code=400, detail="User ID required")

    # save user message to DB
    try:
        supabase.table("chat_history").insert({
            "user_id": user_id,
            "filename": request.filename,
            "role": "user",
            "content": request.message
        }).execute()
    except Exception as e:
        print(f"Error saving user message: {e}")

    # fetch history(last 10 messages)
    try:
        history_response = supabase.table("chat_history")\
            .select("role, content")\
            .eq("user_id", user_id)\
            .eq("filename", request.filename)\
            .order("created_at", desc=True)\
            .limit(10)\
            .execute()
         
        db_history = history_response.data[::-1] 
    except Exception as e:
        print(f"Error fetching history context: {e}")
        db_history = []
     
    chat_history = []
    for msg in db_history:
        if msg['role'] == 'user':
            chat_history.append(HumanMessage(content=msg['content']))
        else:
            chat_history.append(AIMessage(content=msg['content']))
 
    # If history, check if the new message is a follow-up or a new topic.
    if len(chat_history) > 1:  
        rephrase_prompt = ChatPromptTemplate.from_messages([
            MessagesPlaceholder(variable_name="chat_history"),
            ("user", "{input}"),
            (
                "system",
                "Given the above conversation, generate a search query to look up in order to get information relevant to the conversation. "
                "IMPORTANT: If the user is asking a follow-up question, combine it with previous context. "
                "If the user is asking a completely new question (changing the topic), ignore the history and generate a query for the new topic only. "
                "Return ONLY the query string, nothing else."
            )
        ])
        
        rephrase_chain = rephrase_prompt | chat_model
        
        # We pass the history excluding the very last message (which is the current one) 
        # normally, but since we fetched from DB, 'chat_history' contains the current message 
        # because we inserted it in Step 1.
        # To avoid confusion, we can just pass the whole history.
        search_query = rephrase_chain.invoke({
            "chat_history": chat_history, 
            "input": request.message
        }).content
    else:
        search_query = request.message

    print(f"DEBUG: Original='{request.message}' -> Search='{search_query}'")

    # RETRIEVE & ANSWER 
    context_chunks = retrieve(search_query, request.filename, user_id)
    context_text = "\n\n".join(context_chunks)

    answer_prompt = ChatPromptTemplate.from_messages([
        ("system", "You are a helpful AI Tutor. Answer the user's question based ONLY on the following context. Use easy way of explaning, do not load with heavy book like text only, you are a teacher, teach in that way, do no provide excess text, do not make long explanation,keep simple. If the answer is not in the context, say you don't know.\n\nContext:\n{context}"),
        MessagesPlaceholder(variable_name="chat_history"),
        ("user", "{input}")
    ])
    
    chain = answer_prompt | chat_model
    
    response = chain.invoke({
        "context": context_text,
        "chat_history": chat_history,
        "input": request.message
    })

    # SAVE AI RESPONSE TO DB
    try:
        supabase.table("chat_history").insert({
            "user_id": user_id,
            "filename": request.filename,
            "role": "assistant",
            "content": response.content
        }).execute()
    except Exception as e:
        print(f"Error saving AI message: {e}")

    return {"response": response.content}


class QuizRequest(BaseModel):
    topic: str
    filename: str
 
@app.get("/files")
def list_files(user_id: str = Header(None)):  
    """Fetches filenames belonging ONLY to the current user"""
    
    if not user_id:
        return {"files": []}

    try: 
        response = supabase.table("documents")\
            .select("filename")\
            .eq("user_id", user_id)\
            .execute()
        
        file_list = [item['filename'] for item in response.data]
        return {"files": file_list}
        
    except Exception as e:
        print(f"Error fetching files: {e}")
        return {"files": []}
    
 
@app.post("/upload")
async def upload_pdf(file: UploadFile = File(...), user_id: str = Header(...)):
    try:
        # Save file locally (temp)
        path = f"{UPLOAD_DIR}/{file.filename}"
        with open(path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # Check if file already exists for this user
        existing = supabase.table("documents").select("filename")\
            .eq("filename", file.filename)\
            .eq("user_id", user_id)\
            .execute()
            
        if not existing.data:
            #  If new Vector Embeddings (Pinecone)
            documents = load_pdf(path)
            chunks = chunk_text(documents)
            store_in_pinecone(chunks, file.filename, user_id)
            
            #  Save Filename to Supabase Catalog with User ID
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
        raise HTTPException(status_code=500, detail="Failed to save result")
    

class Question(BaseModel):
    id: int = Field(..., description="The question number (1, 2, 3...)")
    question: str = Field(..., description="The question text")
    options: List[str] = Field(..., min_length=4, max_length=4, description="List of exactly 4 options")
    correctAnswer: str = Field(..., description="The correct option text (must match one of the options)")
    explanation: str = Field(..., description="A clear 1-2 sentence explanation of why the answer is correct.")


class QuizResponse(BaseModel):
    questions: List[Question]

 
@app.post("/generate-quiz")
async def generate_quiz(req: QuizRequest, user_id: str = Header(...)):
    print(f"Generating quiz for topic: {req.topic}")
    
    # Retrieve Context
    retrieved_chunks = retrieve(req.topic, req.filename, user_id)
    
    if not retrieved_chunks:
        return {"questions": []}
    
    context_text = "\n".join(retrieved_chunks)

    #  Call Groq with Pydantic Validation
    try: 
        quiz_data = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            max_retries=3,
            response_model=QuizResponse,  
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
            temperature=0.3,  
        )
 
        return quiz_data.model_dump()

    except Exception as e:
        print(f"Error calling Groq: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate quiz")
    
