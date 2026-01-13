import React, { useState, useEffect } from "react";
import {
  Upload,
  FileText,
  CheckCircle,
  Play,
  RefreshCw,
  BookOpen,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { useLocation } from "react-router-dom";

import QuizViewer from "./QuizViewer";
import QuizResults from "./QuizResults";
import { generateQuizApi } from "../services/quizService";

const QuizAssistant = ({ getToken, userId }) => {
  const location = useLocation();

  const [step, setStep] = useState(1);
  const [file, setFile] = useState(null);
  const [topic, setTopic] = useState("");
  const [availableFiles, setAvailableFiles] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isAutoStarting, setIsAutoStarting] = useState(
    !!(location.state?.filename && location.state?.topic)
  );

  const [quizData, setQuizData] = useState([]);
  const [userAnswers, setUserAnswers] = useState({});
  const [score, setScore] = useState(0);

  const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

  const authFetch = async (url, options = {}) => {
    const token = await getToken();
    const headers = {
      ...options.headers,
      Authorization: `Bearer ${token}`,
      "user-id": userId,
    };
    return fetch(url, { ...options, headers });
  };

  useEffect(() => {
    if (userId) {
      fetchFiles();
    }
  }, [userId]);

  const fetchFiles = async () => {
    try {
      const res = await authFetch(`${API_BASE_URL}/files`);
      const data = await res.json();
      setAvailableFiles(data.files || []);
    } catch (err) {
      console.error("Failed to load library:", err);
    }
  };

  const handleFileUpload = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    setIsUploading(true);

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      // Get token manually here because FormData handling is special
      const token = await getToken();

      const response = await fetch(`${API_BASE_URL}/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "user-id": userId,
        },
        body: formData,
      });

      if (!response.ok) throw new Error("Upload failed");

      const data = await response.json();

      setFile({ name: data.filename });
      fetchFiles();
      setIsUploading(false);
      setStep(2);
    } catch (error) {
      console.error(error);
      alert("Failed to upload PDF. Check backend console.");
      setIsUploading(false);
    }
  };

  // SELECT EXISTING
  const handleSelectFromLibrary = (filename) => {
    setFile({ name: filename });
    setStep(2);
  };

  //  GENERATE QUIZ
  // GENERATE QUIZ (Updated to accept optional params)
  const generateQuiz = async (overrideFile = null, overrideTopic = null) => {
    const activeFile = overrideFile || file;
    const activeTopic = overrideTopic || topic;

    if (!activeTopic || !activeFile) return;

    setIsLoading(true);
    try {
      const token = await getToken();

      // CALL THE SHARED API SERVICE
      const data = await generateQuizApi(
        token,
        userId,
        activeFile.name,
        activeTopic
      );

      if (data.questions && data.questions.length > 0) {
        setQuizData(data.questions);
        setStep(3);
      } else {
        alert("The AI couldn't find relevant info for this topic.");
      }
    } catch (error) {
      alert("Error generating quiz.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const autoStart = async () => {
      if (location.state?.filename && location.state?.topic) {
        const { filename, topic } = location.state;
        console.log("Auto-starting quiz for:", filename, topic);

        // Update local state for context
        setFile({ name: filename });
        setTopic(topic);
        setIsLoading(true); // Ensure loader shows

        try {
          // Call your generation logic directly here to ensure control flow
          const token = await getToken();
          const data = await generateQuizApi(token, userId, filename, topic);

          if (data.questions && data.questions.length > 0) {
            setQuizData(data.questions);
            setStep(3); // Jump straight to quiz
          } else {
            alert("The AI couldn't find relevant info for this topic.");
            setStep(2); // Fallback to topic selection
          }
        } catch (e) {
          console.error(e);
          setStep(2); // Fallback on error
        } finally {
          // --- FIX 3: Turn off the auto-start blocker ---
          setIsAutoStarting(false);
          setIsLoading(false);
          // Clear router state so refresh doesn't re-trigger
          window.history.replaceState({}, document.title);
        }
      }
    };

    autoStart();
  }, [location.state]);

  const handleOptionSelect = (questionId, option) => {
    setUserAnswers((prev) => ({ ...prev, [questionId]: option }));
  };

  const submitQuiz = async () => {
    let calculatedScore = 0;
    quizData.forEach((q) => {
      if (userAnswers[q.id] === q.correctAnswer) {
        calculatedScore += 1;
      }
    });
    setScore(calculatedScore);

    try {
      await authFetch(`${API_BASE_URL}/save-result`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          topic: topic,
          score: calculatedScore,
          total_questions: quizData.length,
        }),
      });
      console.log("Quiz result saved to database!");
    } catch (error) {
      console.error("Failed to save history:", error);
    }

    setStep(4);
  };

  const resetApp = () => {
    setStep(1);
    setFile(null);
    setTopic("");
    setUserAnswers({});
    setScore(0);
    fetchFiles();
  };

  const restartTopic = () => {
    setStep(2);
    setQuizData([]);
    setScore(0);
    setUserAnswers({});
  };

  if (isAutoStarting || (isLoading && step === 1)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] animate-in fade-in duration-300">
        <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mb-4" />
        <h3 className="text-xl font-semibold text-white">
          Preparing your practice quiz...
        </h3>
        <p className="text-gray-400 mt-2">
          Analyzing{" "}
          <span className="text-indigo-400">
            {location.state?.filename || file?.name}
          </span>
        </p>
      </div>
    );
  }

  return (
    <div className="text-white flex flex-col items-center justify-center py-8 font-sans relative">
      <div className="fixed top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 z-50" />
      <div className="fixed -top-40 -left-40 w-96 h-96 bg-indigo-500/20 rounded-full blur-[100px] pointer-events-none" />
      <div className="fixed bottom-0 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-2xl bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl p-8 shadow-2xl relative z-10">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">
            AI Quiz Master
          </h1>
          <p className="text-gray-400 text-sm mt-2">
            Upload a PDF or choose from your library
          </p>
        </div>

        {/* STEP 1: SELECTION */}
        {step === 1 && (
          <div className="flex flex-col gap-6 animate-in fade-in zoom-in duration-300">
            {/* Upload Box */}
            <div className="w-full h-32 border-2 border-dashed border-white/20 rounded-xl flex flex-col items-center justify-center hover:border-indigo-500/50 hover:bg-white/5 transition bg-black/20 cursor-pointer relative group">
              <input
                type="file"
                accept=".pdf"
                onChange={handleFileUpload}
                disabled={isUploading}
                className="absolute inset-0 opacity-0 cursor-pointer z-20"
              />
              <div className="group-hover:scale-110 transition duration-300">
                {isUploading ? (
                  <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
                ) : (
                  <Upload className="w-8 h-8 text-gray-400 mb-2 group-hover:text-indigo-400" />
                )}
              </div>
              <p className="text-gray-300 font-medium mt-2">
                {isUploading ? "Uploading & Processing..." : "Upload New PDF"}
              </p>
            </div>

            {/* Library List */}
            <div className="flex items-center w-full gap-4">
              <div className="h-px bg-white/10 flex-1" />
              <span className="text-gray-500 text-xs uppercase tracking-wider">
                Your Library
              </span>
              <div className="h-px bg-white/10 flex-1" />
            </div>

            <div className="w-full max-h-60 overflow-y-auto space-y-2 pr-2 no-scrollbar">
              {availableFiles.length === 0 ? (
                <div className="text-center py-6 text-gray-500 bg-white/5 rounded-lg border border-dashed border-white/10">
                  <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">
                    Library is empty. Upload a file above!
                  </p>
                </div>
              ) : (
                availableFiles.map((fname) => (
                  <button
                    key={fname}
                    onClick={() => handleSelectFromLibrary(fname)}
                    className="w-full flex items-center gap-3 p-3 bg-white/5 hover:bg-indigo-600/20 hover:border-indigo-500/30 border border-white/5 rounded-lg transition-all text-left group"
                  >
                    <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-400 group-hover:text-indigo-300">
                      <FileText className="w-5 h-5" />
                    </div>
                    <span className="text-sm text-gray-300 group-hover:text-white truncate flex-1 font-medium">
                      {fname}
                    </span>
                    <div className="text-xs text-gray-500 group-hover:text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity">
                      Select &rarr;
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        {/* STEP 2: TOPIC SELECTION */}
        {step === 2 && (
          <div className="flex flex-col gap-6 animate-in slide-in-from-right-8 duration-300">
            <div className="flex items-center gap-3 bg-indigo-500/10 px-4 py-3 rounded-lg border border-indigo-500/30 text-indigo-300">
              <CheckCircle className="w-5 h-5 shrink-0" />
              <div className="flex-1 overflow-hidden">
                <p className="text-xs text-indigo-400/70 uppercase font-bold">
                  Selected File
                </p>
                <p className="text-sm truncate font-medium">{file?.name}</p>
              </div>
              <button
                onClick={() => setStep(1)}
                className="text-xs hover:text-white underline"
              >
                Change
              </button>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">
                What topic do you want to test?
              </label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. 'Photosynthesis' or 'Chapter 4'"
                className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-white placeholder-white/30 transition-all"
              />
            </div>

            <button
              onClick={() => generateQuiz()}
              disabled={!topic || isLoading}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-full font-medium transition flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Analyzing PDF...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" /> Generate Quiz
                </>
              )}
            </button>
          </div>
        )}

        {/* STEP 3: QUIZ */}
        {step === 3 && (
          <QuizViewer
            quizData={quizData}
            userAnswers={userAnswers}
            handleOptionSelect={handleOptionSelect}
            submitQuiz={submitQuiz}
            topic={topic}
          />
        )}

        {step === 4 && (
          <QuizResults
            quizData={quizData}
            userAnswers={userAnswers}
            score={score}
            onNewFile={resetApp}
            onNewTopic={restartTopic}
          />
        )}
      </div>
    </div>
  );
};

export default QuizAssistant;
