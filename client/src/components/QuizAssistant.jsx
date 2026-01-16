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
  Sparkle,
  Library,
  Sparkles,
  Target,
  Brain,
  ArrowRight,
} from "lucide-react";
import { useLocation } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";

import QuizViewer from "./QuizViewer";
import QuizResults from "./QuizResults";
import { generateQuizApi } from "../services/quizService";
import { getDisplayName } from "../utils/fileHelpers";

const QuizAssistant = ({ getToken, userId }) => {
  const location = useLocation();
  const { user } = useUser();

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

  const API_BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

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
    <div className="min-h-screen w-full bg-slate-950 text-white flex items-center justify-center p-4  md:p-8 font-sans relative overflow-hidden">
      {/* --- Background Effects --- */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />
      <div className="fixed  top-10 left-20 w-72 h-72 bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none -z-10" />
      <div className="fixed bottom-20 right-20 w-96 h-96 bg-purple-600/10 rounded-full blur-[100px] pointer-events-none -z-10" />

      {/* --- Main Glass Container (Split Layout) --- */}
      <div className="w-full max-w-6xl h-[85vh] bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl relative z-10 overflow-hidden flex flex-col md:flex-row ring-1 ring-white/5 animate-in fade-in zoom-in duration-500">
        <div className="w-full md:w-60 lg:w-80 bg-slate-950/50 border-b md:border-b-0 md:border-r border-white/5 flex flex-col">
          {/* Sidebar Header */}
          <div className="p-6 border-b border-white/5">
            <div className="flex items-center gap-3 text-white mb-1">
              <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-400">
                <Library className="w-5 h-5" />
              </div>
              <h2 className="font-bold text-lg tracking-tight">Your Library</h2>
            </div>
            <p className="text-xs text-slate-500 ml-1">
              Select a document to quiz yourself
            </p>
          </div>

          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-2">
            {availableFiles.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-500 py-10 opacity-60">
                <BookOpen className="w-10 h-10 mb-3" />
                <p className="text-sm">No files yet</p>
              </div>
            ) : (
              availableFiles.map((fname) => (
                <button
                  key={fname}
                  onClick={() => handleSelectFromLibrary(fname)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200 group text-left border relative overflow-hidden
                    ${
                      file?.name === fname
                        ? "bg-indigo-600/10 border-indigo-500/50 ring-1 ring-indigo-500/20"
                        : "bg-white/5 border-transparent hover:bg-white/10 hover:border-white/10"
                    }`}
                >
                  <div
                    className={`p-2 rounded-lg transition-colors ${
                      file?.name === fname
                        ? "bg-indigo-500 text-white"
                        : "bg-slate-800 text-slate-400 group-hover:text-indigo-400"
                    }`}
                  >
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4
                      className={`text-sm font-medium truncate ${
                        file?.name === fname
                          ? "text-indigo-100"
                          : "text-slate-300 group-hover:text-white"
                      }`}
                    >
                      {getDisplayName(fname, user?.id)}
                    </h4>
                    <p className="text-[10px] text-slate-500 truncate mt-0.5">
                      PDF Document
                    </p>
                  </div> 
                  {file?.name === fname && (
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 shadow-[0_0_8px_rgba(129,140,248,0.8)]" />
                  )}
                </button>
              ))
            )}
          </div>

          {/* Bottom Info (Optional) */}
          <div className="p-4 border-t border-white/5 text-center">
            <p className="text-[10px] text-slate-600">
              {availableFiles.length} Document
              {availableFiles.length !== 1 && "s"} Available
            </p>
          </div>
        </div>

        {/* =========================================================
            RIGHT CONTENT: UPLOAD & QUIZ
           ========================================================= */}
        <div className="flex-1 flex flex-col h-full relative overflow-y-auto custom-scrollbar">
          {/* Decorative Header Background */}
          <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-indigo-500/5 to-transparent pointer-events-none" />

          <div className="flex-1 p-2 md:p-10 lg:p-12 max-w-4xl mx-auto w-full z-10 flex flex-col justify-center">
            {/* Header (Only show on Step 1 & 2) */}
            {(step === 1 || step === 2) && (
              <div className="mb-8 text-center md:text-left">
                <h1 className="text-3xl font-bold text-white mb-2 flex items-center justify-center md:justify-start gap-3">
                  AI Quiz Master{" "}
                  <Sparkles className="w-5 h-5 text-indigo-400" />
                </h1>
                <p className="text-slate-400 text-sm">
                  {step === 1
                    ? "Start by uploading a new PDF or selecting one from the left."
                    : "Configure your quiz settings below."}
                </p>
              </div>
            )}

            {/* STEP 1: UPLOAD AREA */}
            {step === 1 && (
              <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="group relative w-full h-64 md:h-80 rounded-3xl border-2 border-dashed border-white/10 hover:border-indigo-500/50 bg-slate-900/50 hover:bg-indigo-500/5 transition-all duration-300 cursor-pointer flex flex-col items-center justify-center overflow-hidden">
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handleFileUpload}
                    disabled={isUploading}
                    className="absolute inset-0 opacity-0 cursor-pointer z-20"
                  />

                  {/* Animated Rings */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none">
                    <div className="w-48 h-48 rounded-full border border-indigo-500/20 animate-ping absolute" />
                    <div className="w-64 h-64 rounded-full border border-indigo-500/10 animate-ping animation-delay-200 absolute" />
                  </div>

                  <div className="relative z-10 flex flex-col items-center transform group-hover:-translate-y-2 transition-transform duration-300">
                    {isUploading ? (
                      <div className="flex flex-col items-center">
                        <Loader2 className="w-12 h-12 text-indigo-400 animate-spin mb-4" />
                        <span className="text-indigo-300 font-medium">
                          Processing File...
                        </span>
                      </div>
                    ) : (
                      <>
                        <div className="p-5 bg-slate-800 rounded-full mb-6 shadow-2xl group-hover:shadow-[0_0_25px_rgba(99,102,241,0.4)] transition-shadow">
                          <Upload className="w-8 h-8 text-indigo-400" />
                        </div>
                        <p className="text-xl font-semibold text-white mb-2">
                          Upload PDF Document
                        </p>
                        <p className="text-slate-500 text-sm max-w-xs text-center">
                          Drag and drop your file here, or click to browse your
                          computer
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: TOPIC SELECTION */}
            {step === 2 && (
              <div className="w-full max-w-2xl animate-in slide-in-from-right-8 duration-300">
                {/* File Badge */}
                <div className="flex items-center gap-2 bg-indigo-950/40 p-4 rounded-xl border border-indigo-500/20 mb-8">
                  <div className="w-12 h-12 bg-indigo-500/20 rounded-lg flex items-center justify-center text-indigo-400 shrink-0">
                    <CheckCircle className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-indigo-300 font-bold uppercase tracking-wider">
                      Active Document
                    </p>
                    <p className="text-white font-medium truncate">
                      {getDisplayName(file?.name, user?.id)}
                    </p>
                  </div>
                  <button
                    onClick={() => setStep(1)}
                    className="cursor-pointer text-xs text-slate-400 hover:text-white underline px-2"
                  >
                    Change
                  </button>
                </div>

                {/* Input */}
                <div className="space-y-3 mb-8">
                  <label className="text-sm font-medium text-slate-300 ml-1">
                    Quiz Topic 
                  </label>
                  <div className="relative">
                    <Target className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                    <input
                      type="text"
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      placeholder="e.g. Chapter 1, Summary, or Specific Concept..."
                      className="w-full bg-slate-950 border border-white/10 rounded-xl pl-12 pr-4 py-4 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 outline-none text-white placeholder-slate-600 transition-all"
                    />
                  </div>
                </div>

                {/* Action Button */}
                <button
                  onClick={() => generateQuiz()}
                  disabled={!topic || isLoading}
                  className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 rounded-xl font-bold text-lg shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_30px_rgba(79,70,229,0.5)] transition-all flex items-center justify-center gap-3"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" /> Generating...
                    </>
                  ) : (
                    <>
                      <Brain className="w-5 h-5" /> Generate Quiz{" "}
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </div>
            )}

            {/* STEP 3 & 4: QUIZ & RESULTS */}
            {(step === 3 || step === 4) && (
              <div className="w-full h-full flex flex-col animate-in fade-in duration-500">
                {step === 3 && (
                  /* Pass props to your QuizViewer component */
                  <QuizViewer
                    quizData={quizData}
                    userAnswers={userAnswers}
                    handleOptionSelect={handleOptionSelect}
                    submitQuiz={submitQuiz}
                    topic={topic}
                  />
                )}
                {step === 4 && (
                  /* Pass props to your QuizResults component */
                  <QuizResults
                    quizData={quizData}
                    userAnswers={userAnswers}
                    score={score}
                    onNewFile={resetApp}
                    onNewTopic={restartTopic}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuizAssistant;
