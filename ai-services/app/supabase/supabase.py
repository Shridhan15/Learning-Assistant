import os
from datetime import datetime, timedelta
from supabase import create_client, Client
from dotenv import load_dotenv
import pytz
load_dotenv()
 
url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_KEY")
supabase: Client = create_client(url, key)

BUCKET_NAME = "daily_podcasts"
IST_TZ = pytz.timezone('Asia/Kolkata')
def get_ist_dates():
    """
    Returns (yesterday_date, today_date) strictly in IST.
    Used for querying DB ranges and generating filenames.
    """
    now_ist = datetime.now(IST_TZ)
    today = now_ist.date()
    yesterday = today - timedelta(days=1)
    return yesterday, today
 

def get_podcast_url_if_exists(user_id: str) -> str | None:
    """
    Checks if a podcast file exists for TODAY (in IST).
    Logic: Looks for specific filename 'daily_recap_{user_id}_{TODAY_DATE}.mp3'
    """
    # 1. Get today's date in IST
    _, today = get_ist_dates()
    
    # 2. Construct the exact expected filename
    expected_filename = f"daily_recap_{user_id}_{today}.mp3"
    
    print(f"   [Cache Check] Looking for: {expected_filename}")

    # 3. Search Supabase Storage for this specific file
    try:
        files = supabase.storage.from_(BUCKET_NAME).list(
            path=None, 
            options={"search": expected_filename}
        )
    except Exception as e:
        print(f"   [Cache Check Error] Failed to list files: {e}")
        return None

    # 4. Verify if file exists
    if files and len(files) > 0:
        # Double-check exact name match to be safe
        for file in files:
            if file['name'] == expected_filename:
                print(f"   [Cache HIT] Found existing audio for today.")
                # Return signed URL valid for 1 hour (3600s)
                res = supabase.storage.from_(BUCKET_NAME).create_signed_url(expected_filename, 3600)
                return res["signedURL"]
            
    print("   [Cache MISS] No fresh audio found.")
    return None


def fetch_yesterday_mistakes(user_id: str) -> list:
    # 1. Define IST Timezone
    ist = pytz.timezone('Asia/Kolkata')
    
    # 2. Get "Now" in IST
    now_ist = datetime.now(ist)
    
    # 3. Calculate "Yesterday" date in IST
    today_date_ist = now_ist.date()
    yesterday_date_ist = today_date_ist - timedelta(days=1)
    
    # 4. Create Start and End timestamps with the +05:30 offset
    # Start: Yesterday 00:00:00 IST
    start_time = f"{yesterday_date_ist}T00:00:00+05:30"
    
    # End: Today 00:00:00 IST (The cutoff)
    end_time = f"{today_date_ist}T00:00:00+05:30"
    
    print(f"Fetching mistakes for User: {user_id}")
    print(f"Time Range (IST): {start_time} to {end_time}")

    # 5. Query Supabase
    # Postgres automatically compares the +05:30 input against the +00 stored data correctly.
    try:
        response = supabase.table("mistakes") \
            .select("topic, question, wrong_answer, correct_answer, explanation") \
            .eq("user_id", user_id) \
            .gte("created_at", start_time) \
            .lt("created_at", end_time) \
            .execute()
            
        print(f"Found {len(response.data)} mistakes.")
        return response.data
        
    except Exception as e:
        print(f"Error fetching mistakes: {e}")
        return []



def upload_podcast_audio(user_id: str, audio_data: bytes) -> str:
    _, today = get_ist_dates() # Get IST date
    filename = f"daily_recap_{user_id}_{today}.mp3" # Match the format above!
    
    supabase.storage.from_(BUCKET_NAME).upload(
        path=filename,
        file=audio_data,
        file_options={"content-type": "audio/mpeg", "upsert": "true"}
    ) 
    res = supabase.storage.from_(BUCKET_NAME).create_signed_url(filename, 3600)
    return res["signedURL"]