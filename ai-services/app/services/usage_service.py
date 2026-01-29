import os
from datetime import datetime
import pytz
from fastapi import HTTPException
from supabase import create_client, Client
from app.config import UsageLimits

# --- Initialize Supabase Client ---
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError(" SUPABASE_URL or SUPABASE_KEY is missing from environment variables.")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)


# --- Helper: Get Today's Date in IST ---
def get_today_ist():
    ist_tz = pytz.timezone('Asia/Kolkata')
    return datetime.now(ist_tz).date().isoformat()


# --- Function 1: The Gatekeeper (Used by Chat, Quiz, Upload) ---
async def check_and_increment(user_id: str, feature: str, amount: int = 1):
    """
    Checks if a user has enough credits for a feature.
    - Automatically resets counters if it's a new day (IST).
    - Increments usage if allowed.
    - Raises 429 HTTPException if limit reached.
    """
    today_ist = get_today_ist()
    
    # 1. Fetch User Data
    response = supabase.table("user_usage").select("*").eq("user_id", user_id).execute()
    
    if response.data:
        data = response.data[0]
    else:
        # Create default object for new user (Don't save yet, wait for upsert)
        data = {
            "user_id": user_id, 
            "last_reset_date": today_ist, 
            "daily_quiz_questions": 0, 
            "daily_tutor_questions": 0, 
            "daily_coach_msgs": 0,
            "total_files_uploaded": 0
        }

    # 2. Check for Daily Reset (IST)
    # If the stored date is different from today, reset counters
    if str(data.get("last_reset_date")) != today_ist:
        print(f"New day detected for {user_id}. Resetting limits...")
        data["last_reset_date"] = today_ist
        data["daily_quiz_questions"] = 0
        data["daily_tutor_questions"] = 0
        data["daily_coach_msgs"] = 0
        # Note: We do NOT reset 'total_files_uploaded' as it is a storage limit, not daily.

    # 3. Determine Limits based on Feature
    current_val = 0
    limit_val = 0
    col_name = ""

    # Map feature names to DB columns and Limits
    if feature == "quiz_questions":
        col_name = "daily_quiz_questions"
        limit_val = UsageLimits.DAILY_QUIZ_QUESTIONS
    elif feature == "tutor_chat":
        col_name = "daily_tutor_questions"
        limit_val = UsageLimits.DAILY_TUTOR_QUESTIONS
    elif feature == "coach_chat":
        col_name = "daily_coach_msgs"
        limit_val = UsageLimits.DAILY_COACH_MSGS
    elif feature == "upload":
        col_name = "total_files_uploaded"
        limit_val = UsageLimits.MAX_FILES
    else:
        raise ValueError(f"Unknown feature: {feature}")

    current_val = data.get(col_name, 0)

    # 4. Check if Request Exceeds Limit
    if (current_val + amount) > limit_val:
        raise HTTPException(
            status_code=429, 
            detail=f"Daily limit reached for {feature}. Used: {current_val}/{limit_val}. Requested: {amount}."
        )

    # 5. Increment & Save
    data[col_name] = current_val + amount
    
    # Upsert handles both "Insert (New User)" and "Update (Existing)"
    supabase.table("user_usage").upsert(data).execute()
    
    return True


# --- The Dashboard Reporter ---
async def get_usage_stats(user_id: str):
    """
    Fetches usage stats for the UI.
    - Also performs a 'Lazy Reset' if the user visits the dashboard on a new day.
    """
    today_ist = get_today_ist()
 
    response = supabase.table("user_usage").select("*").eq("user_id", user_id).execute()

    # Handle New/Missing User
    if not response.data: 
        return {
            "total_files_uploaded": 0,
            "daily_quiz_questions": 0,
            "daily_tutor_questions": 0,
            "daily_coach_msgs": 0
        }

    data = response.data[0]

    # 3. Check for Reset (IST) for Display purposes
    if str(data.get("last_reset_date")) != today_ist:
        print(f" Dashboard loaded on new day. Resetting DB for {user_id}...")
        
        # Reset Logic
        updates = {
            "user_id": user_id, # Required for Upsert
            "last_reset_date": today_ist,
            "daily_quiz_questions": 0,
            "daily_tutor_questions": 0,
            "daily_coach_msgs": 0,
            # Preserve non-daily fields
            "total_files_uploaded": data.get("total_files_uploaded", 0) 
        }
        
        # Save to DB so next fetch is clean
        supabase.table("user_usage").upsert(updates).execute()
        
        # Return the clean data to UI immediately
        return updates

    return data