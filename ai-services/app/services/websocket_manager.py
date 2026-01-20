from fastapi import WebSocket
from typing import Dict

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}

    async def connect(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        self.active_connections[user_id] = websocket
        print(f"DEBUG: User {user_id} connected to WebSocket.")

    def disconnect(self, user_id: str):
        if user_id in self.active_connections:
            del self.active_connections[user_id]
            print(f"DEBUG: User {user_id} disconnected.")

    async def send_progress(self, user_id: str, current: int, total: int, status: str):
        if user_id in self.active_connections:
            websocket = self.active_connections[user_id]
            try:
                await websocket.send_json({
                    "current": current, 
                    "total": total, 
                    "status": status,
                    "percentage": int((current / total) * 100)
                })
            except Exception as e:
                print(f"Error sending progress to {user_id}: {e}")
                self.disconnect(user_id)

manager = ConnectionManager()