
from datetime import datetime
import pytz
from fastapi import HTTPException
from app.config import UsageLimits

async def check_and_increment(supabase, user_id: str, feature: str, amount: int = 1):
    
    ist_tz = pytz.timezone('Asia/Kolkata')
    today_ist = datetime.now(ist_tz).date().isoformat()
    
    
    response = supabase.table("user_usage").select("*").eq("user_id", user_id).execute()
    
    # If user exists, use their data. If not, use defaults.
    if response.data:
        data = response.data[0]
    else:
        # Create default object for new user
        data = {
            "user_id": user_id, 
            "last_reset_date": today_ist, 
            "daily_quiz_questions": 0, 
            "daily_tutor_questions": 0, 
            "daily_coach_msgs": 0,
            "total_files_uploaded": 0
        }

    if str(data.get("last_reset_date")) != today_ist:
        data["last_reset_date"] = today_ist
        data["daily_quiz_questions"] = 0
        data["daily_tutor_questions"] = 0
        data["daily_coach_msgs"] = 0

    #  Check Limits
    limit_reached = False
    current_val = 0
    limit_val = 0
    
    # Map feature names to DB columns and Limits
    if feature == "quiz_questions":
        current_val = data.get("daily_quiz_questions", 0)
        limit_val = UsageLimits.DAILY_QUIZ_QUESTIONS
    elif feature == "tutor_chat":
        current_val = data.get("daily_tutor_questions", 0)
        limit_val = UsageLimits.DAILY_TUTOR_QUESTIONS
    elif feature == "coach_chat":
        current_val = data.get("daily_coach_msgs", 0)
        limit_val = UsageLimits.DAILY_COACH_MSGS
    elif feature == "upload":
        current_val = data.get("total_files_uploaded", 0)
        limit_val = UsageLimits.MAX_FILES

    # Check if request exceeds limit
    if (current_val + amount) > limit_val:
        raise HTTPException(
            status_code=429, 
            detail=f"Daily limit reached for {feature}. Used: {current_val}/{limit_val}. Requested: {amount}."
        )
 
    column_map = {
        "quiz_questions": "daily_quiz_questions",
        "tutor_chat": "daily_tutor_questions",
        "coach_chat": "daily_coach_msgs",
        "upload": "total_files_uploaded"
    }
    
    col_name = column_map[feature]
    new_count = current_val + amount
    
    data[col_name] = new_count
     
    supabase.table("user_usage").upsert(data).execute()
    
    return True