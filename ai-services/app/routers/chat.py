from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List
import os

from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from dotenv import load_dotenv

load_dotenv()

router = APIRouter()

# --------- Pydantic Models ---------

class Message(BaseModel):
    role: str   # "user" | "assistant"
    content: str

class SummaryRequest(BaseModel):
    messages: List[Message]

class SummaryResponse(BaseModel):
    summary: str


# --------- GROQ MODEL ---------

chat_model = ChatGroq(
    temperature=0.4,
    model_name="llama-3.3-70b-versatile",
    groq_api_key=os.environ.get("GROQ_API_KEY"),
)

# --------- SUMMARY ENDPOINT ---------

@router.post("/generate-summary", response_model=SummaryResponse)
async def generate_summary(req: SummaryRequest):
    if not req.messages or len(req.messages) < 4:
        raise HTTPException(
            status_code=400,
            detail="Not enough messages to generate summary"
        )

    # Convert conversation into readable text
    conversation = ""
    for msg in req.messages:
        prefix = "Student" if msg.role == "user" else "Tutor"
        conversation += f"{prefix}: {msg.content}\n"

    # Prompt for Groq / LLaMA
    prompt = f"""
You are an expert AI tutor.

Below is a learning conversation between a student and an AI tutor.

Your tasks:
- Identify the main topics discussed
- Identify where the student struggled or was confused
- Summarize the final understanding
- Produce concise bullet-point notes suitable for revision

Conversation:
{conversation}

Return ONLY bullet points.
"""

    try:
        response = chat_model.invoke([
            SystemMessage(
                content="You summarize learning conversations into clear revision notes."
            ),
            HumanMessage(content=prompt),
        ])

        summary_text = response.content.strip()

        return {"summary": summary_text}

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Summary generation failed: {str(e)}"
        )
