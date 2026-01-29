from pydantic import BaseModel
from typing import Optional

class UsageResponse(BaseModel):
    # Live Counters
    total_files_uploaded: int
    daily_quiz_questions: int
    daily_tutor_questions: int
    daily_coach_msgs: int
    
    limit_files: int = 3
    limit_quiz: int = 20
    limit_tutor: int = 15
    limit_coach: int = 10