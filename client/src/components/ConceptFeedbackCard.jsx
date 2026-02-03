import React from "react";
import {
  CheckCircle2,
  AlertCircle,
  XCircle,
  ArrowRight,
  Check,
} from "lucide-react";

const ConceptFeedbackCard = ({
  feedbackData, 
  rubric, 
  onNext, 
  isLastQuestion,
}) => {
  if (!feedbackData) return null;

  const isPass = feedbackData.score >= 70;

  return (
    <div className="w-full animate-in slide-in-from-bottom-4 duration-500">
      {/* 1. Score Header */}
      <div
        className={`
        relative overflow-hidden p-6 rounded-2xl border mb-6 flex items-center justify-between
        ${
          isPass
            ? "bg-emerald-950/30 border-emerald-500/30 text-emerald-400"
            : "bg-amber-950/30 border-amber-500/30 text-amber-400"
        }
      `}
      >
        <div className="flex items-center gap-4 z-10">
          <div
            className={`p-3 rounded-full ${isPass ? "bg-emerald-500/20" : "bg-amber-500/20"}`}
          >
            {isPass ? (
              <CheckCircle2 className="w-8 h-8" />
            ) : (
              <AlertCircle className="w-8 h-8" />
            )}
          </div>
          <div>
            <h4 className="font-bold text-xl text-white">
              {isPass ? "Concept Mastered" : "Needs Review"}
            </h4>
            <p className="text-sm opacity-80">
              {isPass ? "Your logic was sound." : "You missed key details."}
            </p>
          </div>
        </div>

        {/* Big Score Number */}
        <div className="text-4xl font-bold tracking-tighter z-10">
          {feedbackData.score}%
        </div>
      </div>

      {/* 2. The AI Explanation */}
      <div className="space-y-6 mb-8">
        <div className="bg-slate-900/50 p-6 rounded-xl border border-white/10 shadow-inner">
          <h5 className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Sparkles className="w-3 h-3" /> AI Analysis
          </h5>
          <p className="text-slate-200 leading-relaxed text-lg">
            {feedbackData.feedback_text}
          </p>
        </div>

        {/* 3. The Hidden Rubric (What was expected vs What was missed) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Rubric Points (The Truth) */}
          <div className="bg-slate-950 p-5 rounded-xl border border-white/5">
            <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
              Expected Key Concepts
            </h5>
            <ul className="space-y-2">
              {rubric.map((point, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-sm text-slate-400"
                >
                  <Check className="w-4 h-4 text-emerald-500/50 mt-0.5" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Missing Points (The Gap) */}
          {feedbackData.missing_concepts?.length > 0 ? (
            <div className="bg-red-950/20 p-5 rounded-xl border border-red-500/20">
              <h5 className="text-xs font-bold text-red-400 uppercase tracking-wider mb-3">
                Missed Concepts
              </h5>
              <ul className="space-y-2">
                {feedbackData.missing_concepts.map((point, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-sm text-red-200"
                  >
                    <XCircle className="w-4 h-4 text-red-500 mt-0.5" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="bg-emerald-950/20 p-5 rounded-xl border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <span className="flex items-center gap-2 font-medium">
                <CheckCircle2 className="w-5 h-5" /> No Concepts Missed!
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 4. Action Button */}
      <div className="flex justify-end pt-4 border-t border-white/10">
        <button
          onClick={onNext}
          className={`
            flex items-center gap-3 px-8 py-4 rounded-xl font-bold text-lg shadow-xl hover:scale-[1.02] transition-all
            ${
              isLastQuestion
                ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-emerald-500/20"
                : "bg-white text-slate-900 hover:bg-slate-100"
            }
          `}
        >
          {isLastQuestion ? "Finish Session" : "Next Question"}
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default ConceptFeedbackCard;
