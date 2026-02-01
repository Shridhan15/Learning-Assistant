import React, { useState, useEffect } from "react";
import { useAuth, useUser } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";
import {
  BookOpen,
  Target,
  Layers,
  ArrowRight,
  AlertCircle,
  FileText,
  Sparkles,
  Library,
  Loader2,
} from "lucide-react";
import { getDisplayName } from "../utils/fileHelpers";

const ConceptTest = () => {
  const { getToken, userId } = useAuth();
  const { user } = useUser();
  const navigate = useNavigate();
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

  // Data State
  // Data Stateava
  const [availableFiles, setAvailableFiles] = useState([]);
  const [filesLoading, setFilesLoading] = useState(true);

  // User Selection State
  const [selectedFile, setSelectedFile] = useState(null); // Full file object or name
  const [selectedFileName, setSelectedFileName] = useState(""); // For UI tracking
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState("Medium");
  const [numQuestions, setNumQuestions] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch Files
  useEffect(() => {
    const fetchFiles = async () => {
      try {
        const res = await authFetch(`${API_BASE_URL}/files`);
        const data = await res.json();
        setAvailableFiles(data.files || []);
        setFilesLoading(false);
      } catch (err) {
        console.error("Failed to load library:", err);
      }
    };
    fetchFiles();
  }, [userId]);

  const handleSelectFromLibrary = (fname) => {
    setSelectedFileName(fname);
  };

  const handleStartSession = async () => {
    if (!selectedFileName || !topic) return;
    setIsSubmitting(true);

    // Simulate API Call delay (Replace with actual fetch later)
    setTimeout(() => {
      setIsSubmitting(false);
      navigate("/concept-test/session", {
        state: {
          fileName: selectedFileName,
          topic,
          difficulty,
          questionCount: numQuestions,
          mode: "conceptual",
        },
      });
    }, 1500);
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 text-white flex items-center justify-center p-4 md:p-6 font-sans relative overflow-hidden">
      {/* --- Background Effects --- */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />
      <div className="fixed top-10 left-20 w-72 h-72 bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none -z-10" />
      <div className="fixed bottom-20 right-20 w-96 h-96 bg-purple-600/10 rounded-full blur-[100px] pointer-events-none -z-10" />

      {/* --- Main Content Container --- */}
      <div className="relative z-10 w-full max-w-6xl h-[85vh] bg-slate-900/40 backdrop-blur-md border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row animate-in fade-in zoom-in duration-500">
        {/* --- LEFT SIDEBAR: LIBRARY --- */}
        <div className="w-full md:w-80 bg-slate-950/50 border-b md:border-b-0 md:border-r border-white/5 flex flex-col">
          {/* Sidebar Header */}
          <div className="p-6 border-b border-white/5">
            <div className="flex items-center gap-3 text-white mb-1">
              <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-400">
                <Library className="w-5 h-5" />
              </div>
              <h2 className="font-bold text-lg tracking-tight">Your Library</h2>
            </div>
            <p className="text-xs text-slate-500 ml-1">
              Select a document to test yourself
            </p>
          </div>

          {/* File List */}
          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-2">
            {filesLoading ? (
              <div className="flex items-center justify-center h-40 text-slate-500">
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                Loading...
              </div>
            ) : availableFiles.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-500 py-10 opacity-60">
                <BookOpen className="w-10 h-10 mb-3" />
                <p className="text-sm">No files yet</p>
              </div>
            ) : (
              availableFiles.map((fname) => (
                <button
                  key={fname}
                  onClick={() => handleSelectFromLibrary(fname)}
                  className={`cursor-pointer w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200 group text-left border relative overflow-hidden
                    ${
                      selectedFileName === fname
                        ? "bg-indigo-600/10 border-indigo-500/50 ring-1 ring-indigo-500/20"
                        : "bg-white/5 border-transparent hover:bg-white/10 hover:border-white/10"
                    }`}
                >
                  <div
                    className={`p-2 rounded-lg transition-colors ${
                      selectedFileName === fname
                        ? "bg-indigo-500 text-white"
                        : "bg-slate-800 text-slate-400 group-hover:text-indigo-400"
                    }`}
                  >
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4
                      className={`text-sm font-medium truncate ${
                        selectedFileName === fname
                          ? "text-indigo-100"
                          : "text-slate-300 group-hover:text-white"
                      }`}
                    >
                      {getDisplayName(fname, user?.id)}
                    </h4>
                  </div>
                  {selectedFileName === fname && (
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 shadow-[0_0_8px_rgba(129,140,248,0.8)]" />
                  )}
                </button>
              ))
            )}
          </div>

          {/* Bottom Info */}
          <div className="p-4 border-t border-white/5 text-center">
            <p className="text-[10px] text-slate-600">
              {availableFiles.length} Document
              {availableFiles.length !== 1 && "s"} Available
            </p>
          </div>
        </div>

        {/* --- RIGHT PANEL: CONFIGURATION --- */}
        <div className="flex-1 p-4 md:p-8 lg:p-10 overflow-y-auto custom-scrollbar flex flex-col no-scrollbar">
          <div className="mb-6">
            <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight mb-2">
              Concept Test Setup
            </h1>
            <p className="text-slate-400 text-lg leading-relaxed">
              Configure your session. The AI will challenge your understanding
              of specific topics found in{" "}
              <span className="text-indigo-400 font-medium bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                {getDisplayName(selectedFileName, user?.id) || "Your file"}
              </span>
              .
            </p>
          </div>

          <div className="flex-1 flex flex-col justify-center space-y-6 max-w-2xl">
            {/* Input: Topic */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                <Target className="w-4 h-4 text-indigo-400" />
                Focus Topic
              </label>
              <div className="relative group">
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. Photosynthesis, Supply Chain, Newton's Laws..."
                  className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-5 py-4 text-white placeholder-slate-600 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all text-lg shadow-inner group-hover:border-white/20"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                  <Sparkles className="w-4 h-4 text-slate-600" />
                </div>
              </div>
            </div>

            {/* Input: Difficulty & Count Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              {/* Difficulty */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-400" />
                  Complexity
                </label>
                <div className="flex bg-slate-950/50 p-1.5 rounded-xl border border-white/10">
                  {["Easy", "Medium", "Hard"].map((level) => (
                    <button
                      key={level}
                      onClick={() => setDifficulty(level)}
                      className={`
                                flex-1 py-2.5 rounded-lg text-sm font-medium transition-all duration-200
                                ${
                                  difficulty === level
                                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/25"
                                    : "text-slate-400 hover:text-white hover:bg-white/5"
                                }
                                `}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>

              {/* Question Count */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  Question Limit
                </label>
                <div className="flex items-center gap-4 bg-slate-950/50 border border-white/10 rounded-xl p-2 px-3">
                  <button
                    onClick={() =>
                      setNumQuestions(Math.max(1, numQuestions - 1))
                    }
                    className="w-10 h-10 rounded-lg bg-slate-800/50 text-white hover:bg-slate-700 flex items-center justify-center transition-colors border border-white/5"
                  >
                    -
                  </button>
                  <span className="flex-1 text-center font-mono text-xl font-bold text-white">
                    {numQuestions}
                  </span>
                  <button
                    onClick={() =>
                      setNumQuestions(Math.min(3, numQuestions + 1))
                    }
                    className="w-10 h-10 rounded-lg bg-slate-800/50 text-white hover:bg-slate-700 flex items-center justify-center transition-colors border border-white/5"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Footer / Action */}
          <div className="mt-10 pt-6 border-t border-white/5 flex items-center justify-between">
            <div className="hidden sm:block text-xs text-slate-500">
              Est. Session Time:{" "}
              <span className="text-slate-300">{numQuestions * 3} mins</span>
            </div>
            <button
              onClick={handleStartSession}
              disabled={!topic || !selectedFileName || isSubmitting}
              className={`
                    flex items-center gap-3 px-8 py-4 rounded-xl font-bold text-lg shadow-xl transition-all w-full sm:w-auto justify-center
                    ${
                      !topic || !selectedFileName
                        ? "bg-slate-800/50 text-slate-600 cursor-not-allowed border border-white/5"
                        : "bg-indigo-600 hover:bg-indigo-500 text-white hover:scale-[1.02] hover:shadow-indigo-500/25 ring-1 ring-white/10"
                    }
                  `}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  Begin Session <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConceptTest;
