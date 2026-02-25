# app/routers/coach.py

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel,Field,validator
from typing import List, Optional,Literal
import os
import instructor
from groq import Groq
from dotenv import load_dotenv


from app.services.clean_tts import clean_text_for_xml
from app.services import azure_voice as tts
from app.services import groq_podcast as llm
from app.supabase import supabase as db
from app.services.usage_service import check_and_increment
from app.config import supabase

load_dotenv()
router = APIRouter(prefix="/voice", tags=["Coach"])


class PodcastRequest(BaseModel):
    user_id: str

@router.post("/daily-podcast")
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



client = instructor.from_groq(Groq(api_key=os.environ.get("GROQ_API_KEY")))
@router.post("/coach")
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
            
            # print(f"User's Quiz History: {recent_scores}") 

        except Exception as db_err:
            print(f" DB Error: {db_err}")
            recent_scores = []
        
        #  Format Context
        if recent_scores:
            stats_context = "Here are the user's last 5 quiz scores:\n"
            for r in recent_scores: 
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
  
