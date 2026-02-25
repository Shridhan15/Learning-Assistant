from dotenv import load_dotenv
import os
load_dotenv()
from fastapi import APIRouter, HTTPException, Header, Depends
from pydantic import BaseModel, Field, validator
from typing import Optional
from datetime import datetime
import time
import traceback
from app.config import supabase



router = APIRouter(
    prefix="/calendar",
    tags=["Calendar"]
)

class CalendarEventCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=1000)
    start_time: str  # ISO from React
    end_time: str
    category: str = "Revision"
    priority: int = Field(1, ge=1, le=3)

    @validator('start_time', 'end_time')
    def validate_iso(cls, v):
        try:
            datetime.fromisoformat(v.replace('Z', '+00:00'))
        except ValueError:
            raise ValueError("Invalid ISO format")
        return v

@router.post("/add-event")
async def add_event(
    event: CalendarEventCreate,
    authorization: str = Header(None),
    user_id: str = Header(None)
):
    if not authorization or not user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")

    try:
        event_data = {
            "user_id": user_id,
            "title": event.title.strip(),
            "description": event.description.strip() if event.description else None,
            "start_time": event.start_time,
            "end_time": event.end_time,
            "category": event.category,  
            "priority": event.priority, 
            "source": "manual"
        }
        response = supabase.table("study_events").insert(event_data).execute()
        return {"status": "success", "data": response.data[0] if response.data else None}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/get-events")
async def get_events(
    authorization: str = Header(None),
    user_id: str = Header(None),
    start_date: Optional[str] = None, 
    end_date: Optional[str] = None
):
    if not authorization or not user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")

    try:
        query = supabase.table("study_events").select("*").eq("user_id", user_id).order("start_time")
        
        if start_date:
            query = query.gte("start_time", f"{start_date}T00:00:00Z")
        if end_date:
            query = query.lte("end_time", f"{end_date}T23:59:59Z")

        max_retries = 3
        response = None
        
        for attempt in range(max_retries):
            try:
                response = query.execute()
                break 
            except Exception as e:
                if attempt == max_retries - 1:
                    raise e 
                time.sleep(0.5) 

        return {"status": "success", "events": response.data, "count": len(response.data)}

    except Exception as e:
        traceback.print_exc() 
        raise HTTPException(status_code=500, detail=f"Server Error: {str(e)}")


@router.delete("/delete-event/{event_id}")
async def delete_event(
    event_id: str,
    authorization: str = Header(None),
    user_id: str = Header(None)
):
    if not authorization or not user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")

    try:
        response = supabase.table("study_events") \
            .delete() \
            .eq("id", event_id) \
            .eq("user_id", user_id) \
            .execute()

        return {"status": "success", "message": "Event deleted successfully"}
    except Exception as e:
        print(f"Error deleting event: {e}")
        raise HTTPException(status_code=500, detail=str(e))
