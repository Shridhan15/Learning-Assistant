// src/services/quizService.js

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export const generateQuizApi = async (token, userId, filename, topic) => {
    try {
        const response = await fetch(`${API_BASE_URL}/generate-quiz`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
                "user-id": userId,
            },
            body: JSON.stringify({
                topic: topic,
                filename: filename,
            }),
        });

        if (!response.ok) {
            throw new Error("Failed to generate quiz");
        }

        return await response.json();
    } catch (error) {
        console.error("Quiz Generation Error:", error);
        throw error;
    }
};