import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@clerk/clerk-react";
import {
  Send,
  Bot,
  User,
  FileText,
  Sparkles,
  Loader2,
  ChevronRight,
  MessageSquare,
} from "lucide-react";

const Tutor = () => {
  const { getToken, userId } = useAuth();

  const [files, setFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [messages, setMessages] = useState([]); 
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [filesLoading, setFilesLoading] = useState(true);

  const messagesEndRef = useRef(null);
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);
  const loadChatHistory = async (filename) => {
    setLoading(true);
    setMessages([]); 
    try {
      const token = await getToken();
      const response = await fetch(
        `http://127.0.0.1:8000/chat_history?filename=${filename}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "user-id": userId,
          },
        }
      );
      const data = await response.json();
      setMessages(data.history || []);
    } catch (error) {
      console.error("Error loading history:", error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Files
  useEffect(() => {
    const fetchFiles = async () => {
      try {
        const token = await getToken();
        const response = await fetch("http://127.0.0.1:8000/files", {
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

  // Handle Send
  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || !selectedFile) return;

    const userMessage = input;
    setInput("");

    // 1. Optimistic Update
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setLoading(true);

    try {
      const token = await getToken();
      const response = await fetch("http://127.0.0.1:8000/chat", {
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

      // 2. Add AI Response
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.response },
      ]);
    } catch (error) {
      console.error(error);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Error connecting to AI Tutor." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-64px)] pt-16 bg-gray-950">
      {/* SIDEBAR */}
      <div className="w-80 bg-gray-900 border-r border-white/10 flex flex-col hidden md:flex">
        <div className="p-4 border-b border-white/5">
          <h2 className="text-white font-bold flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-400" />
            Your Library
          </h2>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2 no-scrollbar">
          {filesLoading ? (
            <div className="flex justify-center p-4">
              <Loader2 className="w-5 h-5 animate-spin text-gray-500" />
            </div>
          ) : files.length === 0 ? (
            <p className="text-sm text-gray-500 text-center">No files found.</p>
          ) : (
            files.map((file) => (
              <button
                key={file}
                onClick={() => {
                  setSelectedFile(file);
                  loadChatHistory(file);
                }}
                className={`w-full text-left p-3 rounded-lg text-sm transition-all flex items-center justify-between group ${
                  selectedFile === file
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20"
                    : "text-gray-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                <span className="truncate w-56">{file}</span>
                {selectedFile === file && <ChevronRight className="w-4 h-4" />}
              </button>
            ))
          )}
        </div>
      </div>

      {/* CHAT AREA */}
      <div className="flex-1 flex flex-col bg-gray-950 relative">
        {selectedFile && (
          <div className="absolute top-0 left-0 right-0 p-4 bg-gray-950/80 backdrop-blur border-b border-white/5 z-10 flex items-center gap-3">
            <div className="p-2 bg-indigo-500/20 rounded-lg">
              <Bot className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h3 className="text-white font-bold text-sm">AI Tutor</h3>
              <p className="text-xs text-gray-400">Context: {selectedFile}</p>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 pt-20 no-scrollbar">
          {!selectedFile ? (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-50">
              <MessageSquare className="w-10 h-10 text-indigo-400 mb-4" />
              <h2 className="text-2xl font-bold text-white">Select a Book</h2>
            </div>
          ) : messages.length === 0 ? (
            <div className="mt-10 text-center text-gray-500 text-sm">
              Start asking about{" "}
              <span className="text-indigo-400">{selectedFile}</span>
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
                  className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                    msg.role === "user" ? "bg-indigo-600" : "bg-emerald-600"
                  }`}
                >
                  {msg.role === "user" ? (
                    <User className="w-4 h-4 text-white" />
                  ) : (
                    <Sparkles className="w-4 h-4 text-white" />
                  )}
                </div>
                <div
                  className={`max-w-[80%] p-4 rounded-2xl text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-indigo-600 text-white rounded-tr-none"
                      : "bg-white/10 text-gray-200 rounded-tl-none border border-white/5"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))
          )}
          {loading && (
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div className="bg-white/5 px-4 py-3 rounded-2xl rounded-tl-none border border-white/5 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                <span className="text-xs text-gray-400">Analyzing...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 bg-gray-900 border-t border-white/10">
          <form
            onSubmit={handleSend}
            className="max-w-4xl mx-auto relative flex gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={!selectedFile || loading}
              placeholder={
                selectedFile ? "Ask a question..." : "Select a file first"
              }
              className="flex-1 bg-gray-950 text-white rounded-xl border border-white/10 px-4 py-3 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
            <button
              type="submit"
              disabled={!selectedFile || loading || !input.trim()}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2"
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
