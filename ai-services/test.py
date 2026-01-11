import os
from dotenv import load_dotenv
from langchain_groq import ChatGroq

load_dotenv()

llm = ChatGroq(
    model="llama-3.1-8b-instant",
    temperature=0
)

try:
    response = llm.invoke("Say 'Groq API is working'")
    print("✅ Groq API is ACTIVE")
    print("Response:", response.content)
except Exception as e:
    print("❌ Groq API error:")
    print(e)
