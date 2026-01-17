import React from "react";
import useVoiceAssistant from "../hooks/useVoiceAssistant";
import { Mic, Square, Loader2, Volume2, AlertCircle } from "lucide-react";

export default function VoiceAssistant({ userId }) {
  const { mode, startAssistant, stopAssistant, speechError } =
    useVoiceAssistant();

  const isIdle = mode === "idle" || mode === "error";
  const isListening = mode === "listening";
  const isThinking = mode === "thinking";
  const isSpeaking = mode === "speaking";

  const handlePress = () => {
    if (isIdle) {
      startAssistant(userId); // ✅ Pass UserID here
    } else {
      stopAssistant();
    }
  };

  // Dynamic Styles based on state
  let buttonColor = "bg-white/10 hover:bg-white/20";
  let icon = <Mic className="w-6 h-6 text-white" />;
  let label = "Tap to Talk";

  if (isListening) {
    buttonColor = "bg-indigo-600 animate-pulse";
    icon = <Square className="w-6 h-6 text-white fill-current" />;
    label = "Listening...";
  } else if (isThinking) {
    buttonColor = "bg-yellow-500/80";
    icon = <Loader2 className="w-6 h-6 text-white animate-spin" />;
    label = "Thinking...";
  } else if (isSpeaking) {
    buttonColor = "bg-emerald-600";
    icon = <Volume2 className="w-6 h-6 text-white animate-bounce" />;
    label = "Speaking...";
  }

  return (
    <div className="fixed bottom-6 right-6 flex flex-col items-end gap-3 z-50">
      {/* Error Bubble */}
      {speechError && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-500/90 text-white text-xs mb-2 shadow-lg backdrop-blur-md">
          <AlertCircle className="w-3 h-3" />
          {speechError}
        </div>
      )}

      {/* Main Button */}
      <button
        onClick={handlePress}
        className={`cursor-pointer relative group flex items-center gap-3 pr-6 pl-4 h-14 rounded-full border border-white/10 backdrop-blur-lg shadow-xl transition-all duration-300 ${buttonColor}`}
      >
        <div className="w-8 h-8 flex items-center justify-center">{icon}</div>
        <span className="font-semibold text-white tracking-wide text-sm">
          {label}
        </span>
      </button>

      <p className="text-[10px] text-white/30 font-medium pr-4">
        AI Performance Coach
      </p>
    </div>
  );
}
