import React, { useEffect, useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import LearningPathCard from "../components/LearningPathCard";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

export default function LearningPaths() {
  const { getToken, userId } = useAuth();
  const [paths, setPaths] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedPath, setSelectedPath] = useState(null);

  // Form States
  const [goal, setGoal] = useState("");
  const [experience, setExperience] = useState("Beginner");
  const [time, setTime] = useState("1 hour");
  const [duration, setDuration] = useState("8 weeks");

  const fetchPaths = async () => {
    try {
      const token = await getToken();
      const response = await fetch(`${API_BASE_URL}/learning-paths`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "user-id": userId,
        },
      });
      const data = await response.json();
      if (Array.isArray(data)) setPaths(data);
      else if (data.data && Array.isArray(data.data)) setPaths(data.data);
    } catch (error) {
      console.error("Failed to fetch learning paths", error);
    }
  };

  useEffect(() => {
    if (userId) fetchPaths();
  }, [userId]);

  const createLearningPath = async () => {
    if (!goal) return alert("Please enter a learning goal");
    setLoading(true);
    try {
      const token = await getToken();
      const response = await fetch(`${API_BASE_URL}/learning-paths/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "user-id": userId,
        },
        body: JSON.stringify({
          goal,
          experience,
          time_per_day: time,
          duration,
        }),
      });
      if (!response.ok) throw new Error("Generation failed");
      const newPath = await response.json();
      setPaths((prev) => [newPath, ...prev]);
      setShowForm(false);
      setGoal("");
    } catch (error) {
      alert("Failed to generate learning path");
    } finally {
      setLoading(false);
    }
  };

  if (selectedPath) {
    return (
      <RoadmapDetailView
        path={selectedPath}
        onBack={() => setSelectedPath(null)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#05060f] text-white pt-12 px-6 pb-20">
      <div className="max-w-6xl mx-auto">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-6">
          <div>
            <h1 className="text-4xl font-black tracking-tight bg-gradient-to-r from-white to-gray-500 bg-clip-text text-transparent">
              My Learning Paths
            </h1>
            <p className="text-blue-400/60 mt-2 font-medium tracking-wide uppercase text-xs">
              Personalized AI Roadmaps • Powered by StudyMate
            </p>
          </div>

          <button
            onClick={() => setShowForm(true)}
            className="cursor-pointer group relative bg-blue-600 hover:bg-blue-500 text-white font-bold px-8 py-4 rounded-2xl transition-all shadow-[0_0_20px_rgba(37,99,235,0.3)] flex items-center gap-2 overflow-hidden"
          >
            <span className="relative z-10">+ Create New Path</span>
            <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </button>
        </div>

        {/* Modal-style Form Overlay */}
        {showForm && (
          <div className="bg-[#0f111a] border border-white/10 rounded-3xl p-8 mb-16 shadow-2xl relative overflow-hidden animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-blue-500 to-purple-600" />

            <h2 className="text-2xl font-bold text-white mb-8 flex items-center gap-3">
              <span className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
                ⚡
              </span>
              Roadmap Configuration
            </h2>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              <div className="md:col-span-2 lg:col-span-3">
                <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-3">
                  I want to learn...
                </label>
                <input
                  className="w-full bg-white/[0.03] border border-white/10 focus:border-blue-500/50 rounded-xl p-4 text-white outline-none transition-all placeholder:text-gray-600"
                  placeholder="e.g. Quantum Computing, High-Performance Go, Renaissance Art"
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                />
              </div>

              {[
                {
                  label: "Experience Level",
                  state: experience,
                  setState: setExperience,
                  options: ["Beginner", "Intermediate", "Advanced"],
                },
                {
                  label: "Daily Commitment",
                  state: time,
                  setState: setTime,
                  options: ["30 minutes", "1 hour", "2 hours", "3+ hours"],
                },
                {
                  label: "Total Duration",
                  state: duration,
                  setState: setDuration,
                  options: ["2 weeks", "4 weeks", "8 weeks", "12 weeks"],
                },
              ].map((field, i) => (
                <div key={i}>
                  <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-3">
                    {field.label}
                  </label>
                  <select
                    className="w-full bg-white/[0.03] border border-white/10 rounded-xl p-4 text-white cursor-pointer hover:bg-white/[0.05] transition-colors appearance-none"
                    value={field.state}
                    onChange={(e) => field.setState(e.target.value)}
                  >
                    {field.options.map((opt) => (
                      <option key={opt} className="bg-[#0f111a]">
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-4 mt-10">
              <button
                onClick={createLearningPath}
                disabled={loading}
                className="cursor-pointer flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-black py-4 rounded-2xl transition-all disabled:opacity-50 shadow-lg"
              >
                {loading
                  ? "AI is crafting your path..."
                  : "GENERATE PERSONALIZED PATH"}
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="cursor-pointer px-10 bg-white/5 hover:bg-white/10 text-gray-300 font-bold rounded-2xl transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {paths.length === 0 && !loading && (
          <div className="text-center py-24 border-2 border-dashed border-white/5 rounded-[40px] bg-white/[0.01]">
            <p className="text-gray-500 text-lg font-medium">
              Your learning journey is waiting. <br />
              <span className="text-blue-400/50">
                Create your first AI-powered roadmap.
              </span>
            </p>
          </div>
        )}

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {paths.map((path) => (
            <LearningPathCard
              key={path.id}
              path={path}
              onSelect={setSelectedPath}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function RoadmapDetailView({ path, onBack }) {
  const roadmap =
    typeof path.roadmap === "string" ? JSON.parse(path.roadmap) : path.roadmap;

  return (
    <div className="min-h-screen bg-[#05060f] text-white pt-12 px-6 pb-20">
      <div className="max-w-4xl mx-auto">
        <button
          onClick={onBack}
          className="cursor-pointer text-blue-400 font-bold mb-10 flex items-center hover:text-blue-300 transition-all group"
        >
          <span className="mr-2 group-hover:-translate-x-1 transition-transform">
            ←
          </span>{" "}
          Back to Dashboard
        </button>

        <div className="mb-16">
          <h1 className="text-5xl font-black text-white leading-tight mb-4">
            {path.goal}
          </h1>
          <p className="text-gray-400 text-xl max-w-2xl leading-relaxed">
            {roadmap.description ||
              `A detailed ${path.duration} roadmap designed for ${path.experience} mastery.`}
          </p>
        </div>

        <div className="space-y-12">
          {roadmap.weeks.map((week, idx) => (
            <div key={idx} className="relative pl-12">
              {/* Vertical Line */}
              <div className="absolute left-[11px] top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-500/50 to-purple-600/50 opacity-20" />
              {/* Dot */}
              <div className="absolute left-0 top-2 w-6 h-6 bg-[#05060f] border-4 border-blue-500 rounded-full z-10 shadow-[0_0_10px_rgba(59,130,246,0.5)]" />

              <div className="bg-[#0f111a] border border-white/10 rounded-[32px] p-8 shadow-xl hover:border-white/20 transition-all group">
                <h3 className="text-2xl font-bold text-white mb-6 group-hover:text-blue-400 transition-colors">
                  Week {idx + 1}: {week.title}
                </h3>

                <div className="grid md:grid-cols-2 gap-10">
                  <div>
                    <h4 className="text-[10px] font-black text-blue-400/60 uppercase tracking-[0.2em] mb-4">
                      Core Topics
                    </h4>
                    <ul className="space-y-3">
                      {week.topics?.map((topic, i) => (
                        <li
                          key={i}
                          className="flex items-start text-gray-300 text-sm leading-relaxed"
                        >
                          <span className="text-blue-500 mr-3 mt-0.5">✦</span>{" "}
                          {topic}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h4 className="text-[10px] font-black text-purple-400/60 uppercase tracking-[0.2em] mb-4">
                      Resources
                    </h4>
                    <div className="space-y-3">
                      {week.resources?.map((res, i) => (
                        <a
                          key={i}
                          href={res.url}
                          target="_blank"
                          rel="noreferrer"
                          className="cursor-pointer flex items-center p-4 bg-white/[0.03] border border-white/5 rounded-2xl text-gray-200 text-sm font-semibold hover:bg-blue-600 hover:text-white transition-all overflow-hidden"
                        >
                          <span className="mr-3 text-lg opacity-80">
                            {res.type === "youtube" ? "📺" : "📄"}
                          </span>
                          <span className="truncate">{res.title}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
