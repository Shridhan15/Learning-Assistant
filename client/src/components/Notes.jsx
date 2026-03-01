import React, { useEffect, useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import {
  FileText,
  Calendar,
  Brain,
  ChevronRight,
  BookOpen,
  Loader2,
  Search,
} from "lucide-react";
import { getDisplayName } from "../utils/fileHelpers";

import { useUser } from "@clerk/clerk-react";

const Notes = () => {
  const { getToken, userId } = useAuth();
  const { user } = useUser();
  const API_BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

  const [notesByFile, setNotesByFile] = useState({});
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNotes = async () => {
      try {
        const token = await getToken();
        const res = await fetch(`${API_BASE_URL}/get-notes`, {
          headers: { Authorization: `Bearer ${token}`, "user-id": userId },
        });
        if (!res.ok) {
          const errorText = await res.text();
          console.error("Server returned an error page:", errorText);
          return;
        }
        const data = await res.json();

        // --- GROUPING LOGIC ---
        const grouped = data.notes.reduce((acc, note) => {
          if (!acc[note.file_name]) acc[note.file_name] = [];
          acc[note.file_name].push(note);
          return acc;
        }, {});

        setNotesByFile(grouped);
        // Default to the first file if available
        if (Object.keys(grouped).length > 0) {
          setSelectedFile(Object.keys(grouped)[0]);
        }
      } catch (err) {
        console.error("Error fetching notes:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchNotes();
  }, []);

  if (loading)
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );

  return (
    <div className="flex flex-col h-full w-full bg-gray-900/20 text-white overflow-hidden border border-white/10 rounded-3xl backdrop-blur-sm">
      <div className="flex items-center justify-end p-4 pb-0 shrink-0">
        <div className="flex items-center gap-2 bg-indigo-500/10 px-3 py-1.5 rounded-full border border-indigo-500/20">
          <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
          <span className="text-xs font-medium text-indigo-300">
            {Object.keys(notesByFile).length} Modules
          </span>
        </div>
      </div>

      <div className="flex gap-4 flex-1 min-h-0">
        <div className="w-56 flex flex-col gap-1.5 overflow-y-auto no-scrollbar shrink-0">
          {Object.keys(notesByFile).map((fileName) => (
            <button
              key={fileName}
              onClick={() => setSelectedFile(fileName)}
              className={` cursor-pointer group flex items-center justify-between p-3 rounded-xl transition-all duration-300 border ${
                selectedFile === fileName
                  ? "bg-indigo-600 border-indigo-400 shadow-lg"
                  : "bg-gray-900/40 border-white/5 hover:border-white/20"
              }`}
            >
              <span
                className={`text-xs font-medium truncate ${selectedFile === fileName ? "text-white" : "text-gray-400"}`}
              >
                {getDisplayName(fileName, user?.id)}
              </span>
              <ChevronRight
                className={`w-3 h-3 transition-transform ${selectedFile === fileName ? "rotate-90 text-white" : "text-gray-600"}`}
              />
            </button>
          ))}
        </div>

        <div className="flex-1 bg-gray-900/20 rounded-2xl border border-white/5 overflow-y-auto no-scrollbar">
          {selectedFile ? (
            <div className="max-w-2xl mx-auto py-2 px-4 space-y-4">
              {notesByFile[selectedFile].map((note) => (
                <div
                  key={note.id}
                  className="group relative bg-gray-900/60 border border-white/5 rounded-2xl p-5 hover:border-indigo-500/30 transition-all duration-500"
                >
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-bold text-white group-hover:text-indigo-300 transition-colors">
                      {note.title}
                    </h3>
                    <div className="flex items-center gap-1.5 text-gray-500 text-[10px] uppercase tracking-wider">
                      <Calendar className="w-3 h-3" />
                      {new Date(note.created_at).toLocaleDateString()}
                    </div>
                  </div>

                  <div className="grid gap-2">
                    {note.key_points.map((point, i) => (
                      <div
                        key={i}
                        className="flex gap-3 p-2.5 rounded-xl bg-white/5 border border-transparent hover:border-white/5 transition-all"
                      >
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0 shadow-[0_0_5px_rgba(99,102,241,0.6)]" />
                        <p className="text-gray-300 leading-snug text-sm">
                          {point}
                        </p>
                      </div>
                    ))}
                  </div>

                  {note.struggle_area && (
                    <div className="mt-4 flex items-start gap-3 p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl">
                      <Brain className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                      <div>
                        <span className="text-[9px] font-black text-amber-500 uppercase tracking-widest">
                          Focus Area
                        </span>
                        <p className="text-xs text-amber-200/80 mt-0.5 italic">
                          "{note.struggle_area}"
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center opacity-20">
              <Search className="w-12 h-12 mb-2" />
              <p className="text-sm font-medium">Select a module</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Notes;
