from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel
from app.services.learningpath_llm import generate_learning_roadmap
from app.services.search import search_docs, search_youtube 
from supabase import create_client
import os

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
router = APIRouter(prefix="/learning-paths")

class LearningPathRequest(BaseModel):
    goal: str
    experience: str
    time_per_day: str
    duration: str

@router.post("/create")
async def create_learning_path(
    data: LearningPathRequest,
    user_id: str = Header(None)
):

    if not user_id:
        raise HTTPException(status_code=400, detail="User ID required")

    roadmap = await generate_learning_roadmap(
        data.goal,
        data.experience,
        data.time_per_day,
        data.duration
    )

    # Attach resources
    for week in roadmap["weeks"]:
        # Dynamically build the query based on level
        level_modifier = {
            "Beginner": "for beginners absolute basics",
            "Intermediate": "intermediate advanced patterns industry best practices",
            "Advanced": "advanced deep dive architecture optimization internals"
        }.get(data.experience, "")

        # Create a more surgical search query
        query = f"{data.goal} {week['title']} {level_modifier}"

        resources = []
        resources.extend(search_youtube(query))
        resources.extend(search_docs(query))
        week["resources"] = resources

    insert_data = {
        "user_id": user_id,
        "goal": data.goal,
        "experience": data.experience,
        "time_per_day": data.time_per_day,
        "duration": data.duration,
        "roadmap": roadmap
    }

    result = supabase.table("learning_paths").insert(insert_data).execute()

    return result.data[0]


@router.get("")
async def get_learning_paths(user_id: str = Header(None)):

    if not user_id:
        raise HTTPException(status_code=400, detail="User ID required")

    result = (
        supabase
        .table("learning_paths")
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .execute()
    )

    return result.data