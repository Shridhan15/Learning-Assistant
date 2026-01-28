
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

export const generateQuizApi = async (token, userId, filename, topic, numQuestions, difficulty) => {
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
                num_questions: numQuestions,
                difficulty: difficulty,
            }),
        });

        if (response.status === 429) {
            const error = new Error("Daily limit reached");
            error.status = 429; // Attach the status code to the error object
            throw error;
        }

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || "Failed to generate quiz");
        }

        return await response.json();
    } catch (error) {
        console.error("Quiz Generation Error:", error);
        throw error;
    }
};