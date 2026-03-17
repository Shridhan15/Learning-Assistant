import React, { useMemo } from "react";

export default function LearningPathCard({ path, onSelect }) {
  // roadmap might be string from DB (Supabase) → convert to JSON safely
  const roadmap = useMemo(() => {
    if (!path.roadmap) return null;
    try {
      return typeof path.roadmap === "string"
        ? JSON.parse(path.roadmap)
        : path.roadmap;
    } catch (error) {
      console.error("Error parsing roadmap JSON:", error);
      return null;
    }
  }, [path.roadmap]);

  if (!roadmap) {
    return (
      <div className="border border-red-900/50 rounded-2xl p-6 bg-red-950/20 backdrop-blur-sm">
        <h3 className="font-semibold text-red-400">
          {path.goal || "Unknown Path"}
        </h3>
        <p className="text-red-500/80 text-sm italic mt-2">
          ⚠️ Failed to load roadmap data.
        </p>
      </div>
    );
  }

  const firstWeek = roadmap?.weeks?.[0];

  return (
    <div className="group relative border border-white/10 rounded-2xl p-6 bg-[#0f111a] hover:border-blue-500/50 hover:shadow-[0_0_20px_rgba(59,130,246,0.15)] transition-all duration-300 flex flex-col justify-between overflow-hidden">
      {/* Subtle Gradient Glow Top Right */}
      <div className="absolute -top-10 -right-10 w-24 h-24 bg-blue-600/10 blur-3xl rounded-full group-hover:bg-blue-600/20 transition-colors" />

      <div>
        <div className="flex justify-between items-center mb-5">
          <span className="px-3 py-1 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-bold rounded-full uppercase tracking-widest">
            {path.experience}
          </span>
          <span className="text-gray-500 text-xs font-medium flex items-center">
            <span className="mr-1.5 opacity-60">📅</span> {path.duration}
          </span>
        </div>

        <h3 className="text-xl font-bold text-white mb-3 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-blue-400 group-hover:to-purple-400 transition-all duration-300">
          {path.goal}
        </h3>

        <div className="space-y-3 mb-6">
          <div className="flex items-center text-sm text-gray-400">
            <span className="mr-3 text-blue-400/80">⏱️</span>
            <span className="font-medium text-gray-300">
              {path.time_per_day}
            </span>{" "}
            <span className="ml-1 opacity-70">daily</span>
          </div>
          <div className="flex items-center text-sm text-gray-400">
            <span className="mr-3 text-purple-400/80">📚</span>
            <span className="font-medium text-gray-300">
              {roadmap.weeks?.length || 0}
            </span>{" "}
            <span className="ml-1 opacity-70">Modules</span>
          </div>
        </div>

        {firstWeek && (
          <div className="bg-white/[0.03] border border-white/5 rounded-xl p-4 mb-6 group-hover:bg-white/[0.05] transition-colors">
            <p className="text-[10px] font-black text-gray-500 uppercase tracking-tighter mb-2">
              Preview: Week 1
            </p>
            <p className="text-sm font-medium text-gray-200 truncate leading-relaxed">
              {firstWeek.title}
            </p>
          </div>
        )}
      </div>

      <button
        onClick={() => onSelect(path)}
        className="cursor-pointer w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold text-sm tracking-wide hover:from-blue-500 hover:to-indigo-500 active:scale-[0.98] transition-all shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2"
      >
        View Full Roadmap
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="9 5l7 7-7 7"
          />
        </svg>
      </button>
    </div>
  );
}
