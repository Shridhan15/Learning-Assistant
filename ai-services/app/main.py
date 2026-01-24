import os
import json
import instructor
from fastapi import HTTPException
import traceback
import time

import shutil
import string
from fastapi import FastAPI, UploadFile, File, HTTPException, Header,WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel,Field,validator
from dotenv import load_dotenv
from groq import Groq
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from typing import List, Optional 
from datetime import datetime
from pinecone import Pinecone, ServerlessSpec
from supabase import create_client, Client 
from supabase.client import ClientOptions

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

app = FastAPI()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

# 1. Initialize normally (don't worry about the slash here yet)
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

try:
    # Convert to string to check it safely
    current_url_str = str(supabase.storage_url)
    
    if current_url_str and not current_url_str.endswith("/"):
        
        supabase.storage_url = f"{current_url_str}/"
        print(f"DEBUG: Patched internal Storage URL to: '{supabase.storage_url}'")
except Exception as e:
    print(f"DEBUG: Auto-patch failed ({e}). Proceeding hoping for the best.")
 
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
    image: Optional[str] = None
    is_socratic: bool = False
    is_feynman: bool = False


SKIP_RAG_KEYWORDS = {
    "hi", "hello", "hey", "hie", "heya",
    "thanks", "thank you", "tks", "thx", "cool", "ok", "okay", "k", "got it",
    "bye", "byee", "goodbye", "cya", "see ya","see you",'good morning', "good night", "gn"
}

