from fastapi import APIRouter, HTTPException,Header
from pydantic import BaseModel, Field 
import os
import asyncio
import string
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage, BaseMessage
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.output_parsers import PydanticOutputParser
from typing import List, Optional,Literal,Dict,TypedDict,Any
from dotenv import load_dotenv
load_dotenv()
import logging
from langgraph.graph import StateGraph, START, END

class TutorState(TypedDict):
    user_id: str
    raw_message: str
    filename: str
    image_url: Optional[str]
    is_socratic: bool
    is_feynman: bool
    
    is_safe: bool          
    intent: str            
    relevance: str            
    effective_message: str
    chat_history: List[BaseMessage]
    search_query: Optional[str]
    context_text: str
    response_content: str
