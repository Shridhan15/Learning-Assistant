import React from "react";
import { useNavigate } from "react-router-dom";
import {
  BookOpen,
  Calendar,
  TrendingUp,
  Target,
  Play,
  MessageCircle,
  MoreVertical,
  BarChart3,
  Clock,
} from "lucide-react";

const BookCard = ({ filename, quizzes }) => {
  const navigate = useNavigate();

  // --- LOGIC: Identify Weak Areas ---
  const getBookInsights = (quizList) => {
    const topicPerformance = {};

    // Calculate totals per topic
    quizList.forEach((q) => {
      if (!topicPerformance[q.topic]) {
        topicPerformance[q.topic] = { total: 0, count: 0 };
      }
      const percentage = (q.score / q.total_questions) * 100;
      topicPerformance[q.topic].total += percentage;
      topicPerformance[q.topic].count += 1;
    });

    // Find topics with < 60% average
    const weakTopics = [];
    Object.entries(topicPerformance).forEach(([topic, data]) => {
      const avg = data.total / data.count;
      if (avg < 60) {
        weakTopics.push({ topic, avg: Math.round(avg) });
      }
    });

    return weakTopics;
  };

  const weakTopics = getBookInsights(quizzes);

  // --- LOGIC: Calculate Overall Mastery ---
  const totalScore = quizzes.reduce(
    (acc, q) => acc + (q.score / q.total_questions) * 100,
    0
  );
  const overallMastery = Math.round(totalScore / quizzes.length);

  return (
    <div className="w-full bg-gray-900/50 border border-white/10 rounded-2xl overflow-hidden hover:border-indigo-500/30 transition-all duration-300 shadow-xl shadow-black/20 group">
      {/* 1. Header Row */}
      <div className="px-6 py-4 bg-white/5 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className="p-2.5 bg-indigo-500/20 rounded-xl shrink-0 group-hover:scale-105 transition-transform">
            <BookOpen className="w-5 h-5 text-indigo-400" />
          </div>
          <div className="min-w-0 flex-1">
            <h3
              className="text-lg font-bold text-white truncate pr-4"
              title={filename}
            >
              {filename}
            </h3>
            <div className="flex items-center gap-3 text-xs text-gray-400 mt-0.5">
              <span className="flex items-center gap-1.5">
                <Clock className="w-3 h-3" />
                Active: {new Date(quizzes[0].created_at).toLocaleDateString()}
              </span>
              <span className="w-1 h-1 rounded-full bg-gray-600"></span>
              <span className="flex items-center gap-1.5 text-indigo-300/80">
                <BarChart3 className="w-3 h-3" />
                Mastery: {overallMastery}%
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
           
          <button className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* --- 2. THE SPLIT LAYOUT --- */}
      <div className="grid grid-cols-1 lg:grid-cols-5 divide-y lg:divide-y-0 lg:divide-x divide-white/5">
        {/* LEFT SIDE: Recent Activity (60%) */}
        <div className="lg:col-span-3 p-6 flex flex-col">
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Calendar className="w-3 h-3" /> Recent Activity
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {quizzes.slice(0, 6).map((quiz, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors border border-transparent hover:border-white/10 group/item"
              >
                <div className="min-w-0 pr-2">
                  <p className="text-sm font-medium text-gray-200 truncate group-hover/item:text-indigo-300 transition-colors">
                    {quiz.topic}
                  </p>
                  <p className="text-[10px] text-gray-500 mt-0.5">
                    {new Date(quiz.created_at).toLocaleDateString()}
                  </p>
                </div>

                <div
                  className={`shrink-0 px-2.5 py-1 rounded-md text-xs font-bold ${
                    quiz.score / quiz.total_questions >= 0.7
                      ? "bg-green-500/10 text-green-400 border border-green-500/20"
                      : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                  }`}
                >
                  {Math.round((quiz.score / quiz.total_questions) * 100)}%
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT SIDE: Insights & Actions (40%) */}
        <div className="lg:col-span-2 p-6 bg-black/20 flex flex-col">
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Target className="w-3 h-3" />
            {weakTopics.length > 0 ? "Focus Areas" : "Insights"}
          </h4>

          {weakTopics.length > 0 ? (
            // Layout for "Focus Areas"
            <div className="flex-1 flex flex-col">
              <div className="mb-4">
                <p className="text-xs text-gray-400 leading-relaxed">
                  Improve your mastery by practicing these struggling topics:
                </p>
              </div>

              <div className="space-y-2.5">
                {weakTopics.slice(0, 3).map((item, idx) => (
                  <div
                    key={idx}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-red-500/5 hover:bg-red-500/10 p-3 rounded-lg border border-red-500/10 transition-colors group/weak"
                  >
                    <div className="flex items-center justify-between sm:justify-start gap-3 flex-1 min-w-0">
                      <div className="min-w-0">
                        <span className="text-sm font-medium text-gray-200 truncate block group-hover/weak:text-red-300 transition-colors">
                          {item.topic}
                        </span>
                        <span className="text-[10px] text-red-400 font-medium">
                          Avg. Score: {item.avg}%
                        </span>
                      </div>
                    </div>

                    {/* Action Buttons for Weak Topics */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        title="Ask AI Tutor"
                        onClick={() =>
                          navigate("/tutor", { state: { filename: filename } })
                        }
                        className="p-1.5 text-gray-400 hover:text-indigo-400 hover:bg-indigo-500/10 rounded transition-colors"
                      >
                        <MessageCircle className="w-4 h-4" />
                      </button>
                      <button
                        title="Practice Topic"
                        onClick={() =>
                          navigate("/quiz", {
                            state: {
                              filename: filename,
                              topic: item.topic,
                            },
                          })
                        }
                        className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-medium rounded border border-red-500/20 transition-colors flex items-center gap-1.5"
                      >
                        <Play className="w-3 h-3 fill-current" /> Practice
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            // Layout for "Great Job"
            <div className="h-full flex flex-col justify-center items-center text-center py-4">
              <div className="w-14 h-14 bg-green-500/10 rounded-full flex items-center justify-center mb-3 ring-1 ring-green-500/20">
                <TrendingUp className="w-7 h-7 text-green-400" />
              </div>
              <p className="text-base font-bold text-green-400 mb-1">
                All Systems Go!
              </p>
              <p className="text-xs text-gray-400 max-w-[200px]">
                You're performing well across all topics. Try a new book or
                maintain your streak!
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BookCard;
