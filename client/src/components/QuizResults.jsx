// src/components/QuizResults.jsx
import React from "react";
import { CheckCircle, AlertCircle, BookOpen, RefreshCw } from "lucide-react";

const QuizResults = ({
  quizData,
  userAnswers,
  score,
  onNewFile, // maps to resetApp
  onNewTopic, // maps to restart topic logic
}) => {
  const percentage = Math.round((score / quizData.length) * 100);
  const isPassing = score / quizData.length >= 0.7;

  return (
    <div className="animate-in zoom-in duration-300 pb-8">
      {/* 1. Score Summary Header */}
      <div className="text-center mb-8 bg-white/5 p-6 rounded-2xl border border-white/10">
        <div className="relative inline-flex items-center justify-center w-32 h-32 mb-4">
          <svg className="w-full h-full -rotate-90 transform">
            <circle
              cx="64"
              cy="64"
              r="56"
              stroke="currentColor"
              strokeWidth="8"
              className="text-gray-800"
              fill="none"
            />
            <circle
              cx="64"
              cy="64"
              r="56"
              stroke="currentColor"
              strokeWidth="8"
              fill="none"
              strokeDasharray={351}
              strokeDashoffset={351 - (351 * score) / quizData.length}
              strokeLinecap="round"
              className={`transition-all duration-1000 ease-out ${
                isPassing ? "text-green-500" : "text-amber-500"
              }`}
            />
          </svg>
          <span className="absolute text-3xl font-bold text-white">
            {percentage}%
          </span>
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">
          {isPassing ? "Great Job!" : "Good Effort!"}
        </h2>
        <p className="text-gray-400">
          You scored {score} out of {quizData.length}
        </p>
      </div>

      {/* 2. Detailed Review List */}
      <div className="space-y-6 mb-8">
        <h3 className="text-xl font-bold text-white border-b border-white/10 pb-2">
          Detailed Review
        </h3>

        {quizData.map((q, index) => {
          const isCorrect = userAnswers[q.id] === q.correctAnswer;
          return (
            <div
              key={q.id || index}
              className={`p-5 rounded-xl border ${
                isCorrect
                  ? "bg-green-500/10 border-green-500/30"
                  : "bg-red-500/10 border-red-500/30"
              }`}
            >
              {/* Question Header */}
              <div className="flex items-start gap-3 mb-3">
                {isCorrect ? (
                  <CheckCircle className="w-6 h-6 text-green-400 shrink-0 mt-1" />
                ) : (
                  <AlertCircle className="w-6 h-6 text-red-400 shrink-0 mt-1" />
                )}
                <div>
                  <h4 className="text-lg font-medium text-gray-200">
                    <span className="opacity-50 mr-2">Q{index + 1}.</span>
                    {q.question}
                  </h4>
                </div>
              </div>

              {/* Answers Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 text-sm">
                <div
                  className={`p-3 rounded-lg ${
                    isCorrect ? "bg-green-500/20" : "bg-red-500/20 text-red-200"
                  }`}
                >
                  <span className="block text-xs uppercase opacity-70 mb-1 font-bold">
                    Your Answer
                  </span>
                  {userAnswers[q.id]}
                </div>
                {!isCorrect && (
                  <div className="p-3 rounded-lg bg-green-500/20 text-green-200">
                    <span className="block text-xs uppercase opacity-70 mb-1 font-bold">
                      Correct Answer
                    </span>
                    {q.correctAnswer}
                  </div>
                )}
              </div>

              {/* Explanation */}
              {q.explanation && (
                <div className="mt-4 pt-3 border-t border-white/10">
                  <p className="text-sm text-gray-300 leading-relaxed">
                    <span className="text-indigo-400 font-bold mr-2">Why?</span>
                    {q.explanation}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 3. Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center sticky bottom-4 bg-gray-950/90 backdrop-blur-md p-4 rounded-full border border-white/10 shadow-2xl">
        <button
          onClick={onNewFile}
          className="cursor-pointer px-6 py-2 bg-white text-gray-900 hover:bg-gray-200 rounded-full font-bold transition flex items-center gap-2 text-sm"
        >
          <BookOpen className="w-4 h-4" /> New File
        </button>
        <button
          onClick={onNewTopic}
          className="cursor-pointer px-6 py-2 bg-indigo-600 text-white hover:bg-indigo-500 rounded-full font-bold transition flex items-center gap-2 text-sm"
        >
          <RefreshCw className="w-4 h-4" /> New Topic
        </button>
      </div>
    </div>
  );
};

export default QuizResults;
