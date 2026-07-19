from fastapi import APIRouter, HTTPException, Header, File, UploadFile
from pydantic import BaseModel
from app.config import supabase
from pinecone import Pinecone, ServerlessSpec
from dotenv import load_dotenv
import os
import shutil
import pymupdf

from app.services.usage_service import check_and_increment
from app.services.websocket_manager import manager
from app.rag import load_pdf, chunk_text, store_in_pinecone, retrieve
from app.utils.security import  sanitize_chunks

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


        # --- NOTES CLEANUP ---
        try:
            supabase.table("notes")\
                .delete()\
                .match({
                    "user_id": user_id,
                    "file_name": req.filename
                })\
                .execute()

            print(" Notes deleted.")

            # Handle short filename (same logic as chat_history)
            prefix = f"{user_id}_"
            if req.filename.startswith(prefix):
                short_filename = req.filename[len(prefix):]

                supabase.table("notes")\
                    .delete()\
                    .match({
                        "user_id": user_id,
                        "file_name": short_filename
                    })\
                    .execute()

                print(" Short filename notes deleted.")

        except Exception as notes_err:
            print(f" Notes delete error: {notes_err}")
        
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





 
MAX_PAGES = 30
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB limit

@router.post("/upload")
async def upload_pdf(file: UploadFile = File(...), user_id: str = Header(...)):
    path = None 
    try:
        # 1. Safely read file bytes asynchronously
        content = await file.read()
        size = len(content)
        
        # 2. Size Check
        if size > MAX_FILE_SIZE:
            raise HTTPException(status_code=400, detail="File too large. Maximum 10MB allowed.")

        clean_name = file.filename.replace(" ", "_")
        unique_filename = f"{user_id}_{clean_name}"
        path = f"{UPLOAD_DIR}/{unique_filename}"

        # 3. Save Temporary File from memory content
        with open(path, "wb") as buffer:
            buffer.write(content)

        # 4. Page Count Check via PyMuPDF
        page_count = 0
        try:
            with pymupdf.open(path) as doc:
                page_count = len(doc)
        except Exception as parse_error:
            # Prints the actual file issue to your terminal logs for easier debugging
            print(f"PDF Parsing Exception: {parse_error}")
            raise HTTPException(status_code=400, detail="Invalid PDF file format.")

        if page_count > MAX_PAGES:
            raise HTTPException(
                status_code=400, 
                detail=f"PDF exceeds {MAX_PAGES} page limit. This file has {page_count} pages."
            )
 
        # 5. Database & Pinecone Check
        existing = supabase.table("documents").select("filename").eq("filename", unique_filename).execute()
            
        if not existing.data: 
            # Process quota metrics
            await check_and_increment(user_id, "upload", amount=1)
            
            # Load and segment text
            documents = load_pdf(path)
            chunks = chunk_text(documents)

            # --- SECURITY SCANNING FOR INDIRECT PROMPT INJECTIONS ---
            safe_chunks = sanitize_chunks(chunks)
            
            # Rejects the upload entirely if the file contains only malicious injections
            if not safe_chunks and chunks:
                raise HTTPException(
                    status_code=400, 
                    detail="Upload rejected: Malicious instructions detected in document."
                )
            # --------------------------------------------------------

            # Progress update wrapper
            async def progress_reporter(current, total, status):
                await manager.send_progress(user_id, current, total, status)
            
            # Store only validated, non-injected chunks to vector storage
            await store_in_pinecone(safe_chunks, unique_filename, user_id, progress_callback=progress_reporter)
            
            # Log document relationship metadata
            supabase.table("documents").insert({
                "filename": unique_filename, 
                "user_id": user_id
            }).execute()
            
            message = "Uploaded and processed successfully"
            
        else:
            message = "File already exists, skipping processing."

        return {"message": message, "filename": unique_filename, "pages": page_count}

    except HTTPException as he:
        # Forward operational control errors transparently
        raise he
    except Exception as e:
        print(f"Internal Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        # Guarantee local temporary files are cleaned up to prevent server memory bloat
        if path and os.path.exists(path):
            os.remove(path)


@router.get("/fetch-files")
def list_files(user_id: str = Header(None)):

    if not user_id:
        return {"files": []}

    try:
        response = supabase.table("documents") \
            .select("id, filename, created_at") \
            .eq("user_id", user_id) \
            .execute()

        return {"files": response.data}   

    except Exception as e:
        print(f"Error fetching files: {e}")
        return {"files": []}


  
 