class UsageLimits:
    MAX_FILES = 3                 
    
    DAILY_QUIZ_QUESTIONS = 20     
    DAILY_TUTOR_QUESTIONS = 15   
    DAILY_COACH_MSGS = 10         
    DAILY_PODCASTS = 1

import os
from supabase import create_client, Client

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise Exception("Supabase environment variables missing")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

try:
    current_url_str = str(supabase.storage_url)

    if current_url_str and not current_url_str.endswith("/"):
        supabase.storage_url = f"{current_url_str}/"
        print(f"DEBUG: Patched internal Storage URL to: '{supabase.storage_url}'")

except Exception as e:
    print(f"DEBUG: Auto-patch failed ({e}). Proceeding hoping for the best.")