import React from "react";
import useVoiceAssistant from "../hooks/useVoiceAssistant";
import {
  Mic,
  Square,
  Loader2,
  AudioLines,
  AlertCircle,
  Sparkles,
} from "lucide-react";

export default function VoiceAssistant({ userId }) {
  const { mode, startAssistant, stopAssistant, speechError } =
    useVoiceAssistant();

  const isIdle = mode === "idle" || mode === "error";
  const isListening = mode === "listening";
  const isThinking = mode === "thinking";
  const isSpeaking = mode === "speaking";

  const handlePress = () => {
    if (isIdle) {
      startAssistant(userId);
    } else {
      stopAssistant();
    }
  };

  // --- Premium Styling Logic ---

  // Tighter padding (pr-6 pl-2), smaller gap (gap-3), and slightly reduced height (h-14)
  const baseButtonClasses =
    "cursor-pointer relative group flex items-center gap-3 pr-6 pl-2 h-14 rounded-full border transition-all duration-500 ease-out shadow-2xl overflow-hidden";

  // State-specific visual configurations
  let stateStyles = {
    container:
      "bg-slate-900/40 border-white/10 hover:border-white/20 hover:bg-slate-800/50 shadow-black/20 backdrop-blur-xl",
    iconContainer: "bg-white/5 group-hover:bg-white/10",
    icon: <Mic className="w-5 h-5 text-white/90" />,
    label: "Tap to Talk",
    glow: "opacity-0",
    textColor: "text-white/90",
  };

  if (isListening) {
    stateStyles = {
      container:
        "bg-indigo-950/80 border-indigo-500/30 backdrop-blur-2xl shadow-indigo-500/20",
      iconContainer:
        "bg-indigo-500 text-white shadow-[0_0_15px_rgba(99,102,241,0.5)] animate-pulse",
      icon: <Square className="w-4 h-4 fill-current" />,
      label: "Listening...",
      glow: "opacity-100 bg-indigo-500/20",
      textColor: "text-indigo-100",
    };
  } else if (isThinking) {
    stateStyles = {
      container:
        "bg-amber-950/80 border-amber-500/30 backdrop-blur-2xl shadow-amber-500/20",
      iconContainer:
        "bg-gradient-to-tr from-amber-500 to-orange-500 text-white shadow-[0_0_15px_rgba(245,158,11,0.5)]",
      icon: <Loader2 className="w-5 h-5 animate-spin" />,
      label: "Thinking...",
      glow: "opacity-100 bg-amber-500/20",
      textColor: "text-amber-100",
    };
  } else if (isSpeaking) {
    stateStyles = {
      container:
        "bg-emerald-950/80 border-emerald-500/30 backdrop-blur-2xl shadow-emerald-500/20",
      // Gentle breathing ring effect
      iconContainer:
        "bg-gradient-to-tr from-emerald-500 to-teal-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.6)] ring-2 ring-emerald-400/50 animate-[pulse_3s_infinite]",
      icon: <AudioLines className="w-5 h-5" />,
      label: "Speaking...",
      glow: "opacity-100 bg-emerald-500/20",
      textColor: "text-emerald-100",
    };
  }

  return (
    <div className="fixed bottom-8 right-8 flex flex-col items-end gap-3 z-50 font-sans">
      {/* Error Toast */}
      {speechError && (
        <div className="animate-in slide-in-from-right-10 fade-in duration-300 flex items-center gap-2 px-3 py-2 rounded-xl bg-red-950/90 border border-red-500/30 text-red-100 text-xs font-medium shadow-lg backdrop-blur-xl mb-1">
          <AlertCircle className="w-3 h-3 text-red-400" />
          <span>{speechError}</span>
        </div>
      )}

      {/* Main Interaction Button */}
      <button
        onClick={handlePress}
        className={`${baseButtonClasses} ${stateStyles.container}`}
      >
        {/* Ambient Background Glow */}
        <div
          className={`absolute inset-0 blur-2xl transition-opacity duration-500 ${stateStyles.glow}`}
        />

        {/* Icon Circle */}
        <div
          className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${stateStyles.iconContainer}`}
        >
          {stateStyles.icon}
        </div>

        {/* Text Content */}
        <div className="relative z-10 flex flex-col items-start justify-center h-full">
          <span
            className={`font-semibold tracking-wide text-xs transition-colors duration-300 ${stateStyles.textColor}`}
          >
            {stateStyles.label}
          </span>
        </div>

        {/* Shine Overlay */}
        <div className="absolute inset-0 rounded-full ring-1 ring-inset ring-white/10 pointer-events-none" />
      </button>

      {/* Footer Label */}
      <div className="flex items-center gap-1.5 pr-3 opacity-40 hover:opacity-80 transition-opacity duration-300">
        <Sparkles className="w-3 h-3 text-indigo-400" />
        <p className="text-[9px] text-white font-medium uppercase tracking-[0.15em]">
          AI Performance Coach
        </p>
      </div>
    </div>
  );
}
