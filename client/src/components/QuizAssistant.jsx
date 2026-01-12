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

// 1. ACCEPT PROPS FROM CLERK
const QuizAssistant = ({ getToken, userId }) => {
  // --- STATE ---
  const [step, setStep] = useState(1);
  const [file, setFile] = useState(null);
  const [topic, setTopic] = useState("");
  const [availableFiles, setAvailableFiles] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const [quizData, setQuizData] = useState([]);
  const [userAnswers, setUserAnswers] = useState({});
  const [score, setScore] = useState(0);

  const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

  // --- HELPER: AUTHENTICATED FETCH ---
  // This automatically adds your Token and User ID to requests
  const authFetch = async (url, options = {}) => {
    const token = await getToken();
    const headers = {
      ...options.headers,
      Authorization: `Bearer ${token}`,
      "user-id": userId,
    };
    return fetch(url, { ...options, headers });
  };

  // --- INITIALIZATION ---
  useEffect(() => {
    if (userId) {
      fetchFiles();
    }
  }, [userId]); // Only fetch when we have a user ID

  const fetchFiles = async () => {
    try {
      // 2. USE AUTH FETCH (GET /files)
      const res = await authFetch(`${API_BASE_URL}/files`);
      const data = await res.json();
      setAvailableFiles(data.files || []);
    } catch (err) {
      console.error("Failed to load library:", err);
    }
  };

  // --- HANDLERS ---

  // 3. UPLOAD NEW PDF (Secure)
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
          // Note: Do NOT set Content-Type here; fetch handles it for FormData
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

  // 4. SELECT EXISTING
  const handleSelectFromLibrary = (filename) => {
    setFile({ name: filename });
    setStep(2);
  };

  // 5. GENERATE QUIZ (Secure)
  const generateQuiz = async () => {
    if (!topic || !file) return;
    setIsLoading(true);

    try {
      // Use authFetch (POST /generate-quiz)
      const response = await authFetch(`${API_BASE_URL}/generate-quiz`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: topic,
          filename: file.name,
        }),
      });

      if (!response.ok) throw new Error("Generation failed");

      const data = await response.json();

      if (data.questions && data.questions.length > 0) {
        setQuizData(data.questions);
        setStep(3);
      } else {
        alert("The AI couldn't find relevant info for this topic.");
      }
    } catch (error) {
      console.error(error);
      alert("Error generating quiz.");
    } finally {
      setIsLoading(false);
    }
  };

  // --- UI RENDERING (UNCHANGED LOGIC) ---
  const handleOptionSelect = (questionId, option) => {
    setUserAnswers((prev) => ({ ...prev, [questionId]: option }));
  };

  const submitQuiz = async () => {
    // 1. Calculate Score (Local Logic)
    let calculatedScore = 0;
    quizData.forEach((q) => {
      if (userAnswers[q.id] === q.correctAnswer) {
        calculatedScore += 1;
      }
    });
    setScore(calculatedScore);

    // 2. Save to DB (Async Logic)
    try {
      // Use authFetch to ensure the user-id header is included for security
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
      // We log the error but allow the user to proceed to results anyway
    }

    // 3. Move to Results Screen
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

  return (
    <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center p-4 font-sans relative overflow-hidden">
      {/* Background Ambience */}
      <div className="fixed top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 z-50" />
      <div className="fixed -top-40 -left-40 w-96 h-96 bg-indigo-500/20 rounded-full blur-[100px] pointer-events-none" />
      <div className="fixed bottom-0 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-2xl bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl p-8 shadow-2xl relative z-10">
        {/* Header */}
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

            <div className="w-full max-h-60 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
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
              onClick={generateQuiz}
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
          <div className="animate-in slide-in-from-right-8 duration-300">
            <div className="flex justify-between items-end mb-4 border-b border-white/10 pb-4">
              <h2 className="text-xl font-semibold text-white">Quiz Time</h2>
              <span className="text-xs text-gray-400 bg-white/5 px-2 py-1 rounded">
                Topic: {topic}
              </span>
            </div>

            <div className="space-y-6 max-h-[55vh] overflow-y-auto pr-2 custom-scrollbar">
              {quizData.map((q, index) => (
                <div
                  key={q.id || index}
                  className="bg-white/5 p-6 rounded-xl border border-white/5 hover:border-white/10 transition-colors"
                >
                  <h3 className="text-lg font-medium mb-4 text-gray-200">
                    <span className="text-indigo-400 mr-2 font-mono">
                      Q{index + 1}.
                    </span>
                    {q.question}
                  </h3>
                  <div className="space-y-2">
                    {q.options.map((option, optIndex) => (
                      <button
                        key={optIndex}
                        onClick={() => handleOptionSelect(q.id, option)}
                        className={`w-full text-left px-4 py-3 rounded-lg border transition-all duration-200 flex items-center justify-between group ${
                          userAnswers[q.id] === option
                            ? "bg-indigo-600/20 border-indigo-500 text-indigo-100"
                            : "bg-black/20 border-white/5 hover:bg-white/10 text-gray-400 hover:text-white"
                        }`}
                      >
                        <span>{option}</span>
                        {userAnswers[q.id] === option && (
                          <CheckCircle className="w-4 h-4 text-indigo-400" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-4 border-t border-white/10 bg-gray-950/80 backdrop-blur-sm sticky bottom-0">
              <button
                onClick={submitQuiz}
                disabled={Object.keys(userAnswers).length !== quizData.length}
                className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-full font-bold transition shadow-lg shadow-indigo-500/20"
              >
                Submit & See Score
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: RESULTS */}
        {/* STEP 4: RESULTS & REVIEW */}
        {step === 4 && (
          <div className="animate-in zoom-in duration-300 pb-8">
            {/* 1. Score Summary Header */}
            <div className="text-center mb-8 bg-white/5 p-6 rounded-2xl border border-white/10">
              <div className="relative inline-flex items-center justify-center w-32 h-32 mb-4">
                <svg className="w-full h-full -rotate-90 transform">
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    stroke="currentColor"
                    strokeWidth="8"
                    className="text-gray-800"
                    fill="none"
                  />
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    strokeDasharray={351}
                    strokeDashoffset={351 - (351 * score) / quizData.length}
                    strokeLinecap="round"
                    className={`transition-all duration-1000 ease-out ${
                      score / quizData.length >= 0.7
                        ? "text-green-500"
                        : "text-amber-500"
                    }`}
                  />
                </svg>
                <span className="absolute text-3xl font-bold text-white">
                  {Math.round((score / quizData.length) * 100)}%
                </span>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">
                {score / quizData.length >= 0.7 ? "Great Job!" : "Good Effort!"}
              </h2>
              <p className="text-gray-400">
                You scored {score} out of {quizData.length}
              </p>
            </div>

            {/* 2. Detailed Review List */}
            <div className="space-y-6 mb-8">
              <h3 className="text-xl font-bold text-white border-b border-white/10 pb-2">
                Detailed Review
              </h3>

              {quizData.map((q, index) => {
                const isCorrect = userAnswers[q.id] === q.correctAnswer;

                return (
                  <div
                    key={q.id || index}
                    className={`p-5 rounded-xl border ${
                      isCorrect
                        ? "bg-green-500/10 border-green-500/30"
                        : "bg-red-500/10 border-red-500/30"
                    }`}
                  >
                    <div className="flex items-start gap-3 mb-3">
                      {isCorrect ? (
                        <CheckCircle className="w-6 h-6 text-green-400 shrink-0 mt-1" />
                      ) : (
                        <AlertCircle className="w-6 h-6 text-red-400 shrink-0 mt-1" />
                      )}
                      <div>
                        <h4 className="text-lg font-medium text-gray-200">
                          <span className="opacity-50 mr-2">Q{index + 1}.</span>
                          {q.question}
                        </h4>
                      </div>
                    </div>

                    {/* Answer Comparison */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 text-sm">
                      <div
                        className={`p-3 rounded-lg ${
                          isCorrect
                            ? "bg-green-500/20"
                            : "bg-red-500/20 text-red-200"
                        }`}
                      >
                        <span className="block text-xs uppercase opacity-70 mb-1 font-bold">
                          Your Answer
                        </span>
                        {userAnswers[q.id]}
                      </div>
                      {!isCorrect && (
                        <div className="p-3 rounded-lg bg-green-500/20 text-green-200">
                          <span className="block text-xs uppercase opacity-70 mb-1 font-bold">
                            Correct Answer
                          </span>
                          {q.correctAnswer}
                        </div>
                      )}
                    </div>

                    {/* Explanation */}
                    {q.explanation && (
                      <div className="mt-4 pt-3 border-t border-white/10">
                        <p className="text-sm text-gray-300 leading-relaxed">
                          <span className="text-indigo-400 font-bold mr-2">
                            Why?
                          </span>
                          {q.explanation}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* 3. Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center sticky bottom-4 bg-gray-950/90 backdrop-blur-md p-4 rounded-full border border-white/10 shadow-2xl">
              <button
                onClick={resetApp}
                className="px-6 py-2 bg-white text-gray-900 hover:bg-gray-200 rounded-full font-bold transition flex items-center gap-2 text-sm"
              >
                <BookOpen className="w-4 h-4" /> New File
              </button>

              <button
                onClick={() => {
                  setStep(2); // Go back to topic
                  setQuizData([]);
                  setScore(0);
                  setUserAnswers({});
                }}
                className="px-6 py-2 bg-indigo-600 text-white hover:bg-indigo-500 rounded-full font-bold transition flex items-center gap-2 text-sm"
              >
                <RefreshCw className="w-4 h-4" /> New Topic
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuizAssistant;
