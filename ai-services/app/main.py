import os
import json
from urllib import response
import instructor
import asyncio
from fastapi import HTTPException
import traceback
import time
import pytz
import requests
import shutil
import string
from fastapi import FastAPI, UploadFile, File, Header,WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel,Field,validator
from dotenv import load_dotenv
from groq import Groq
from langchain_groq import ChatGroq
from langchain_core.tools import tool
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from typing import List, Optional,Literal
from datetime import datetime
from pinecone import Pinecone, ServerlessSpec

import asyncio

load_dotenv()


 
PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
INDEX_NAME = "learning-assistant"
pc = Pinecone(api_key=PINECONE_API_KEY)



#  file imports
from app.rag import load_pdf, chunk_text, store_in_pinecone, retrieve
from app.services.websocket_manager import manager
from app.services.vision_service import analyze_chat_image 
from app.supabase import supabase as db
from app.services import groq_podcast as llm
from app.services import azure_voice as tts
from app.services.clean_tts import clean_text_for_xml
from app.services.usage_service import check_and_increment
from app.routers import usage 
from app.routers.chat import router as chat_router
from app.routers.quiz import router as quiz_router
from app.routers import calendar
from app.routers.files import router as file_router

app = FastAPI()

from app.config import supabase
#  Groq
client = instructor.from_groq(Groq(api_key=os.environ.get("GROQ_API_KEY")))

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"status": "StudyMate AI Service is Running"}

UPLOAD_DIR = "app/data/uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

chat_model = ChatGroq(
    temperature=0.5,
    model_name="llama-3.3-70b-versatile",
    groq_api_key=os.environ.get("GROQ_API_KEY")
)


class ChatRequest(BaseModel):
    message: str
    filename: str
    image: Optional[str] = None
    is_socratic: bool = False
    is_feynman: bool = False


SKIP_RAG_KEYWORDS = {
    "hi", "hello", "hey", "hie", "heya",
    "thanks", "thank you", "tks", "thx", "cool", "ok", "okay", "k", "got it",
    "bye", "byee", "goodbye", "cya", "see ya","see you",'good morning', "good night", "gn"
}


 
    
