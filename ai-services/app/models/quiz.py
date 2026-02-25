import os
import json
from urllib import response
import instructor
import asyncio
from fastapi import HTTPException
import traceback
import time
import pytz
import requests
import shutil
import string
from fastapi import FastAPI, UploadFile, File, HTTPException, Header,WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel,Field,validator
from dotenv import load_dotenv
from groq import Groq
from langchain_groq import ChatGroq
from langchain_core.tools import tool
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from typing import List, Optional,Literal




class QuizRequest(BaseModel):
    topic: str
    filename: str
    num_questions: int = Field(5, ge=1, le=20, description="Number of questions to generate")
    difficulty: Literal["Easy", "Medium", "Hard"] = Field("Medium", description="Quiz difficulty")



class Question(BaseModel):
    id: int = Field(..., description="The question number (1, 2, 3...)")
    question: str = Field(..., description="The question text")
    options: List[str] = Field(..., min_length=4, max_length=4, description="List of exactly 4 options")
    correctAnswer: str = Field(..., description="The correct option text (must match one of the options)")
    explanation: str = Field(..., description="A clear 1-2 sentence explanation of why the answer is correct.")


class QuizResponse(BaseModel):
    context_summary: str = Field(..., description="A 1-2 sentence summary of the text content.")
    questions: List[Question]

 

 

class MistakeSchema(BaseModel):
    question: str
    wrong_answer: str
    correct_answer: str
    explanation: str


class QuizResultSchema(BaseModel):
    filename: str
    topic: str
    score: int
    total_questions: int
    difficulty: Literal["Easy", "Medium", "Hard"] = "Medium"
    mistakes: List[MistakeSchema] = []
