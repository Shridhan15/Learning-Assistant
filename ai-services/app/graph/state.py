
from langchain_core.messages import  BaseMessage
from typing import List, Optional,Literal,Dict,TypedDict,Any
from dotenv import load_dotenv
load_dotenv() 

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
