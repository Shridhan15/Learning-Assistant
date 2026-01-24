import os
from datetime import datetime, timedelta
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()
 
url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_KEY")
supabase: Client = create_client(url, key)

BUCKET_NAME = "daily_podcasts"

def get_yesterday_dates():
    """Helper to get UTC dates for query ranges."""
    today = datetime.utcnow().date()
    yesterday = today - timedelta(days=1)
    return yesterday, today

 

def get_podcast_url_if_exists(user_id: str) -> str | None:
    filename = f"daily_recap_{user_id}.mp3"
    
    
    files = supabase.storage.from_(BUCKET_NAME).list(path="", options={"search": filename})
    
    if files and len(files) > 0:
        file_data = files[0]
         
        created_at_str = file_data.get('created_at') or file_data.get('updated_at')
        if created_at_str: 
            file_date = created_at_str.split('T')[0]  
            today_date = str(datetime.utcnow().date())
            
            if file_date != today_date:
                print(f"   [Cache Check] Found file, but it's old ({file_date} vs {today_date}). Ignoring.")
                return None  
        
        
        res = supabase.storage.from_(BUCKET_NAME).create_signed_url(filename, 300)
        return res["signedURL"]
        
    return None

def fetch_yesterday_mistakes(user_id: str) -> list:
    """Queries the 'mistakes' table for yesterday's wrong answers."""
    yesterday, today = get_yesterday_dates()
    
    # Query: created_at >= yesterday AND created_at < today
    response = supabase.table("mistakes") \
        .select("topic, question, wrong_answer, correct_answer, explanation") \
        .eq("user_id", user_id) \
        .gte("created_at", f"{yesterday} 00:00:00") \
        .lt("created_at", f"{today} 00:00:00") \
        .execute()
        
    return response.data

def upload_podcast_audio(user_id: str, audio_data: bytes) -> str:
    filename = f"daily_recap_{user_id}.mp3"
     
    supabase.storage.from_(BUCKET_NAME).upload(
        path=filename,
        file=audio_data,
        file_options={"content-type": "audio/mpeg", "upsert": "true"}
    ) 
    res = supabase.storage.from_(BUCKET_NAME).create_signed_url(filename, 300)
    return res["signedURL"]