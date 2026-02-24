from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from app.config import supabase
from pinecone import Pinecone, ServerlessSpec
from dotenv import load_dotenv
import os

import asyncio

load_dotenv()


 
PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
INDEX_NAME = "learning-assistant"
pc = Pinecone(api_key=PINECONE_API_KEY)


router = APIRouter()


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

 