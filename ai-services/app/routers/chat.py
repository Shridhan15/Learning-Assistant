from fastapi import APIRouter, HTTPException,Header
from pydantic import BaseModel, Field
from typing import List
import os

from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import PydanticOutputParser
from dotenv import load_dotenv
from supabase import create_client, Client 
from supabase.client import ClientOptions
load_dotenv()

router = APIRouter()


SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)


# --------- Pydantic Models ---------

class Message(BaseModel):
    role: str   # "user" | "assistant"
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

    # 1. Format Conversation
    conversation_text = ""
    for msg in req.messages:
        role_label = "Student" if msg.role == "user" else "AI Tutor"
        conversation_text += f"{role_label}: {msg.content}\n"

    # 2. Create Prompt Template
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
        # The parser will ensure we get a Python object back, not just a string
        structured_summary = chain.invoke({
            "conversation": conversation_text,
            "format_instructions": parser.get_format_instructions()
        })

        return {"data": structured_summary}

    except Exception as e:
        print(f"Error generating summary: {e}")
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
        # Assuming you have initialized the supabase client in your FastAPI app
        print(f"Saving summary for User: {user_id}, File: {req.filename}")
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
        print(f"Error saving to Supabase: {e}")
        raise HTTPException(status_code=500, detail="Failed to save summary to database")


@router.get("/get-notes")
async def get_notes(user_id: str = Header(None, alias="user-id")):
    try:
        # Fetch notes for the specific user, ordered by most recent
        result = supabase.table("notes")\
            .select("*")\
            .eq("user_id", user_id)\
            .order("created_at", desc=True)\
            .execute()
            
        return {"notes": result.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))