@app.post("/chat")
async def chat_with_book(request: ChatRequest, user_id: str = Header(None)):
    if not user_id:
        raise HTTPException(status_code=400, detail="User ID required")
    
    await check_and_increment( user_id, "tutor_chat", amount=1)
    print(f"DEBUG MODE CHECK: Socratic={request.is_socratic}, Feynman={request.is_feynman}")
    
    # Start with the plain text message
    effective_message = request.message

    # --- VISION PROCESSING ---
    if request.image:
        print("Processing chat image with Azure...")
        try:
            # Get description from Azure Vision
            image_description = analyze_chat_image(request.image)
            
            # Combine User Text + Image Context
            effective_message = (
                f"{request.message}\n\n"
                f"[CONTEXT FROM UPLOADED IMAGE: {image_description}]"
            )
            print(f"DEBUG: Image Description: {image_description[:50]}...")
        except Exception as e:
            print(f"Error processing image: {e}") 
            pass
 
    try:
        supabase.table("chat_history").insert({
            "user_id": user_id,
            "filename": request.filename,
            "role": "user",
            "content": effective_message 
        }).execute()
    except Exception as e:
        print(f"Error saving user message: {e}")

    # ---  FETCH HISTORY ---
    try:
        history_response = supabase.table("chat_history")\
            .select("role, content")\
            .eq("user_id", user_id)\
            .eq("filename", request.filename)\
            .order("created_at", desc=True)\
            .limit(5)\
            .execute()
          
        db_history = history_response.data[::-1] 
    except Exception as e:
        print(f"Error fetching history context: {e}")
        db_history = []

    

    msg_clean = request.message.lower().strip().translate(str.maketrans('', '', string.punctuation))
 
    is_keyword = msg_clean in SKIP_RAG_KEYWORDS 
    is_short = len(msg_clean) < 3  
    is_conversational = is_keyword or is_short
 
    # Convert to LangChain format
    chat_history = []
    for msg in db_history:
        if msg['role'] == 'user':
            chat_history.append(HumanMessage(content=msg['content']))
        else:
            chat_history.append(AIMessage(content=msg['content']))

    # --- REPHRASE / SEARCH QUERY ---
    search_query = None
    if not is_conversational:
        if len(chat_history) > 1:  
            rephrase_prompt = ChatPromptTemplate.from_messages([
                MessagesPlaceholder(variable_name="chat_history"),
                ("user", "{input}"),
                (
           "Task: Generate concise database search query from input. "
"STRICT RULES: "
"1. DO NOT answer the question or define terms. "
"2. Extract keywords only. "
"3. Output ONLY the raw query string."
        ),
            ])

            print("DEBUG: Rephrasing for search query...")
            
            rephrase_chain = rephrase_prompt | chat_model
            
            search_query = rephrase_chain.invoke({
                "chat_history": chat_history[:-1], # Exclude the just-inserted message to avoid duplication in prompt
                "input": effective_message
            }).content
        else:
            search_query = effective_message

    print(f"DEBUG: Original='{request.message}' -> Search='{search_query}'")

    # ---  RETRIEVE & ANSWER ---
    context_text = ""
    
    if search_query:
        print(f"DEBUG: Searching PDF for: '{search_query}'")
        
        # Retrieve chunks
        raw_chunks = retrieve(search_query, request.filename, user_id)
        
        #  Only take the top 3 most relevant chunks
        top_chunks = raw_chunks[:3] 
        
        # 2. JOIN CHUNKS
        context_text = "\n\n".join(top_chunks)
         
        if len(context_text) > 3000:
            context_text = context_text[:3000] + "... [Content Truncated for brevity]"
    else:
        print("DEBUG: Skipping Search (Conversational Input)")


    if request.is_feynman:
        # FEYNMAN MODE: The user teaches, AI grades.
        system_instruction = (
             """
Role: Academic Critic (Feynman Technique). Task: Test user's understanding. Rules:

If input is greeting/topic: Ask user to explain concept simply.

If explanation:  Report:   Misconceptions, Missing Details, Brief Feedback. Tone: Rigorous but fair."""
        )

    elif request.is_socratic:
        #  AI guides, doesn't tell (unless asked).
        system_instruction = (
            "Role: Friendly Socratic Tutor. Goal: Help the user discover the answer themselves.\n"
            "Rules:\n"
            "1. NO DIRECT ANSWERS. Guide them to the solution.\n"
            "2. CONVERSATIONAL BRIDGE: Never start a response with a question. Always acknowledge the user's input or set the context first \n"
            "3. ASK ONE SIMPLE THING: After the bridge, ask ONE simple, observation-based question to nudge them forward. Avoid complex 'exam-style' questions.\n"
            "4. BRIEF & CLEAR: Keep it under 3 sentences.\n"
            "5. EXIT STRATEGY: If the user is stuck, frustrated, or explicitly asks for the answer, provide the full explanation immediately."
        )
    else:
        if not context_text: 
            system_instruction = "You are a helpful AI Tutor. Respond politely to the user and in Short"

        else:
            system_instruction = (
                    "You are an AI tutor. Answer ONLY from the context. "
                    "Explain simply, like a teacher, in short answers. "
                    "Maintain a friendly tone. not like a robot, user should feel the conversation interesting"
                    "If context lacks the answer, say you don't know."
            )
  

      

    answer_prompt = ChatPromptTemplate.from_messages([
        ("system", system_instruction  + "\n\nContext:\n{context}"),
        MessagesPlaceholder(variable_name="chat_history"),
        ("user", "{input}")
    ])
    
    chain = answer_prompt | chat_model
    
    response = chain.invoke({
        "context": context_text,
        "chat_history": chat_history[:-1],  
        "input": effective_message
    })

  
 
    try:
        supabase.table("chat_history").insert({
            "user_id": user_id,
            "filename": request.filename,
            "role": "assistant",
            "content": response.content
        }).execute()
    except Exception as e:
        print(f"Error saving AI message: {e}")

    print(f"AI Response: {response.content[:60]}...") 

    return {
    "response": response.content, 
}

 
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
    


