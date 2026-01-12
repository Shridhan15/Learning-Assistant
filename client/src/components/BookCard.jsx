import React from "react";
import { useNavigate } from "react-router-dom";
import {
  BookOpen,
  Calendar,
  AlertCircle,
  TrendingUp,
  ArrowRight,
  Clock,
  Target,
} from "lucide-react";

const BookCard = ({ filename, quizzes }) => {
  const navigate = useNavigate();

//    Identify Weak Areas 
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

  return ( 
    <div className="w-full bg-gray-900/50 border border-white/10 rounded-2xl overflow-hidden hover:border-indigo-500/30 transition-all duration-300 shadow-xl shadow-black/20">
      
      <div className="px-6 py-4 bg-white/5 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-2.5 bg-indigo-500/20 rounded-xl shrink-0">
            <BookOpen className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h3
              className="text-lg font-bold text-white truncate max-w-md"
              title={filename}
            >
              {filename}
            </h3>
            <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
              <Clock className="w-3 h-3" />
              Last active:{" "}
              {new Date(quizzes[0].created_at).toLocaleDateString()}
            </div>
          </div>
        </div>

        <button
          onClick={() => navigate("/quiz")}
          className="hidden sm:flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors shadow-lg shadow-indigo-500/20"
        >
          Take Quiz <ArrowRight className="w-4 h-4" />
        </button>
      </div>
 
      <div className="grid grid-cols-1 lg:grid-cols-5 divide-y lg:divide-y-0 lg:divide-x divide-white/5">
       
        <div className="lg:col-span-3 p-6">
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Calendar className="w-3 h-3" /> Recent Activity
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {quizzes.slice(0, 6).map((quiz, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors border border-transparent hover:border-white/10"
              >
                <div className="min-w-0 pr-2">
                  <p className="text-sm font-medium text-gray-200 truncate">
                    {quiz.topic}
                  </p>
                  <p className="text-[10px] text-gray-500 mt-0.5">
                    {new Date(quiz.created_at).toLocaleDateString()}
                  </p>
                </div>

                <div
                  className={`shrink-0 px-2 py-1 rounded text-xs font-bold ${
                    quiz.score / quiz.total_questions >= 0.7
                      ? "bg-green-500/20 text-green-400"
                      : "bg-amber-500/20 text-amber-400"
                  }`}
                >
                  {Math.round((quiz.score / quiz.total_questions) * 100)}%
                </div>
              </div>
            ))}
          </div>
        </div>
 
        <div className="lg:col-span-2 p-6 bg-black/20">
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Target className="w-3 h-3" /> AI Insights
          </h4>

          {weakTopics.length > 0 ? ( 
            <div className="p-5 bg-red-500/10 border border-red-500/20 rounded-xl h-full flex flex-col">
              <div className="flex items-center gap-2 mb-3 text-red-400">
                <AlertCircle className="w-5 h-5" />
                <span className="text-base font-bold">Focus Areas</span>
              </div>
              <p className="text-sm text-gray-400 mb-4 leading-relaxed">
                You are struggling with these topics. We recommend reviewing the
                material:
              </p>
              <div className="space-y-2 mt-auto">
                {weakTopics.slice(0, 3).map((item, idx) => (
                  <div
                    key={idx} 
                    className="flex justify-between items-center bg-black/20 px-4 py-3 rounded-lg border border-red-500/10"
                  >
 
                    <span className="text-sm font-medium text-gray-200 truncate flex-1 mr-4">
                      {item.topic}
                    </span>
                    <span className="text-sm font-mono text-red-400 font-bold">
                      {item.avg}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            // Layout for "Great Job"
            <div className="h-full flex flex-col justify-center items-center p-8 bg-green-500/5 border border-green-500/10 rounded-xl text-center">
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mb-4">
                <TrendingUp className="w-8 h-8 text-green-400" />
              </div>
              <p className="text-lg font-bold text-green-400 mb-2">
                Excellent Work!
              </p>
              <p className="text-sm text-gray-400 leading-relaxed max-w-xs">
                Your performance is strong across all topics in this book. Keep
                it up!
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BookCard;
