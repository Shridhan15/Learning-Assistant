from fastapi import APIRouter, Header, HTTPException
from app.services import usage_service
from app.models.schemas import UsageResponse
from app.config import UsageLimits

router = APIRouter()

@router.get("/usage", response_model=UsageResponse)
async def get_user_usage(user_id: str = Header(..., alias="user-id")):
    """
    Returns the user's current usage stats and the system limits.
    Triggers a 'Lazy Reset' via the service if it's a new day in IST.
    """
    try:
        # 1. Get dynamic data from Service
        # (The service handles the DB fetch and the IST date reset logic)
        data = await usage_service.get_usage_stats(user_id)

        # 2. Return Response combining Data + Limits
        # We inject limits here so the Frontend doesn't need hardcoded values.
        return UsageResponse(
            # --- Dynamic Data (From DB) ---
            total_files_uploaded=data.get("total_files_uploaded", 0),
            daily_quiz_questions=data.get("daily_quiz_questions", 0),
            daily_tutor_questions=data.get("daily_tutor_questions", 0),
            daily_coach_msgs=data.get("daily_coach_msgs", 0),

            # --- Static Limits (From Config) ---
            limit_files=UsageLimits.MAX_FILES,
            limit_quiz=UsageLimits.DAILY_QUIZ_QUESTIONS,
            limit_tutor=UsageLimits.DAILY_TUTOR_QUESTIONS,
            limit_coach=UsageLimits.DAILY_COACH_MSGS
        )

    except Exception as e:
        print(f"❌ Error in /usage endpoint: {e}")
        raise HTTPException(status_code=500, detail="Failed to load usage stats")