@app.post("/chat")
def chat_with_book(request: ChatRequest, user_id: str = Header(None)):
    if not user_id:
        raise HTTPException(status_code=400, detail="User ID required")
    
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
            "Role: Socratic Tutor. Goal: Guide user to the answer via questioning.\n"
            "Rules:\n"
            "1. Never answer directly. Ask guiding questions based on Context.\n"
            "2. Break down complex concepts.\n"
            "3. If wrong: Provide hint + simpler question.\n"
            "4. EXIT STRATEGY: If user is frustrated, stuck, or asks for answer -> STOP Socratic mode. Provide full, simple explanation immediately."
        )
    else:
        if not context_text:
            # If no context (Greeting), just be a friendly assistant
            system_instruction = "You are a helpful AI Tutor. Respond politely to the user and in Short"

        else:
            system_instruction = (
                    "You are an AI tutor. Answer ONLY from the context. "
                    "Explain simply, like a teacher, in short answers. "
                    "If context lacks the answer, say you don't know."
            )

    answer_prompt = ChatPromptTemplate.from_messages([
        ("system", system_instruction + "\n\nContext:\n{context}"),
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

    return {"response": response.content}

 
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


class QuizRequest(BaseModel):
    topic: str
    filename: str

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
    mistakes: List[MistakeSchema] = []

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
        
        if result.mistakes:
            # Prepare the list of dictionaries for bulk insert
            mistakes_data = [
                {
                    "user_id": user_id,
                    "topic": result.topic,
                    "question": m.question,
                    "wrong_answer": m.wrong_answer,
                    "correct_answer": m.correct_answer,
                    "explanation": m.explanation
                }
                for m in result.mistakes
            ]
            
            # Bulk Insert (Efficient)
            supabase.table("mistakes").insert(mistakes_data).execute()
        
        return {"message": "Result and mistakes saved successfully"}
    
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
    context_summary: str = Field(..., description="A 1-2 sentence summary of the text content.")
    questions: List[Question]

 

def clean_context_text(text: str) -> str:
    # List of keywords that usually mark the end of the story/chapter
    stop_markers = [
        "Exercises", "Think as you read", "Understanding the text", 
        "Vocabulary", "Glossary", "Acknowledgements", "About the Author"
    ]
    
    # Find the earliest occurrence of any marker and cut the text there
    lowest_index = len(text)
    found = False
    
    for marker in stop_markers:
        # Case-insensitive search
        idx = text.lower().find(marker.lower())
        if idx != -1 and idx < lowest_index:
            lowest_index = idx
            found = True
            
    # If found, cut the text. If not, return original.
    if found:
        # Keep a buffer of 50 chars just in case, but usually cut exactly at marker
        return text[:lowest_index].strip()
    
    return text



@app.post("/generate-quiz")
async def generate_quiz(req: QuizRequest, user_id: str = Header(...)):
    print(f"Generating quiz for topic: {req.topic}")
    
    # Retrieve Context
    retrieved_chunks = retrieve(req.topic, req.filename, user_id)
    
    if not retrieved_chunks:
        return {"questions": []}
    
    raw_context = "\n".join(retrieved_chunks)
    clean_context = clean_context_text(raw_context)

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
                    TASK:
                    1. First, summarize the provided text in the 'context_summary' field.
                    2. Then, create exactly 5 multiple choice questions based on that summary.
                    
                    CRITICAL RULES FOR OPTIONS:
                    1. **No Ambiguity:** Ensure there is only ONE indisputably correct answer based on the text.
                    2. **Handle Lists Carefully:** If the text states "A, B, and C cause X", do NOT create a question "What causes X?" with options "A", "B", and "C". This is confusing. Instead, ask "Which of the following is NOT a cause?" or combine them.
                    3. **Clear Distractors:** Incorrect options must be plausible but clearly wrong based on the text. Do not use vague options like "Other" or "Various factors".
                    4. **Self-Contained:** The question must be answerable purely from the provided text chunk.
                    5. **No Repetition:** Do not repeat questions or options.
                    
                    DO NOT FOCUS ON WORDS LIKE
                    "Exercises", "Think as you read", "Understanding the text", 
        "Vocabulary", "Glossary", "Acknowledgements", "About the Author"

                    YOUR TASK IS TO PROVIDE QUIZ NOT ANSWERING THE QUESTION ASKED IN CONTEXT
                    """
                },
                {
                    "role": "user", 
                    "content": f"""
I have provided the text below. Please analyze it and generate the quiz.

----- BEGIN SOURCE TEXT -----
{clean_context}
----- END SOURCE TEXT -----

Topic: {req.topic}

INSTRUCTION: 
1. Do NOT continue the text above. 
2. Do NOT list the vocabulary.
3. Start the 'QuizResponse' tool call immediately.
"""
                }
            ],
            temperature=0.3,  
        )
 
        return quiz_data.model_dump()

    except Exception as e:
        print(f"Error calling Groq: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate quiz")
    
    

 

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
    

class DeleteBookRequest(BaseModel):
    filename: str

@app.post("/delete-book")
async def delete_book(

    req: DeleteBookRequest, 
    user_id: str = Header(..., alias="user-id")
):
    print(f" Deleting book: {req.filename} for user: {user_id}")

    try:
        # --- DELETE FROM PINECONE --- 
        try:
            index = pc.Index(INDEX_NAME)
            index.delete(
                filter={
                    "user_id": user_id,
                    "filename": req.filename
                }
            )
            print("Pinecone vectors deleted.")
        except Exception as pinecone_error:
            # Log but don't stop. If Pinecone is down, we still want to delete the file.
            print(f"Pinecone delete failed: {pinecone_error}")

        # ---  DELETE FROM STORAGE (Supabase Bucket) ---
        supabase.storage.from_("pdfs").remove([req.filename])
        
        #  Delete from documents
        supabase.table("documents").delete().match({
            "user_id": user_id,
            "filename": req.filename
        }).execute()

        # Delete from quiz_results
        supabase.table("quiz_results").delete().match({
            "user_id": user_id,
            "filename": req.filename
        }).execute()

        # C. Delete from 'chat_history' (Attempting both formats)
        supabase.table("chat_history").delete().match({
            "user_id": user_id,
            "filename": req.filename
        }).execute()
        
        # Handle "short" filename variation in chat_history if necessary
        prefix = f"{user_id}_"
        if req.filename.startswith(prefix):
            short_filename = req.filename[len(prefix):]
            supabase.table("chat_history").delete().match({
                "user_id": user_id,
                "filename": short_filename
            }).execute()

        return {"message": "Book, vectors, and data deleted successfully"}
    

    except Exception as e:
        print(f"❌ Error deleting book: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    


class CalendarEventCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=1000)
    start_time: str  # ISO from React
    end_time: str
    category: str = "Revision"
    priority: int = Field(1, ge=1, le=3)

    @validator('start_time', 'end_time')
    def validate_iso(cls, v):
        datetime.fromisoformat(v.replace('Z', '+00:00'))
        return v

# 1. ADD EVENT (Your exact style) 
@app.post("/add-calendar-event")
async def add_event(
    event: CalendarEventCreate,
    authorization: str = Header(None),
    user_id: str = Header(None)
):
    # Standard security check you already have
    if not authorization or not user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")

    try:
        event_data = {
            "user_id": user_id,
            "title": event.title.strip(),
            "description": event.description.strip() if event.description else None,
            "start_time": event.start_time,
            "end_time": event.end_time,
            "category": event.category,  
            "priority": event.priority, 
            "source": "manual"
        }
        # Persist to Supabase
        response = supabase.table("study_events").insert(event_data).execute()
        return {"status": "success", "data": response.data[0] if response.data else None}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# 2. GET EVENTS
@app.get("/get-calendar-events")
async def get_events(
    authorization: str = Header(None),
    user_id: str = Header(None),
    start_date: Optional[str] = None, 
    end_date: Optional[str] = None
):
    if not authorization or not user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")

    try:
        query = supabase.table("study_events").select("*").eq("user_id", user_id).order("start_time")
        
        if start_date:
            query = query.gte("start_time", f"{start_date}T00:00:00Z")
        if end_date:
            query = query.lte("end_time", f"{end_date}T23:59:59Z")

        max_retries = 3
        response = None
        
        for attempt in range(max_retries):
            try:
                response = query.execute()
                break 
            except Exception as e:
                print(f" Attempt {attempt + 1} failed: {e}")
                if attempt == max_retries - 1:
                    raise e 
                time.sleep(0.5) 

        return {"status": "success", "events": response.data, "count": len(response.data)}

    except Exception as e:
        print(f" CRITICAL FAILURE in /get-calendar-events for user {user_id}")
        traceback.print_exc() 
        raise HTTPException(status_code=500, detail=f"Server Error: {str(e)}")
    

 
class PodcastRequest(BaseModel):
    user_id: str

@app.post("/daily-podcast")
async def get_daily_podcast(request: PodcastRequest):
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
        script = llm.generate_podcast_script(mistakes)
        print("   -> Script generated successfully.")
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