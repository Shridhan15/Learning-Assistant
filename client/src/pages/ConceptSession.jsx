import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import { BrainCircuit, Loader2, XCircle } from "lucide-react";
import ConceptFeedbackCard from "../components/ConceptFeedbackCard";

const ConceptSession = () => {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { getToken } = useAuth();
  const API_BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

  // --- 1. Safety Check: Ensure we have data ---
  if (!state?.questions || !state?.testId) {
    // If user refreshes or comes here directly, send them back to setup
    // You might want to add a "Restore Session" feature later
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4">
        <div className="text-center space-y-4">
          <XCircle className="w-12 h-12 text-red-500 mx-auto" />
          <h2 className="text-xl font-bold">Session Data Missing</h2>
          <p className="text-slate-400">
            Please start a new test from the dashboard.
          </p>
          <button
            onClick={() => navigate("/concept-test")}
            className="px-6 py-2 bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const { questions, topic, testId, fileName } = state;

  // --- 2. State Management ---
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState("");
  const [feedback, setFeedback] = useState(null); // Stores the AI result for current question
  const [isGrading, setIsGrading] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);

  // We store the full history here to save at the end
  const [transcript, setTranscript] = useState([]);
  const [scoreHistory, setScoreHistory] = useState([]);

  const currentQuestion = questions[currentIndex];
  const isLastQuestion = currentIndex === questions.length - 1;

  // --- 3. Submit Answer for Grading ---
  const handleSubmit = async () => {
    if (!userAnswer.trim()) return;
    setIsGrading(true);

    try {
      const token = await getToken();

      const response = await fetch(`${API_BASE_URL}/evaluate-concept-answer`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          question: currentQuestion.question_text,
          rubric: currentQuestion.concept_rubric,
          user_answer: userAnswer,
        }),
      });

      if (!response.ok) throw new Error("Grading failed");

      const feedbackData = await response.json();

      // A. Show Feedback to User
      setFeedback(feedbackData);

      // B. Save Score locally
      setScoreHistory((prev) => [...prev, feedbackData.score]);

      // C. Update Transcript (The "Memory" of the session)
      const interactionRecord = {
        question_id: currentQuestion.id,
        question_text: currentQuestion.question_text,
        user_answer: userAnswer,
        rubric: currentQuestion.concept_rubric,
        score: feedbackData.score,
        ai_feedback: feedbackData.feedback_text,
        missing_concepts: feedbackData.missing_concepts,
      };
      setTranscript((prev) => [...prev, interactionRecord]);
    } catch (error) {
      console.error("Grading failed:", error);
      alert("Error grading answer. Please try again.");
    } finally {
      setIsGrading(false);
    }
  };

  // --- 4. Move to Next or Finish ---
  const handleNext = async () => {
    if (isLastQuestion) {
      // --- FINISH SESSION ---
      setIsFinishing(true);
      try {
        const token = await getToken();
        const averageScore =
          scoreHistory.reduce((a, b) => a + b, 0) / scoreHistory.length;

        // Save everything to Supabase
        await fetch(`${API_BASE_URL}/finish-concept-test`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            test_id: testId,
            final_score: Math.round(averageScore), // Clean integer
            transcript: transcript,
          }),
        });

        // Navigate to Summary (Pass data so we don't need to refetch immediately)
        navigate("/concept-test/summary", {
          state: {
            averageScore: Math.round(averageScore),
            topic,
            transcript, // Pass transcript so they can review immediately
            fileName,
          },
        });
      } catch (error) {
        console.error("Failed to save session:", error);
        alert("Session finished, but failed to save to history.");
        // Still navigate so they don't get stuck
        navigate("/concept-test");
      }
    } else {
      // --- NEXT QUESTION ---
      setFeedback(null);
      setUserAnswer("");
      setCurrentIndex((prev) => prev + 1);
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 text-white flex flex-col items-center py-8 px-4 font-sans relative">
      {/* Background (Optional, matches other pages) */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:14px_24px] pointer-events-none" />

      {/* Header / Progress */}
      <div className="w-full max-w-3xl mb-8 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-500/20 rounded-xl text-indigo-400 border border-indigo-500/20 shadow-lg shadow-indigo-500/10">
            <BrainCircuit className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-bold text-lg md:text-xl tracking-tight text-white">
              {topic}
            </h2>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="bg-slate-800 px-2 py-0.5 rounded text-slate-300 border border-slate-700">
                {fileName}
              </span>
              <span>• Concept Test</span>
            </div>
          </div>
        </div>
        <div className="text-right">
          <p className="text-3xl font-mono font-bold text-white tracking-tighter">
            0{currentIndex + 1}
            <span className="text-slate-600 text-xl">/0{questions.length}</span>
          </p>
        </div>
      </div>

      {/* Main Card */}
      <div className="w-full max-w-3xl bg-slate-900/60 border border-white/10 rounded-3xl p-6 md:p-10 shadow-2xl backdrop-blur-md relative z-10 animate-in fade-in duration-500">
        {/* 1. The Question (Visible while answering) */}
        {!feedback && (
          <div className="mb-8 animate-in slide-in-from-left-2 duration-300">
            <h3 className="text-xl md:text-2xl font-medium text-white leading-relaxed">
              {currentQuestion.question_text}
            </h3>
          </div>
        )}

        {/* 2. Input Area (Visible ONLY when NOT grading/feedback) */}
        {!feedback && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="relative">
              <textarea
                value={userAnswer}
                onChange={(e) => setUserAnswer(e.target.value)}
                placeholder="Type your explanation here. Use your own words..."
                className="w-full h-64 bg-slate-950/50 border border-white/10 rounded-2xl p-6 text-lg text-slate-200 placeholder-slate-600 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none resize-none transition-all shadow-inner"
                disabled={isGrading}
              />
              {/* Character Count Hint */}
              <div className="absolute bottom-4 right-4 text-xs text-slate-600 pointer-events-none">
                {userAnswer.length} chars
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleSubmit}
                disabled={!userAnswer.trim() || isGrading}
                className={`
                            flex items-center gap-3 px-8 py-4 rounded-xl font-bold text-lg transition-all
                            ${
                              !userAnswer.trim() || isGrading
                                ? "bg-slate-800 text-slate-500 cursor-not-allowed border border-white/5"
                                : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-xl shadow-indigo-500/20 hover:scale-[1.02]"
                            }
                        `}
              >
                {isGrading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Analyzing Logic...
                  </>
                ) : (
                  "Submit Answer"
                )}
              </button>
            </div>
          </div>
        )}

        {/* 3. Feedback Component (Replaces Input) */}
        {feedback && (
          <ConceptFeedbackCard
            feedbackData={feedback}
            rubric={currentQuestion.concept_rubric}
            onNext={handleNext}
            isLastQuestion={isLastQuestion}
          />
        )}

        {/* Loading Overlay for "Finishing" */}
        {isFinishing && (
          <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-sm z-50 flex flex-col items-center justify-center rounded-3xl">
            <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mb-4" />
            <p className="text-xl font-bold text-white">Saving Results...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConceptSession;
