# app/routers/coach.py

from fastapi import APIRouter, HTTPException
import json

from app.models.chat import CoachRequest
from app.models.quiz import QuizRequest
from app.tools.coach import COACH_TOOLS
from app.services.llm_client import client
from app.supabase.client import supabase
from app.services.usage import check_and_increment
from app.routers.quiz import generate_quiz

router = APIRouter(prefix="/coach", tags=["Coach"])
