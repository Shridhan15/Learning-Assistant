import { useState, useRef, useEffect } from "react";  
import useSpeech from "./useSpeech";

export default function useVoiceAssistant() {
    const [mode, setMode] = useState("idle");
    const [history, setHistory] = useState([]);

    const API_BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

    const {
        startListening: startNativeListening,
        stopListening: stopNativeListening,
        speak,
        stopSpeaking: stopNativeSpeaking,
        isListening,
        isSpeaking, 
        speechError,
    } = useSpeech();

    const isProcessingRef = useRef(false);
    const silenceTimerRef = useRef(null);

    // Automatically sync state when speech ends
    useEffect(() => { 
        if (!isSpeaking && mode === "speaking") {
            setMode("idle");
        }
    }, [isSpeaking, mode]);

    const startAssistant = (userId) => {
        if (!userId) {
            console.error("No User ID provided");
            return;
        }

        setMode("listening");
        isProcessingRef.current = false;

        startNativeListening((liveText) => {
            if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);

            silenceTimerRef.current = setTimeout(() => {
                if (!isProcessingRef.current && liveText.trim().length > 2) {
                    isProcessingRef.current = true;
                    stopNativeListening();
                    console.log(" Final User Text:", liveText);
                    processRequest(liveText, userId);
                }
            }, 1500);
        });
    };

    const processRequest = async (text, userId) => {
        setMode("thinking");

        try {
            const response = await fetch(`${API_BASE_URL}/coach`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    userId: userId,
                    message: text,
                    mode: "coach",
                    history: history,
                }),
            });

            if (!response.ok) throw new Error("Coach API Failed");

            const data = await response.json();
            const reply = data.replyText;

            console.log(" AI Replied:", reply);
            setHistory((prev) => {
                const newHistory = [
                    ...prev,
                    { role: "user", content: text },
                    { role: "assistant", content: reply },
                ];
                return newHistory.slice(-10);
            });

            setMode("speaking");
            await speak(reply);

            

        } catch (error) {
            console.error("Assistant Error:", error);
            setMode("error");
        } finally {
            isProcessingRef.current = false;
        }
    };

    const stopAssistant = () => {
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        stopNativeListening();
        stopNativeSpeaking();
        setMode("idle");
        isProcessingRef.current = false;
    };

    return { 
        mode: isSpeaking ? "speaking" : mode,
        startAssistant,
        stopAssistant,
        speechError,
    };
}