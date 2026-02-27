from fastapi import APIRouter, HTTPException,Header
from pydantic import BaseModel, Field
from typing import List
import os
import asyncio
import string
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.output_parsers import PydanticOutputParser
from typing import List, Optional,Literal
from dotenv import load_dotenv
load_dotenv()
import logging

logging.basicConfig(
    level=logging.INFO,
    format=" %(message)s"
)

logger = logging.getLogger(__name__)



from app.rag import load_pdf, chunk_text, store_in_pinecone, retrieve
from app.services.vision_service import analyze_chat_image 
from app.services.usage_service import check_and_increment


router = APIRouter()
from app.config import supabase


class Message(BaseModel):
    role: str   
    content: str

class SummaryRequest(BaseModel):
    messages: List[Message]

# We define the structure we WANT from the AI
class SessionSummaryData(BaseModel):
    title: str = Field(description="A short, catchy title (max 6 words) summarizing the main topic of the session.")
    key_points: List[str] = Field(description="5-7 concise bullet points summarizing what was learned.")
    struggle_area: str = Field(description="A one-sentence note on what the user found difficult, if any. Otherwise leave empty.")

class SummaryResponse(BaseModel):
    data: SessionSummaryData

chat_model = ChatGroq(
    temperature=0.3, 
    model_name="llama-3.3-70b-versatile",
    groq_api_key=os.environ.get("GROQ_API_KEY"),
)

parser = PydanticOutputParser(pydantic_object=SessionSummaryData)

# --------- SUMMARY ENDPOINT ---------

@router.post("/generate-summary", response_model=SummaryResponse)
async def generate_summary(req: SummaryRequest):
    if not req.messages or len(req.messages) < 4:
        raise HTTPException(
            status_code=400,
            detail="Not enough messages to generate summary"
        )
 
    conversation_text = ""
    for msg in req.messages:
        role_label = "Student" if msg.role == "user" else "AI Tutor"
        conversation_text += f"{role_label}: {msg.content}\n"
 
    prompt = ChatPromptTemplate.from_messages([
        ("system", "You are an expert AI tutor. Your goal is to summarize learning sessions into structured data."),
        ("human", """
        Analyze the following conversation and extract the summary data.
        
        Conversation:
        {conversation}
        
        {format_instructions}
        """)
    ])

    chain = prompt | chat_model | parser

    try: 
        structured_summary = chain.invoke({
            "conversation": conversation_text,
            "format_instructions": parser.get_format_instructions()
        })

        return {"data": structured_summary}

    except Exception as e: 
        logger.error(f"Error generating summary: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to generate structured summary."
        )
    

class SaveSummaryRequest(BaseModel):
    filename: str
    title: str
    key_points: List[str]
    struggle_area: str


@router.post("/save-summary")
async def save_summary(req: SaveSummaryRequest, user_id: str = Header(None,alias="user-id")):
    try:  
        logger.info(f"Saving summary for User: {user_id}, File: {req.filename}")
        data = {
            "user_id": user_id,
            "file_name": req.filename,
            "title": req.title,
            "key_points": req.key_points, 
            "struggle_area": req.struggle_area
        }
        
        result = supabase.table("notes").insert(data).execute()
        return {"status": "success", "message": "Summary saved to notes"}
        
    except Exception as e: 
        logger.error(f"Error saving summary to database: {e}")
        raise HTTPException(status_code=500, detail="Failed to save summary to database")


@router.get("/get-notes")
async def get_notes(user_id: str = Header(None, alias="user-id")):
    try: 
        result = supabase.table("notes")\
            .select("*")\
            .eq("user_id", user_id)\
            .order("created_at", desc=True)\
            .execute()
            
        return {"notes": result.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get('/chat_history')
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
        logger.error(f"Error fetching chat history: {e}")
        return {"history": []}


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


 
    
@router.post("/chat")
async def chat_with_book(request: ChatRequest, user_id: str = Header(None)):
    if not user_id:
        raise HTTPException(status_code=400, detail="User ID required")
    
    await check_and_increment( user_id, "tutor_chat", amount=1) 
    logger.info(f"Received chat message from User: {user_id}, File: {request.filename}, Socratic: {request.is_socratic}, Feynman: {request.is_feynman}")
    
    # Start with the plain text message
    effective_message = request.message

    # --- VISION PROCESSING ---
    if request.image:
        logger.info("Processing chat image with Azure...")
        try:
            # Get description from Azure Vision
            image_description = analyze_chat_image(request.image)
            
            # Combine User Text + Image Context
            effective_message = (
                f"{request.message}\n\n"
                f"[CONTEXT FROM UPLOADED IMAGE: {image_description}]"
            )
            logger.info(f"Image description extracted: {image_description[:50]}...") 
        except Exception as e:
            logger.error(f"Error processing image: {e}") 
            pass
 
    try:
        supabase.table("chat_history").insert({
            "user_id": user_id,
            "filename": request.filename,
            "role": "user",
            "content": effective_message 
        }).execute()
    except Exception as e:
        logger.error(f"Error saving user message: {e}") 


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
        logger.error(f"Error fetching history context: {e}")
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
 
            logger.info(f"Chat history for rephrasing")
            
            rephrase_chain = rephrase_prompt | chat_model
            
            search_query = rephrase_chain.invoke({
                "chat_history": chat_history[:-1], # Exclude the just-inserted message to avoid duplication in prompt
                "input": effective_message
            }).content
        else:
            search_query = effective_message
 
    logger.info(f"Original message: '{request.message}' -> Generated search query: '{search_query}' | Conversational: {is_conversational}")

    # ---  RETRIEVE & ANSWER ---
    context_text = ""
    
    if search_query: 
        logger.info(f"Performing RAG retrieval with query: {search_query}")
        retrieved_chunks = retrieve(search_query, request.filename, user_id)

        if not retrieved_chunks:
            context_text = ""
        else:
            context_text = "\n\n".join(
    f"(Page {chunk['page']}) {chunk['text']}"
    if chunk.get("page") else chunk["text"]
    for chunk in retrieved_chunks
)
            
            
        
        if len(context_text) > 3000:
            context_text = context_text[:3000] + "... [Content Truncated for brevity]"
    else: 
        logger.info("Skipping RAG retrieval due to conversational input")


    if request.is_feynman: 
        system_instruction = (
             """
Role: Academic Critic (Feynman Technique). Task: Test user's understanding. Rules:

If input is greeting/topic: Ask user to explain concept simply.

If explanation:  Report:   Misconceptions, Missing Details, Brief Feedback. Tone: Rigorous but fair."""
        )

    elif request.is_socratic: 
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
            system_instruction = ("""

                    "You are an AI tutor. Answer ONLY from the context. "
                    "Use the provided context to answer the question."
                    "Explain simply, like a teacher, in short answers. "
                    "Maintain a friendly tone. not like a robot, user should feel the conversation interesting"
                    "If context lacks the answer, say you don't know."
                    "IMPORTANT:
- If page numeber is mentioned then mention the page number in the format:
  (Source: Page X)
- If multiple pages are used, mention all relevant pages.
- Do NOT hallucinate page numbers"
                                  """
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
        logger.error(f"Error saving AI message: {e}")
 
    logger.info(f"AI Response: {response.content[:60]}...")

    return {
    "response": response.content, 
}

    