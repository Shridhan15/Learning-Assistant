import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@clerk/clerk-react";
import {
  Send,
  Bot,
  User,
  Book,
  Sparkles,
  Loader2,
  MessageSquare,
  Library,
  FileText,
  Github,
  Linkedin,
  Globe,
  Heart,
  Code,
  X,
} from "lucide-react";
import { useUser } from "@clerk/clerk-react";
import { getDisplayName } from "../utils/fileHelpers";
import Typewriter from "../components/Typewriter";

const Tutor = () => {
  const { getToken, userId } = useAuth();
  const { user } = useUser();
  const API_BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

  // State
  const [files, setFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // --- STATE SPLIT ---
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [filesLoading, setFilesLoading] = useState(true);

  // Auto-scroll  
  const chatContainerRef = useRef(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    const el = chatContainerRef.current;
    if (!el) return;
 
    el.scrollTo({
      top: el.scrollHeight,
      behavior: "smooth",
    });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  // Fetch Files
  useEffect(() => {
    const fetchFiles = async () => {
      try {
        const token = await getToken();
        const response = await fetch(`${API_BASE_URL}/files`, {
          headers: { Authorization: `Bearer ${token}`, "user-id": userId },
        });
        const data = await response.json();
        setFiles(data.files || []);
      } catch (error) {
        console.error("Error fetching files:", error);
      } finally {
        setFilesLoading(false);
      }
    };
    fetchFiles();
  }, []);

  // Load History
  const loadChatHistory = async (filename) => {
    setHistoryLoading(true);
    setMessages([]);
    try {
      const token = await getToken();
      const response = await fetch(
        `${API_BASE_URL}/chat_history?filename=${filename}`,
        {
          headers: { Authorization: `Bearer ${token}`, "user-id": userId },
        },
      );
      const data = await response.json();

      const historyWithFlags = (data.history || []).map((msg) => ({
        ...msg,
        isNew: false,
      }));

      setMessages(historyWithFlags);
    } catch (error) {
      console.error("Error loading history:", error);
    } finally {
      setHistoryLoading(false);
    }
  };

  // Handle Send
  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || !selectedFile) return;

    const userMessage = input;
    setInput("");

    setMessages((prev) => [
      ...prev,
      { role: "user", content: userMessage, isNew: true },
    ]);
    setLoading(true);

    try {
      const token = await getToken();
      const response = await fetch(`${API_BASE_URL}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "user-id": userId,
        },
        body: JSON.stringify({
          message: userMessage,
          filename: selectedFile,
        }),
      });
      const data = await response.json();
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.response,
          isNew: true,
        },
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Error connecting to AI Tutor." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed top-16 left-0 right-0 bottom-0 flex overflow-hidden bg-gray-950 z-0">
      {/* --- DESKTOP SIDEBAR --- */}
      <div className="w-80 bg-gray-900/50 border-r border-white/10 flex flex-col hidden md:flex backdrop-blur-sm">
        {/* Sidebar Header */}
        <div className="p-5 border-b border-white/5 shrink-0">
          <h2 className="text-white font-bold flex items-center gap-3 text-lg">
            <div className="p-2 bg-indigo-500/20 rounded-lg">
              <Library className="w-5 h-5 text-indigo-400" />
            </div>
            Library
          </h2>
          <p className="text-xs text-gray-500 mt-2 ml-1">
            Select a book to start learning
          </p>
        </div>

        {/* File List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 no-scrollbar">
          {filesLoading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
            </div>
          ) : files.length === 0 ? (
            <div className="text-center p-8 text-gray-500 text-sm border border-dashed border-white/10 rounded-xl m-2">
              No books found
            </div>
          ) : (
            files.map((file) => (
              <button
                key={file}
                onClick={() => {
                  if (selectedFile !== file) {
                    setSelectedFile(file);
                    loadChatHistory(file);
                  }
                }}
                className={`cursor-pointer w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200 group text-left border relative overflow-hidden
                ${
                  selectedFile === file
                    ? "bg-indigo-600/10 border-indigo-500/50 ring-1 ring-indigo-500/20"
                    : "bg-white/5 border-transparent hover:bg-white/10 hover:border-white/10"
                }`}
              >
                <div
                  className={`p-2 rounded-lg transition-colors ${
                    selectedFile === file
                      ? "bg-indigo-500 text-white"
                      : "bg-slate-800 text-slate-400 group-hover:text-indigo-400"
                  }`}
                >
                  <FileText className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4
                    className={`text-sm font-medium truncate ${
                      selectedFile === file
                        ? "text-indigo-100"
                        : "text-slate-300 group-hover:text-white"
                    }`}
                  >
                    {getDisplayName(file, user?.id)}
                  </h4>
                </div>
                {file === selectedFile && (
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 shadow-[0_0_8px_rgba(129,140,248,0.8)]" />
                )}
              </button>
            ))
          )}
        </div>

        {/* Sidebar Footer */}
        <div className="p-5 border-t border-white/5 bg-gray-900/30">
          <div className="text-center space-y-1">
            <p className="text-xs text-gray-400 flex items-center justify-center gap-1">
              Made by{" "}
              <span className="text-indigo-400 font-medium">Shridhan</span>
            </p>
            <p className="text-[10px] text-gray-600">
              © 2026 AI StudyMate Project
            </p>
          </div>
        </div>
      </div>

      {/* --- MOBILE SIDEBAR --- */} 
      {isMobileSidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed inset-y-0 left-0 z-40 w-72 bg-gray-900/95 border-r border-white/10 flex flex-col transform transition-transform duration-200 md:hidden ${
          isMobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Sidebar Header */}
        <div className="p-4 border-b border-white/5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/20 rounded-lg">
              <Library className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-white font-bold text-base">Library</h2>
              <p className="text-[11px] text-gray-500">
                Select a book to start learning
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsMobileSidebarOpen(false)}
            className="cursor-pointer p-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* File List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 no-scrollbar">
          {filesLoading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
            </div>
          ) : files.length === 0 ? (
            <div className="text-center p-8 text-gray-500 text-sm border border-dashed border-white/10 rounded-xl m-2">
              No books found
            </div>
          ) : (
            files.map((file) => (
              <button
                key={file}
                onClick={() => {
                  if (selectedFile !== file) {
                    setSelectedFile(file);
                    loadChatHistory(file);
                  } 
                  setIsMobileSidebarOpen(false);
                }}
                className={`cursor-pointer w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200 group text-left border relative overflow-hidden
                ${
                  selectedFile === file
                    ? "bg-indigo-600/10 border-indigo-500/50 ring-1 ring-indigo-500/20"
                    : "bg-white/5 border-transparent hover:bg-white/10 hover:border-white/10"
                }`}
              >
                <div
                  className={`p-2 rounded-lg transition-colors ${
                    selectedFile === file
                      ? "bg-indigo-500 text-white"
                      : "bg-slate-800 text-slate-400 group-hover:text-indigo-400"
                  }`}
                >
                  <FileText className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4
                    className={`text-sm font-medium truncate ${
                      selectedFile === file
                        ? "text-indigo-100"
                        : "text-slate-300 group-hover:text-white"
                    }`}
                  >
                    {getDisplayName(file, user?.id)}
                  </h4>
                </div>
                {file === selectedFile && (
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 shadow-[0_0_8px_rgba(129,140,248,0.8)]" />
                )}
              </button>
            ))
          )}
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-white/5 bg-gray-900/80">
          <div className="text-center space-y-1">
            <p className="text-[11px] text-gray-400 flex items-center justify-center gap-1">
              Made by{" "}
              <span className="text-indigo-400 font-medium">Shridhan</span>
            </p>
            <p className="text-[10px] text-gray-600">
              © 2026 AI StudyMate Project
            </p>
          </div>
        </div>
      </div>

      {/* --- RIGHT PANEL  --- */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-gray-950 relative">
        {/* Header */}
        {selectedFile && (
          <div className="h-16 px-4 sm:px-6 border-b border-white/5 bg-gray-900/60 backdrop-blur-md flex items-center justify-between shrink-0 z-20">
            <div className="flex items-center gap-3">
              {/* Mobile: Library button */}
              <button
                type="button"
                className="cursor-pointer mr-1 p-2 rounded-lg bg-gray-800/70 text-gray-200 hover:bg-gray-700/80 md:hidden"
                onClick={() => setIsMobileSidebarOpen(true)}
              >
                <Library className="w-4 h-4" />
              </button>

              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-white font-bold text-sm tracking-wide">
                  AI Tutor
                </h3>
                <div className="flex items-center gap-1.5 opacity-60">
                  <Book className="w-3 h-3 text-indigo-400" />
                  <p className="text-xs text-gray-300 truncate max-w-[140px] sm:max-w-[200px]">
                    {getDisplayName(selectedFile, user?.id)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Messages */}
        <div
          ref={chatContainerRef}
          className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-6 scroll-smooth no-scrollbar"
        >
          {!selectedFile ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8">
              <div className="w-20 h-20 bg-gray-900 rounded-2xl flex items-center justify-center mb-6 ring-4 ring-gray-900 ring-offset-2 ring-offset-indigo-500/20">
                <MessageSquare className="w-9 h-9 text-indigo-400" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-3">
                Welcome to AI Tutor
              </h2>
              <p className="text-gray-400 max-w-sm leading-relaxed text-sm">
                Select a document from the sidebar to ask questions, get
                summaries, or clarify complex topics.
              </p>
              {/* Mobile CTA to open sidebar */}
              <button
                type="button"
                onClick={() => setIsMobileSidebarOpen(true)}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-600 text-white text-xs font-medium shadow-lg shadow-indigo-600/30 md:hidden"
              >
                <Library className="w-4 h-4" />
                Open Library
              </button>
            </div>
          ) : historyLoading ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500 gap-3">
              <Loader2 className="w-7 h-7 animate-spin text-indigo-500" />
              <p className="text-sm font-medium">Loading conversation...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500 space-y-4">
              <Bot className="w-10 h-10 text-gray-800" />
              <p className="text-sm text-center px-4">
                Start the conversation about{" "}
                <span className="text-indigo-400 font-medium">
                  {getDisplayName(selectedFile, user?.id)}
                </span>
              </p>
            </div>
          ) : (
            messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex gap-4 ${
                  msg.role === "user" ? "flex-row-reverse" : ""
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-lg ${
                    msg.role === "user"
                      ? "bg-indigo-600 ring-2 ring-gray-950"
                      : "bg-emerald-600 ring-2 ring-gray-950"
                  }`}
                >
                  {msg.role === "user" ? (
                    <User className="w-4 h-4 text-white" />
                  ) : (
                    <Sparkles className="w-4 h-4 text-white" />
                  )}
                </div>
                <div
                  className={`max-w-[85%] sm:max-w-[75%] px-5 py-3.5 rounded-2xl text-sm leading-relaxed shadow-md ${
                    msg.role === "user"
                      ? "bg-indigo-600 text-white rounded-tr-none"
                      : "bg-gray-800/80 text-gray-200 rounded-tl-none border border-white/5"
                  }`}
                >
                  {msg.role !== "user" &&
                  msg.isNew &&
                  idx === messages.length - 1 ? (
                    <Typewriter text={msg.content} speed={15} />
                  ) : (
                    <span className="whitespace-pre-wrap">{msg.content}</span>
                  )}
                </div>
              </div>
            ))
          )}
          {loading && (
            <div className="flex gap-4 animate-pulse">
              <div className="w-8 h-8 rounded-full bg-emerald-600/50 flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4 text-white/50" />
              </div>
              <div className="bg-gray-800/50 px-4 py-3 rounded-2xl rounded-tl-none border border-white/5 flex items-center gap-3">
                <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                <span className="text-xs text-gray-400">AI is thinking...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-3 sm:p-4 bg-gray-950 border-t border-white/5 shrink-0 z-20">
          <form
            onSubmit={handleSend}
            className="max-w-2xl mx-auto flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={!selectedFile || loading}
              placeholder={
                selectedFile
                  ? "Ask anything about selected file"
                  : "Select a file to start chatting"
              }
              className="flex-1 bg-gray-900/70 text-white rounded-lg border border-white/10 px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 placeholder:text-gray-500 shadow-inner"
            />
            <button
              type="submit"
              disabled={!selectedFile || loading || !input.trim()}
              className="cursor-pointer p-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 active:scale-95"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Tutor;
