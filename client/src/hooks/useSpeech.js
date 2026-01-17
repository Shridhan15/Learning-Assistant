import { useEffect, useRef, useState } from "react";
import { playAzureAudio } from "../services/azureSpeechApi";

export default function useSpeech() {
    const [isListening, setIsListening] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [speechError, setSpeechError] = useState("");

    const recognitionRef = useRef(null);
    const currentAudioRef = useRef(null);
    const synthRef = useRef(window.speechSynthesis);

    useEffect(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

        if (!SpeechRecognition) {
            setSpeechError("Browser not supported (Use Chrome).");
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.lang = "en-IN";
        recognition.interimResults = true;
        recognition.continuous = true;

        recognition.onstart = () => setIsListening(true);
        recognition.onend = () => setIsListening(false);
        recognition.onerror = (e) => {
            if (e.error !== 'no-speech') setSpeechError("Mic error: " + e.error);
            setIsListening(false);
        };

        recognitionRef.current = recognition;

        return () => {
            recognition.stop();
            if (currentAudioRef.current) {
                currentAudioRef.current.pause();
            }
            synthRef.current.cancel();
        };
    }, []);

    const startListening = (onResult) => {
        if (!recognitionRef.current) return;
        setSpeechError("");

        recognitionRef.current.onresult = (event) => {
            let interim = "";
            let final = "";

            for (let i = 0; i < event.results.length; i++) {
                if (event.results[i].isFinal) {
                    final += event.results[i][0].transcript + " ";
                } else {
                    interim += event.results[i][0].transcript;
                }
            }

            const totalText = (final + interim).trim();
            // We pass the text back to the parent
            if (totalText && onResult) {
                onResult(totalText);
            }
        };

        try {
            recognitionRef.current.start();
        } catch (e) { }
    };

    const stopListening = () => {
        try {
            recognitionRef.current?.stop();
        } catch (e) { }
        setIsListening(false);
    };

    const speak = async (text) => {
        if (!text) return;
        setIsSpeaking(true);
        setSpeechError("");

        if (currentAudioRef.current) {
            currentAudioRef.current.pause();
            currentAudioRef.current = null;
        }
        synthRef.current.cancel();

        try {
            // Try Azure First
            const audio = await playAzureAudio(text);
            if (!audio) throw new Error("Audio object is undefined");

            currentAudioRef.current = audio;
            audio.onended = () => {
                setIsSpeaking(false);
                currentAudioRef.current = null;
            };

        } catch (err) {
            console.warn("Switching to native voice due to error:", err.message);
            // Fallback to Native Browser Voice
            setTimeout(() => {
                const utter = new SpeechSynthesisUtterance(text);
                const voices = synthRef.current.getVoices();
                utter.voice = voices.find(v => v.lang.includes('en')) || null;

                utter.onstart = () => setIsSpeaking(true);
                utter.onend = () => setIsSpeaking(false);
                utter.onerror = () => setIsSpeaking(false);

                synthRef.current.speak(utter);
            }, 50);
        }
    };

    const stopSpeaking = () => {
        if (currentAudioRef.current) {
            currentAudioRef.current.pause();
        }
        synthRef.current.cancel();
        setIsSpeaking(false);
    };

    return {
        isListening,
        isSpeaking,
        speechError,
        startListening,
        stopListening,
        speak,
        stopSpeaking,
    };
}