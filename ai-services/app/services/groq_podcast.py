import os
from groq import Groq

client = Groq(api_key=os.environ.get("GROQ_API_KEY"))

SYSTEM_PROMPT = """
You are 'StudyMate', a friendly, encouraging tutor recording a daily audio summary.
Your goal is to review the student's mistakes from yesterday.
Write a script for a Text-to-Speech engine. Use short sentences. 
Use pauses (dots...) to indicate where the speaker should breathe.
Do not use special characters, markdown, or emojis. 
Focus on the 'Explanation' part to help the user learn.
Keep it under 200 words.
Start with "Good morning! Here is your quick review."
"""

def generate_podcast_script(mistakes: list) -> str:
    """Turns a list of mistake objects into a natural language script."""
    
    # 1. Format context for the LLM
    mistakes_context = ""
    for m in mistakes:
        mistakes_context += f"- Topic: {m.get('topic', 'General')}\n"
        mistakes_context += f"  Question: {m['question']}\n"
        mistakes_context += f"  Correct Answer: {m['correct_answer']}\n"
        mistakes_context += f"  Explanation: {m['explanation']}\n\n"

    # 2. Call Groq API
    chat_completion = client.chat.completions.create(
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": f"Here are the mistakes to cover:\n{mistakes_context}"}
        ],
        model="llama3-8b-8192", # Or mixstral-8x7b-32768
        temperature=0.6, # Slightly lower for more consistent output
    )

    return chat_completion.choices[0].message.content