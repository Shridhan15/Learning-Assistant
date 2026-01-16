import React from "react";
import {
  ArrowRight,
  BrainCircuit,
  FileText,
  Sparkles,
  Upload,
} from "lucide-react";
import { useNavigate } from "react-router-dom"; // Assuming you use react-router
import { images } from "../assets/assets";

const EmptyState = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] w-full p-8 relative overflow-hidden rounded-3xl bg-slate-900/50 border border-white/5">
      {/* --- Background Ambient Glows --- */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px] -z-10" />

      <div className="relative mb-8 group">
        <div className="absolute inset-0 bg-indigo-500/20 blur-xl rounded-full group-hover:bg-indigo-500/30 transition-all duration-500" />
        <div className="relative w-24 h-24 bg-slate-900 rounded-2xl border border-white/10 flex items-center justify-center shadow-2xl rotate-3 group-hover:rotate-6 transition-transform duration-300">
          <img
            src={images.logo}
            alt="App Logo"
            className="w-full h-full object-cover rounded-2xl"
          />
          {/* Floating Badge */}
          <div className="absolute -top-2 -right-2 bg-indigo-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full border border-slate-900">
            AI Ready
          </div>
        </div>
      </div>

      {/* --- Text Content --- */}
      <h2 className="text-3xl md:text-4xl font-bold text-white mb-3 tracking-tight">
        Ready to Test Your Knowledge?
      </h2>
      <p className="text-slate-400 max-w-lg text-center mb-10 leading-relaxed">
        You haven't taken any quizzes yet. Upload your study material and let
        our AI generate personalized questions to help you master the subject.
      </p>

      {/* --- "How it Works" Mini Steps --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-2xl mb-10">
        <StepCard
          icon={<Upload className="w-4 h-4 text-emerald-400" />}
          label="1. Upload PDF"
          desc="Drag & drop your notes"
        />
        <StepCard
          icon={<Sparkles className="w-4 h-4 text-indigo-400" />}
          label="2. AI Analysis"
          desc="We extract key concepts"
        />
        <StepCard
          icon={<FileText className="w-4 h-4 text-purple-400" />}
          label="3. Take Quiz"
          desc="Test & track progress"
        />
      </div>

      {/* --- CTA Button --- */}
      <button
        onClick={() => navigate("/quiz")}
        className="cursor-pointer group relative inline-flex items-center gap-2 px-8 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full font-semibold transition-all transform hover:scale-105 shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_25px_rgba(79,70,229,0.5)]"
      >
        <Sparkles className="w-4 h-4 text-indigo-200" />
        Create Your First Quiz
        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
      </button>
    </div>
  );
};

const StepCard = ({ icon, label, desc }) => (
  <div className="flex flex-col items-center p-4 bg-white/5 border border-white/5 rounded-xl hover:bg-white/10 transition-colors text-center">
    <div className="mb-2 p-2 bg-slate-800 rounded-lg border border-white/5">
      {icon}
    </div>
    <span className="text-sm font-semibold text-white mb-1">{label}</span>
    <span className="text-xs text-slate-500">{desc}</span>
  </div>
);

export default EmptyState;
