from fastapi import APIRouter, Header,HTTPException

router = APIRouter(
    prefix="/quiz",
    tags=["Quiz"]
)

from app.models.quiz import QuizRequest, QuizResponse, QuizResultSchema, MistakeSchema
from app.services.usage_service import check_and_increment
from app.services.clean_context_text import clean_context_text
from app.config import supabase



from app.rag import load_pdf, chunk_text, store_in_pinecone, retrieve


from app.services.groq_client import client

@router.post("/generate")
async def generate_quiz(req: QuizRequest, user_id: str = Header(...)):
    await check_and_increment(user_id, "quiz_questions", amount=req.num_questions)
    print(f"Generating {req.num_questions} questions ({req.difficulty}) for: {req.topic}")

    # Retrieve Context
    retrieved_chunks = retrieve(req.topic, req.filename, user_id)
    if not retrieved_chunks:
        return {"questions": []}

    texts = []

    for chunk in retrieved_chunks:
        text = chunk.get("text")
        if text:
            texts.append(text)

    raw_context = "\n\n".join(texts)
    clean_context = clean_context_text(raw_context)
 

    difficulty_instructions = {
        "Easy": (
            "EASY MODE (Atomic Recall Only):\n"
            "- Each question MUST map to exactly ONE sentence or definition in the text.\n"
            "- Allowed forms ONLY: What / Who / When / Where / Define.\n"
            "- NO paraphrasing, NO inference, NO combining facts.\n"
            "- If removing the source sentence makes the question unanswerable, it is INVALID.\n"
            "- Each question must test a DIFFERENT fact.\n"
            "- Distractors must be same-domain but clearly incorrect."
        ),

        "Medium": (
            "MEDIUM MODE (Single-Concept Understanding):\n"
            "- Each question MUST transform ONE concept from the text.\n"
            "- Allowed reasoning: explanation, cause-effect, or meaning.\n"
            "- MUST rely on ONE concept only.\n"
            "- If answer can be copied verbatim from the text, it is INVALID.\n"
            "- NO scenarios, NO real-world cases.\n"
            "- Distractors must be realistic misunderstandings of the SAME concept."
        ),

        "Hard": (
            "HARD MODE (Verified Multi-Hop Reasoning ONLY):\n"
            "- EACH question MUST combine TWO DISTINCT concepts from DIFFERENT parts of the text.\n"
            "- Required reasoning pattern: Concept A + Concept B → Inference.\n"
            "- If the question can be answered using only ONE concept, it is INVALID.\n"
            "- Questions MUST be scenario-based and require prediction or decision.\n"
            "- Ask ONLY for BEST / MOST APPROPRIATE / MOST LIKELY outcome.\n"
            "- NO definitions, NO explanations, NO direct restatement of text.\n"
            "- Each question must test a UNIQUE pair of concepts.\n"
            "- Distractors must be partially correct but fail due to ONE missing inference."
        )
    }

    difficulty_key = req.difficulty.strip().capitalize()
    selected_difficulty_prompt = difficulty_instructions.get(
        difficulty_key, difficulty_instructions["Medium"]
    ) 
    print("Difficulty key used:", difficulty_key)

    # ---------------- LLM CALL ---------------- #

    try:
        quiz_data = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            max_retries=3,
            temperature=0.3,
            response_model=QuizResponse,
            messages=[
                {
                    "role": "system",
                    "content": f"""
You are an expert psychometrician and assessment specialist.

Your task is to generate a {req.num_questions}-question multiple-choice quiz
that STRICTLY follows the requested difficulty rules.

STRICT DIFFICULTY ENFORCEMENT: {difficulty_key}
{selected_difficulty_prompt}

REASONING CONTRACT (MANDATORY):
- Easy → one sentence → one question
- Medium → one concept → one transformation, make sure elimination of options is not easy
- Hard → Concept A + Concept B → inference, make each options look like a possible right answer, but there should be only one correct answer

If this structure cannot be met, DO NOT generate the question.

CRITICAL QUESTION DESIGN RULES:
1) SOURCE TEXT ONLY (no outside knowledge).
2) Exactly ONE correct option (A–D).
3) Exactly 4 options. No All/None.
4) No negative framing (NOT / EXCEPT).
5) Questions must be independent.
6) Distractors must be concept-related.

EXCLUSIONS:
Ignore sections titled Exercises, Glossary, References, About the Author.

OUTPUT FORMAT:
Return ONLY a valid QuizResponse object.
"""
                },
                {
                    "role": "user",
                    "content": f"""
Generate the quiz using ONLY the text below.

----- BEGIN SOURCE TEXT -----
{clean_context}
----- END SOURCE TEXT -----

Topic: {req.topic}
"""
                }
            ],
        )
        return quiz_data.model_dump()

    except Exception as e:
        print(f"Error calling Groq: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate quiz")
  
    


# Save Endpoint
@router.post("/save-result")
async def save_quiz_result(result: QuizResultSchema, user_id: str = Header(...)):
    try:
        quiz_insert_response = supabase.table("quiz_results").insert({
            "user_id": user_id,
            "filename": result.filename,
            "topic": result.topic,
            "score": result.score,
            "total_questions": result.total_questions,
            "difficulty": result.difficulty
        }).execute()
        
        new_quiz_id = quiz_insert_response.data[0]['id']

        
        if result.mistakes:
            # Prepare the list of dictionaries for bulk insert
            mistakes_data = [
                {
                    "user_id": user_id,
                    "quiz_result_id": new_quiz_id,
                    "topic": result.topic,
                    "question": m.question,
                    "wrong_answer": m.wrong_answer,
                    "correct_answer": m.correct_answer,
                    "explanation": m.explanation,
                    
                }
                for m in result.mistakes
            ]
            
            # Bulk Insert (Efficient)
            supabase.table("mistakes").insert(mistakes_data).execute()
        
        return {"message": "Result and mistakes saved successfully"}
    
    except Exception as e:
        print(f"Error saving result: {e}") 
        raise HTTPException(status_code=500, detail="Failed to save result")
    




@router.get("/results")
def get_user_results(user_id: str = Header(None)):
    if not user_id:
        return {"results": []}

    max_retries = 3
    response = None

    for attempt in range(max_retries):
        try:
            # 1. Try to execute the query
            response = supabase.table("quiz_results")\
                .select("*")\
                .eq("user_id", user_id)\
                .order("created_at", desc=True)\
                .execute()
            break 

        except Exception as e:
            print(f"results Attempt {attempt + 1} failed: {e}")
             
            if attempt == max_retries - 1:
                print(f" CRITICAL FAILURE in /results: {e}") 
                raise HTTPException(status_code=500, detail="Server disconnected")
            
             
            time.sleep(0.5) 

    return {"results": response.data}
