from groq import Groq
import os
import json

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

async def generate_learning_roadmap(goal, experience, time_per_day, duration): 
    prompt = f"""
    Create a {experience} level learning roadmap for {goal}.
    
    STRICT GUIDELINES FOR {experience} LEVEL:
    - If Beginner: Focus on syntax, setup, and basic 'Hello World' concepts.
    - If Intermediate: Focus on integration, libraries, and building features.
    - If Advanced: Focus ONLY on optimization, low-level internals, design patterns, and scaling. 
      DO NOT include basic setup or introductory definitions.

    Duration: {duration}
    Daily Time: {time_per_day}

    Return JSON:
    {{
      "title": "...",
      "weeks": [
        {{
          "week": 1,
          "title": "Specific Topic for {experience} level",
          "topics": ["Advanced concept 1", "Advanced concept 2"],
          "tasks": ["Implement X using Y"]
        }}
      ]
    }}
    """

    response = client.chat.completions.create(
        model="openai/gpt-oss-120b",
        messages=[
            {"role": "system", "content": "You are an expert curriculum designer. You only output valid, minified JSON."},
            {"role": "user", "content": prompt}
        ],
        temperature=0.4,  
        response_format={"type": "json_object"}
    )
    return json.loads(response.choices[0].message.content)