import React from "react";
import { BookOpen, Calendar, Trophy } from "lucide-react";

const ResultsGrid = ({ groupedResults }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Object.entries(groupedResults).map(([filename, quizzes]) => (
        <div
          key={filename}
          className="bg-gray-900/50 border border-white/10 rounded-2xl overflow-hidden hover:border-indigo-500/30 transition-colors"
        >
          {/* Card Header */}
          <div className="p-5 bg-white/5 border-b border-white/5 flex items-start gap-3">
            <div className="p-2 bg-indigo-500/20 rounded-lg shrink-0">
              <BookOpen className="w-5 h-5 text-indigo-400" />
            </div>
            <h3 className="font-bold text-white truncate" title={filename}>
              {filename}
            </h3>
          </div>

          {/* Quiz List */}
          <div className="p-2">
            <div className="max-h-[300px] overflow-y-auto pr-1 no-scrollbar">
              {quizzes.map((quiz, idx) => {
                const percentage = Math.round(
                  (quiz.score / quiz.total_questions) * 100
                );

                return (
                  <div
                    key={idx}
                    className="p-3 hover:bg-white/5 rounded-lg transition-colors group"
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-sm font-medium text-gray-200 group-hover:text-indigo-300 transition-colors">
                        {quiz.topic}
                      </span>

                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          percentage >= 70
                            ? "bg-green-500/20 text-green-400"
                            : "bg-amber-500/20 text-amber-400"
                        }`}
                      >
                        {quiz.score}/{quiz.total_questions}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(quiz.created_at).toLocaleDateString()}
                      </div>
                      <div className="flex items-center gap-1">
                        <Trophy className="w-3 h-3" />
                        {percentage}%
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ResultsGrid;
