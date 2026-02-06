# app/tools/coach.py

COACH_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "create_quiz",
            "description": (
                "Generate a quiz for the student when they ask to start a quiz, "
                "test themselves, or practice questions."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "book_hint": {
                        "type": "string",
                        "description": "Which book the topic belongs to (e.g. ecosystem, human health)"
                    },
                    "topic": {
                        "type": "string",
                        "description": "Specific topic inside the book"
                    },
                    "difficulty": {
                        "type": "string",
                        "enum": ["Easy", "Medium", "Hard"]
                    },
                    "num_questions": {
                        "type": "integer",
                        "minimum": 1,
                        "maximum": 20
                    }
                },
                "required": ["topic"]
            }
        }
    }
]