# --- WebSocket Endpoint ---
@app.websocket("/ws/progress/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: str):
    await manager.connect(websocket, user_id)
    try:
        while True:
            # Keep the connection open to listen for client disconnects
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(user_id)
    except Exception as e:
        print(f"WebSocket error: {e}")
        manager.disconnect(user_id)


 
@app.post("/upload")
async def upload_pdf(file: UploadFile = File(...), user_id: str = Header(...)):
    try:
        #  Create a Unique Filename
        # Replace spaces to avoid URL encoding issues
        await check_and_increment( user_id, "upload", amount=1)
        clean_name = file.filename.replace(" ", "_")
        unique_filename = f"{user_id}_{clean_name}"
        
        #  Update Path to use Unique Name  
        path = f"{UPLOAD_DIR}/{unique_filename}"
        
        with open(path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        #  Check if THIS unique file already exists
        # We now check against 'unique_filename' instead of raw 'file.filename'
        existing = supabase.table("documents").select("filename")\
            .eq("filename", unique_filename)\
            .execute()
            
        if not existing.data: 
            documents = load_pdf(path)
            chunks = chunk_text(documents)


            async def progress_reporter(current, total, status):
                await manager.send_progress(user_id, current, total, status)
            
            # Pass the UNIQUE filename to Pinecone
            await store_in_pinecone(chunks, unique_filename, user_id,progress_callback=progress_reporter)
            
            # Save the UNIQUE filename to Supabase
            supabase.table("documents").insert({
                "filename": unique_filename, 
                "user_id": user_id
            }).execute()
            
            message = "Uploaded and processed successfully"
        else:
            message = "File already exists, skipping processing."
        
        # Clean up temp file
        if os.path.exists(path):
            os.remove(path)

        return {"message": message, "filename": unique_filename}

    except Exception as e:
        print(f"Error: {e}")
        # Clean up if error occurs
        if 'path' in locals() and os.path.exists(path):
             os.remove(path)
        raise HTTPException(status_code=500, detail=str(e))   
    


@app.get("/results")
def get_user_results(user_id: str = Header(None)):
    if not user_id:
        return {"results": []}

    max_retries = 3
    response = None

    for attempt in range(max_retries):
        try:
            # 1. Try to execute the query
            response = supabase.table("quiz_results")\
                .select("*")\
                .eq("user_id", user_id)\
                .order("created_at", desc=True)\
                .execute()
            break 

        except Exception as e:
            print(f"results Attempt {attempt + 1} failed: {e}")
             
            if attempt == max_retries - 1:
                print(f"🔥 CRITICAL FAILURE in /results: {e}") 
                raise HTTPException(status_code=500, detail="Server disconnected")
            
             
            time.sleep(0.5) 

    return {"results": response.data}


class MistakeSchema(BaseModel):
    question: str
    wrong_answer: str
    correct_answer: str
    explanation: str


class QuizResultSchema(BaseModel):
    filename: str
    topic: str
    score: int
    total_questions: int
    difficulty: Literal["Easy", "Medium", "Hard"] = "Medium"
    mistakes: List[MistakeSchema] = []

# Save Endpoint
@app.post("/save-result")
async def save_quiz_result(result: QuizResultSchema, user_id: str = Header(...)):
    try:
        quiz_insert_response = supabase.table("quiz_results").insert({
            "user_id": user_id,
            "filename": result.filename,
            "topic": result.topic,
            "score": result.score,
            "total_questions": result.total_questions,
            "difficulty": result.difficulty
        }).execute()
        
        new_quiz_id = quiz_insert_response.data[0]['id']

        
        if result.mistakes:
            # Prepare the list of dictionaries for bulk insert
            mistakes_data = [
                {
                    "user_id": user_id,
                    "quiz_result_id": new_quiz_id,
                    "topic": result.topic,
                    "question": m.question,
                    "wrong_answer": m.wrong_answer,
                    "correct_answer": m.correct_answer,
                    "explanation": m.explanation,
                    
                }
                for m in result.mistakes
            ]
            
            # Bulk Insert (Efficient)
            supabase.table("mistakes").insert(mistakes_data).execute()
        
        return {"message": "Result and mistakes saved successfully"}
    
    except Exception as e:
        print(f"Error saving result: {e}") 
        raise HTTPException(status_code=500, detail="Failed to save result")
    

class ChatMessage(BaseModel):
    role: str
    content: str
 
class CoachRequest(BaseModel):
    userId: str
    message: str
    mode: str = "coach"
    history: List[ChatMessage] = []  


class AssistantReply(BaseModel):
    reply: str = Field(description="The spoken response from the coach to the user.")


@app.post("/coach")
async def voice_coach(req: CoachRequest):
    await check_and_increment(req.userId, "coach_chat", amount=1)
    try:
        try:
            results_response = supabase.table("quiz_results")\
                .select("*")\
                .eq("user_id", req.userId)\
                .order("created_at", desc=True)\
                .limit(5)\
                .execute()
            
            recent_scores = results_response.data
            
            # print(f"📊 User's Quiz History: {recent_scores}") 

        except Exception as db_err:
            print(f"❌ DB Error: {db_err}")
            recent_scores = []
        
        #  Format Context
        if recent_scores:
            stats_context = "Here are the user's last 5 quiz scores:\n"
            for r in recent_scores:
                # Using .get() is safe if columns are missing
                stats_context += f"- Topic: {r.get('topic')}, Score: {r.get('score')}/{r.get('total_questions')}\n"
        else:
            stats_context = "The user has not taken any quizzes yet."

        print("stats_context: ",stats_context)
 
        system_prompt = f"""
            Role: Performance Coach & Mentor (NOT a teacher).
            Goal: Discuss study habits, motivation, and weak areas based on the stats below. Always greet back and ask about study progress.

            Rules:
            1. **NO TEACHING:** If asked to explain/summarize, REFUSE. Say exactly: "For detailed explanations, please ask the AI Tutor. I'm here to help you track your progress."
            2. **Conciseness:** Voice assistant mode. Max 1-2 sentences.
            3. **Tone:** Warm, analytical, encouraging.
            4. **Improvement:** If asked how to improve specific topics, direct them to AI Tutor.
            5. **Data:** Actively reference these stats:
            {stats_context}
            """
 
        
        messages_to_send = [{"role": "system", "content": system_prompt}]
        
        # Add History
        for msg in req.history:
            messages_to_send.append({"role": msg.role, "content": msg.content})
            
        # Add Current User Message
        messages_to_send.append({"role": "user", "content": req.message})

        # Call LLM
        coach_response = client.chat.completions.create(
            messages=messages_to_send,
            model="llama-3.1-8b-instant",
            temperature=0.6,
            max_tokens=150,
            response_model=AssistantReply,
        )
        #  Extract the clean text
        reply_text = coach_response.reply

        print(f"Coach Reply: {reply_text}")

        return {"replyText": reply_text}

    except Exception as e:
        print(f"Coach Error: {e}")
        # Return a generic error message so the frontend doesn't crash
        raise HTTPException(status_code=500, detail=f"Coach processing failed: {str(e)}")
    

class PodcastRequest(BaseModel):
    user_id: str

@app.post("/daily-podcast")
def get_daily_podcast(request: PodcastRequest):
    user_id = request.user_id
    print(f"\n--- Processing podcast request for: {user_id} ---")
 
    print("Checking for existing daily recap...")
    existing_url = db.get_podcast_url_if_exists(user_id)
    
    if existing_url:
        print(f"CACHE HIT: Found existing audio for today.")
        print(f"URL: {existing_url[:50]}...")  
        return {"url": existing_url, "status": "cached"}

    
    print(" CACHE MISS: No fresh audio found. Starting generation sequence.")
    
   
    mistakes = db.fetch_yesterday_mistakes(user_id)
    
    if not mistakes:
        print(" ABORT: No mistakes found for yesterday. Nothing to record.")
        return {"url": None, "status": "no_data", "message": "No mistakes found for yesterday."}

    try: 
        print("  Generating script with Groq...")
        # 1. Assign to a temporary variable first
        raw_script = llm.generate_podcast_script(mistakes)
        
        print("  Sanitizing script for Azure TTS...")
        script = clean_text_for_xml(raw_script)
        
        print(f"   -> Script Preview: {script[:200]}...")
          
        print("Synthesizing audio with Azure...")
        audio_bytes = tts.synthesize_audio(script)
        print(f"   -> Audio synthesized ({len(audio_bytes)} bytes).")
        
      
        print(" Uploading to Supabase Storage...")
        public_url = db.upload_podcast_audio(user_id, audio_bytes)
        print(f"   -> Upload complete.")
        
        print(" SUCCESS: Podcast generated and served.")
        return {"url": public_url, "status": "generated"}

    except Exception as e:
        print(f" CRITICAL ERROR: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    
app.include_router(usage.router, prefix="/api", tags=["Usage"]) 
app.include_router(chat_router)
app.include_router(quiz_router)
app.include_router(file_router)
app.include_router(calendar.router)
