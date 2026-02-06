
import os

from groq import Groq
from dotenv import load_dotenv
load_dotenv()
import instructor



client = instructor.from_groq(Groq(api_key=os.environ.get("GROQ_API_KEY")))