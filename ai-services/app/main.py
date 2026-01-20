import os
import json
import instructor
from fastapi import HTTPException

import shutil
from fastapi import FastAPI, UploadFile, File, HTTPException, Header,WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel,Field
from dotenv import load_dotenv
from groq import Groq
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from typing import List, Optional
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
        You are a **Performance Coach and Mentor**. You are NOT a teacher or tutor. You help students to focus on their studies guides them like a coach but you can't teach any chapter or topic for that purpose AI Tutor is there.
        
        **Your Goal:** Discuss the user's study habits, motivation, and recent quiz performance. 
        Help them identify weak areas based on the stats provided.
        **Whenever user greets, greet in response, ask them how they are doing with their studies etc**

        **CRITICAL RULES:**
        1. **NO TEACHING:** If the user asks you to explain a concept, teach a topic, or summarize a document, you MUST politely refuse. 
           - Say exactly: "For detailed explanations, please ask the AI Tutor. I'm here to help you track your progress."
        2. **Be Concise:** You are a voice assistant. Keep answers short (1-2 sentences max).
        3. **Tone:** Encouraging, professional, analytical, but warm.
        4. **Use Data:** Refer to their recent scores if relevant.
        5. **If user asks how can I improve my performance(in any topic, book) tell user to ask AI Tutor for easy and detailed explanation of any topic.

        **User's Recent Stats:**
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