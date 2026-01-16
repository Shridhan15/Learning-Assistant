import React from "react";
import {
  ArrowRight,
  BookOpen,
  Brain,
  Sparkles,
  Target,
  Activity,
} from "lucide-react";
import { SignInButton } from "@clerk/clerk-react";

const Hero = () => {
  return ( 
    <div className="h-screen w-full bg-slate-950 text-white flex flex-col justify-center items-center relative overflow-hidden">
      
      <div className="absolute top-0 z-0 h-full w-full bg-slate-950 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.3),rgba(255,255,255,0))]" />
 
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] z-0 pointer-events-none" />
 
      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px] -z-10" />
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-purple-500/10 rounded-full blur-[80px] -z-10" />

      {/* --- Main Content --- */}
      <div className="max-w-7xl mx-auto px-4 text-center z-10 flex flex-col items-center justify-center h-full pt-10">
        
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs md:text-sm text-indigo-300 mb-6 backdrop-blur-sm">
          <Sparkles className="w-3 h-3" />
          <span>AI-Powered Learning Assistant</span>
        </div>
 
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-4 bg-gradient-to-br from-white via-indigo-100 to-indigo-400 text-transparent bg-clip-text drop-shadow-sm">
          Master Any Subject <br /> with AI.
        </h1>
 
        <p className="text-base md:text-lg text-slate-400 mb-8 max-w-xl mx-auto leading-relaxed">
          Upload PDFs, chat with your personal AI tutor, and take personalized
          quizzes to retain more information in less time.
        </p>
 
        <SignInButton mode="modal">
          <button className=" cursor-pointer group relative inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-full font-semibold text-base transition-all transform hover:scale-105 hover:shadow-[0_0_20px_rgba(79,70,229,0.5)]">
            Get Started for Free
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </SignInButton>
 
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-12 w-full max-w-6xl">
          <FeatureCard
            icon={<BookOpen className="w-5 h-5 text-indigo-400" />}
            title="Upload Documents"
            desc="Drag & drop study materials. We support PDF format for seamless parsing."
          />
          <FeatureCard
            icon={<Brain className="w-5 h-5 text-purple-400" />}
            title="Chat with Context"
            desc="Ask questions from your notes. The AI understands your specific material."
          />
          <FeatureCard
            icon={<Target className="w-5 h-5 text-emerald-400" />}
            title="Smart Quizzes"
            desc="Generate instant quizzes to test your knowledge and identify weak spots."
          />
          <FeatureCard
            icon={<Activity className="w-5 h-5 text-rose-400" />}
            title="Track Progress"
            desc="Monitor performance over time. AI suggests weak topics to practice again."
          />
        </div>
      </div>
    </div>
  );
};

// Compact Feature Card
const FeatureCard = ({ icon, title, desc }) => (
  <div className="group p-5 rounded-xl bg-white/5 border border-white/10 hover:border-indigo-500/30 hover:bg-white/10 transition-all duration-300 backdrop-blur-sm flex flex-col text-left h-full hover:-translate-y-1">
    <div className="mb-3 p-2 bg-white/5 w-fit rounded-lg group-hover:bg-white/10 transition-colors">
      {icon}
    </div>
    <h3 className="text-base font-bold mb-1 text-white group-hover:text-indigo-200 transition-colors">
      {title}
    </h3>
    <p className="text-xs text-slate-400 leading-relaxed">{desc}</p>
  </div>
);

export default Hero;
