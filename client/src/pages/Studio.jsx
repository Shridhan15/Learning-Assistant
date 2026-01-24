import React from "react";
import { useUser } from "@clerk/clerk-react";
import { FaBrain, FaChartPie, FaLock, FaBolt } from "react-icons/fa";
import DailyPodcast from "../components/studio/DailyPodcast";

const Studio = () => {
  const { user } = useUser();

  return (
    <div className="min-h-screen bg-black text-gray-100 font-sans selection:bg-cyan-500/30">
      {/* Background Ambience (Fixed position, ignores scroll) */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[300px] md:w-[500px] h-[300px] md:h-[500px] bg-blue-600/10 rounded-full blur-[80px] md:blur-[128px]"></div>
        <div className="absolute bottom-0 right-1/4 w-[300px] md:w-[500px] h-[300px] md:h-[500px] bg-purple-600/10 rounded-full blur-[80px] md:blur-[128px]"></div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 md:p-6 relative z-10">
        {/* --- HEADER HERO --- */}
        <header className="mb-8 md:mb-12 pt-4 md:pt-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            {/* Left: Title & One-liner */}
            <div className="space-y-2 md:space-y-3">
              <h1 className="text-4xl md:text-6xl font-black text-white tracking-tight leading-tight">
                The{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500">
                  Studio
                </span>
              </h1>
              <p className="text-gray-400 text-sm md:text-lg max-w-lg leading-relaxed">
                Your centralized AI command center for daily audio briefings,
                insights, and mastery.
              </p>
            </div>

            {/* Right: User Welcome Pill */}
            <div className="self-start md:self-auto flex items-center gap-3 bg-[#09090b]/80 border border-white/10 px-4 py-2 rounded-full backdrop-blur-md shadow-lg">
              <img
                src={user?.imageUrl}
                alt="User"
                className="w-8 h-8 rounded-full border border-gray-600"
              />
              <span className="text-sm font-medium text-gray-300">
                Welcome back,{" "}
                <span className="text-white font-bold">{user?.firstName}</span>
              </span>
            </div>
          </div>
        </header>

        <main className="space-y-10 md:space-y-16">
          {/* --- SECTION 1: PODCAST (Center Stage) --- */}
          <section className="w-full">
            <DailyPodcast />
          </section>

          {/* --- SECTION 2: TOOLS GRID --- */}
          <section>
            <div className="flex items-center justify-between mb-4 md:mb-6 border-b border-gray-800 pb-4">
              <h3 className="text-lg md:text-xl font-bold text-white flex items-center gap-2">
                <FaBolt className="text-yellow-400" /> Product Suite
              </h3>
              <span className="text-[10px] md:text-xs text-gray-500 font-mono bg-gray-900 px-2 py-1 rounded">
                V 1.0.0
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
              {/* Card 1: Flashcards */}
              <ToolCard
                icon={<FaBrain className="text-pink-400" />}
                title="Neural Flashcards"
                desc="Active recall powered by your mistake patterns."
                status="Coming Soon"
              />

              {/* Card 2: Analytics */}
              <ToolCard
                icon={<FaChartPie className="text-cyan-400" />}
                title="Deep Analytics"
                desc="Visualization of your knowledge gaps over time."
                status="Coming Soon"
              />

              {/* Card 3: Locked */}
              <div className="group relative p-6 rounded-2xl bg-[#09090b] border border-dashed border-gray-800 flex flex-col items-center justify-center gap-3 text-center opacity-60 hover:opacity-100 transition-opacity min-h-[180px]">
                <div className="p-3 bg-gray-800/50 rounded-full">
                  <FaLock className="text-xl text-gray-500" />
                </div>
                <p className="text-sm font-medium text-gray-500">
                  More Tools In Development
                </p>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
};

// Reusable Tool Card
const ToolCard = ({ icon, title, desc, status }) => (
  <div className="group relative p-6 rounded-2xl bg-[#09090b] border border-white/10 hover:border-white/20 transition-all duration-300 hover:-translate-y-1 overflow-hidden min-h-[180px]">
    {/* Hover Gradient */}
    <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

    <div className="relative z-10 flex flex-col h-full justify-between">
      <div>
        <div className="flex justify-between items-start mb-4">
          <div className="p-3 bg-white/5 rounded-xl border border-white/5 text-xl shadow-inner">
            {icon}
          </div>
          <span className="px-2 py-1 bg-gray-800 rounded text-[10px] font-bold text-gray-400 uppercase tracking-wide border border-gray-700">
            {status}
          </span>
        </div>

        <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
      </div>
      <p className="text-sm text-gray-400 leading-relaxed">{desc}</p>
    </div>
  </div>
);

export default Studio;
