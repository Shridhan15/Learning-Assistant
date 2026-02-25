from fastapi import APIRouter, HTTPException, Header, File, UploadFile
from pydantic import BaseModel
from app.config import supabase
from pinecone import Pinecone, ServerlessSpec
from dotenv import load_dotenv
import os
import shutil


from app.services.usage_service import check_and_increment
from app.services.websocket_manager import manager
from app.rag import load_pdf, chunk_text, store_in_pinecone, retrieve

import asyncio

load_dotenv()

PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
INDEX_NAME = "learning-assistant"
pc = Pinecone(api_key=PINECONE_API_KEY)


UPLOAD_DIR = "app/data/uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

router = APIRouter()

router = APIRouter(
    prefix="/files",
    tags=["Files"]
)



class DeleteBookRequest(BaseModel):
    filename: str

@router.post("/delete-book")
async def delete_book(
    req: DeleteBookRequest, 
    user_id: str = Header(..., alias="user-id")
):
    print(f" Deleting book: {req.filename} for user: {user_id}")

    try:
        # 1. DELETE FROM PINECONE
        try:
            index = pc.Index(INDEX_NAME)
            index.delete(
                filter={
                    "user_id": user_id,
                    "filename": req.filename
                }
            )
            print(" Pinecone vectors deleted.")
        except Exception as pinecone_error:
            print(f" Pinecone delete failed: {pinecone_error}")

        # 2. DELETE FROM STORAGE
        supabase.storage.from_("pdfs").remove([req.filename])
        
        # 3. CLEAN UP DATABASE TABLES

        quiz_response = supabase.table("quiz_results")\
            .select("id")\
            .match({"user_id": user_id, "filename": req.filename})\
            .execute()
        
        # If quizzes exist, delete their related mistakes first
        if quiz_response.data:
            quiz_ids = [q['id'] for q in quiz_response.data]
            print(f"   found {len(quiz_ids)} quizzes to clean up...")
            
            # Delete mistakes where 'quiz_result_id' matches our list
            supabase.table("mistakes")\
                .delete()\
                .in_("quiz_result_id", quiz_ids)\
                .execute()
            print("   Dependent mistakes deleted.")
        # Documents

        supabase.table("documents").delete().match({"user_id": user_id, "filename": req.filename}).execute()
        
        # Quiz Results
        supabase.table("quiz_results").delete().match({"user_id": user_id, "filename": req.filename}).execute()

        # Chat History 
        supabase.table("chat_history").delete().match({"user_id": user_id, "filename": req.filename}).execute()
        
        # Handle "short" filename if prefix exists
        prefix = f"{user_id}_"
        if req.filename.startswith(prefix):
            short_filename = req.filename[len(prefix):]
            supabase.table("chat_history").delete().match({"user_id": user_id, "filename": short_filename}).execute()

        # --- 4. DECREMENT USAGE COUNTER (CRITICAL) ---
        try:
            row = supabase.table("user_usage").select("total_files_uploaded").eq("user_id", user_id).single().execute()
            if row.data:
                current_count = row.data.get("total_files_uploaded", 0)
                if current_count > 0:
                    supabase.table("user_usage").update({
                        "total_files_uploaded": current_count - 1
                    }).eq("user_id", user_id).execute()
                    print(f" Quota updated: {current_count} -> {current_count - 1}")
        except Exception as usage_err:
            print(f" Usage update error: {usage_err}")

        return {"message": "Book deleted and usage quota restored"}
    
    except Exception as e:
        print(f" Error deleting book: {e}")
        raise HTTPException(status_code=500, detail=str(e)) 





 
@router.post("/upload")
async def upload_pdf(file: UploadFile = File(...), user_id: str = Header(...)):
    try:
        #  Create a Unique Filename
        # Replace spaces to avoid URL encoding issues
        await check_and_increment( user_id, "upload", amount=1)
        clean_name = file.filename.replace(" ", "_")
        unique_filename = f"{user_id}_{clean_name}"
        
        #  Update Path to use Unique Name  
        path = f"{UPLOAD_DIR}/{unique_filename}"
        
        with open(path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        #  Check if THIS unique file already exists
        # We now check against 'unique_filename' instead of raw 'file.filename'
        existing = supabase.table("documents").select("filename")\
            .eq("filename", unique_filename)\
            .execute()
            
        if not existing.data: 
            documents = load_pdf(path)
            chunks = chunk_text(documents)


            async def progress_reporter(current, total, status):
                await manager.send_progress(user_id, current, total, status)
            
            # Pass the UNIQUE filename to Pinecone
            await store_in_pinecone(chunks, unique_filename, user_id,progress_callback=progress_reporter)
            
            # Save the UNIQUE filename to Supabase
            supabase.table("documents").insert({
                "filename": unique_filename, 
                "user_id": user_id
            }).execute()
            
            message = "Uploaded and processed successfully"
        else:
            message = "File already exists, skipping processing."
        
        # Clean up temp file
        if os.path.exists(path):
            os.remove(path)

        return {"message": message, "filename": unique_filename}

    except Exception as e:
        print(f"Error: {e}")
        # Clean up if error occurs
        if 'path' in locals() and os.path.exists(path):
             os.remove(path)
        raise HTTPException(status_code=500, detail=str(e))   
    


@router.get("/fetch-files")
def list_files(user_id: str = Header(None)):  
    """Fetches filenames belonging ONLY to the current user"""
    
    if not user_id:
        return {"files": []}

    try: 
        response = supabase.table("documents")\
            .select("filename")\
            .eq("user_id", user_id)\
            .execute()
        
        file_list = [item['filename'] for item in response.data]
        return {"files": file_list}
        
    except Exception as e:
        print(f"Error fetching files: {e}")
        return {"files": []}
    
  
 