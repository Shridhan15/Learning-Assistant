// src/components/QuizViewer.jsx
import React from "react";
import { CheckCircle } from "lucide-react";

const QuizViewer = ({
  quizData,
  userAnswers,
  handleOptionSelect,
  submitQuiz,
  topic,
}) => {
  return (
    <div className="animate-in slide-in-from-right-8 duration-300">
      <div className="flex justify-between items-end mb-4 border-b border-white/10 pb-4">
        <h2 className="text-xl font-semibold text-white">Quiz Time</h2>
        <span className="text-xs text-gray-400 bg-white/5 px-2 py-1 rounded">
          Topic: {topic}
        </span>
      </div>

      <div className="space-y-6 max-h-[55vh] overflow-y-auto pr-2 no-scrollbar">
        {quizData.map((q, index) => (
          <div
            key={q.id || index}
            className="bg-white/5 p-6 rounded-xl border border-white/5 hover:border-white/10 transition-colors"
          >
            <h3 className="text-lg font-medium mb-4 text-gray-200">
              <span className="text-indigo-400 mr-2 font-mono">
                Q{index + 1}.
              </span>
              {q.question}
            </h3>
            <div className="space-y-2">
              {q.options.map((option, optIndex) => (
                <button
                  key={optIndex}
                  onClick={() => handleOptionSelect(q.id, option)}
                  className={`cursor-pointer w-full text-left px-4 py-3 rounded-lg border transition-all duration-200 flex items-center justify-between group ${
                    userAnswers[q.id] === option
                      ? "bg-indigo-600/20 border-indigo-500 text-indigo-100"
                      : "bg-black/20 border-white/5 hover:bg-white/10 text-gray-400 hover:text-white"
                  }`}
                >
                  <span>{option}</span>
                  {userAnswers[q.id] === option && (
                    <CheckCircle className="w-4 h-4 text-indigo-400" />
                  )}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 pt-4 border-t border-white/10 bg-gray-950/80 backdrop-blur-sm sticky bottom-0">
        <button
          onClick={submitQuiz}
          disabled={Object.keys(userAnswers).length !== quizData.length}
          className="cursor-pointer w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-full font-bold transition shadow-lg shadow-indigo-500/20"
        >
          Submit & See Score
        </button>
      </div>
    </div>
  );
};

export default QuizViewer;
