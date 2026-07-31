from fastapi import APIRouter, HTTPException,Header
from pydantic import BaseModel, Field 
import os
import asyncio
import string
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage, BaseMessage
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.output_parsers import PydanticOutputParser
from typing import List, Optional,Literal,Dict,TypedDict,Any
from dotenv import load_dotenv
load_dotenv()
import logging
from langgraph.graph import StateGraph, START, END


from app.rag import load_pdf, chunk_text, store_in_pinecone, retrieve
from app.services.vision_service import analyze_chat_image 
from app.services.usage_service import check_and_increment
from app.graph.state import TutorState
from app.graph.graph import tutor_agent
from app.config import supabase

logging.basicConfig(
    level=logging.INFO,
    format=" %(message)s"
)
logger = logging.getLogger(__name__)
router = APIRouter()



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
    model_name="llama-3.3-70b-versatile",
    temperature=0.7,
    max_tokens=500,            
    max_retries=1,
    groq_api_key=os.environ.get("GROQ_API_KEY"),
)

parser = PydanticOutputParser(pydantic_object=SessionSummaryData) 

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




guard_model = ChatGroq(
    temperature=0.0,
    model_name="openai/gpt-oss-20b",
    groq_api_key=os.environ.get("GROQ_API_KEY")
)

class ChatRequest(BaseModel):
    message: str
    filename: str
    image: Optional[str] = None
    is_socratic: bool = False
    is_feynman: bool = False

 

# -----------------------------------------------------------------------------
# 2. GRAPH NODES IMPLEMENTATION
# -----------------------------------------------------------------------------
# Initialize the current Groq safety model
 


# --------------------------------------------------------
@router.post("/chat")
async def chat_with_book(request: ChatRequest, user_id: str = Header(None)):
    if not user_id:
        raise HTTPException(status_code=400, detail="User ID authorization parameters required")
    
    # 1. Fixed the length to 200
    # 2. Changed to FastAPI's HTTPException
    if len(request.message) > 100:
        raise HTTPException(
            status_code=400, 
            detail="Message is too long. Please keep it under 100 characters."
        )
    
    await check_and_increment(user_id, "tutor_chat", amount=1) 
    
    logger.info(f"Invoking Tutor Graph for User: {user_id} | Resource: {request.filename}")
    
    initial_state: TutorState = {
        "user_id": user_id,
        "raw_message": request.message,
        "filename": request.filename,
        "image_url": request.image,
        "is_socratic": request.is_socratic,
        "is_feynman": request.is_feynman,
        "is_safe": True,             
        "intent": "education",        
        "effective_message": "",     
        "chat_history": [],          
        "search_query": None,        
        "context_text": "",          
        "response_content": ""       
    }
    
    print(f"INITIAL STATE", initial_state)
    
    try:
        final_state = tutor_agent.invoke(initial_state)
        return {"response": final_state["response_content"]}
    except Exception as e:
        logger.error(f"Fatal execution breakdown inside LangGraph processing: {e}")
        raise HTTPException(status_code=500, detail="Internal processing sequence breakdown")