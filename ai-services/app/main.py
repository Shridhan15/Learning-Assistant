import os
from fastapi import HTTPException
from fastapi import FastAPI, UploadFile, File, Header,WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

from app.services.websocket_manager import manager
from app.routers.usage import router as usage_router 
from app.routers.chat import router as chat_router
from app.routers.quiz import router as quiz_router
from app.routers.calendar import router as calendar_router
from app.routers.files import router as file_router
from app.routers.voice import router as voice_router
from app.routers.learning_paths import router as learning_paths_router

app = FastAPI()


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"status": "StudyMate AI Service is Running"}

UPLOAD_DIR = "app/data/uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# --- WebSocket Endpoint ---
@app.websocket("/ws/progress/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: str):
    await manager.connect(websocket, user_id)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(user_id)
    except Exception as e:
        print(f"WebSocket error: {e}")
        manager.disconnect(user_id)

app.include_router(usage_router) 
app.include_router(chat_router)
app.include_router(quiz_router)
app.include_router(voice_router)
app.include_router(file_router)
app.include_router(calendar_router)
app.include_router(learning_paths_router)