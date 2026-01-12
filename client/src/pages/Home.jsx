import React, { useEffect, useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";
import ResultsGrid from "../components/ResultsGrid";

import {
  BookOpen,
  Calendar,
  Trophy,
  ArrowRight,
  Loader2,
  BrainCircuit,
} from "lucide-react";

const Home = () => {
  const { getToken, userId } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [groupedResults, setGroupedResults] = useState({});

  useEffect(() => {
    fetchResults();
  }, []);

  const fetchResults = async () => {
    try {
      const token = await getToken();
      // Replace with your actual backend URL
      const response = await fetch("http://127.0.0.1:8000/results", {
        headers: {
          Authorization: `Bearer ${token}`,
          "user-id": userId,
        },
      });
      const data = await response.json();

      // Turn flat list into { "book1.pdf": [quiz1, quiz2], ... }
      const grouped = data.results.reduce((acc, item) => {
        if (!acc[item.filename]) {
          acc[item.filename] = [];
        }
        acc[item.filename].push(item);
        return acc;
      }, {});

      setGroupedResults(grouped);
    } catch (error) {
      console.error("Error loading home:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-white">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  // --- EMPTY STATE (New User) ---
  if (Object.keys(groupedResults).length === 0) {
    return (
      <div className="text-center py-20 animate-in fade-in zoom-in duration-500">
        <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6 border border-white/10">
          <BrainCircuit className="w-12 h-12 text-indigo-400" />
        </div>
        <h2 className="text-3xl font-bold text-white mb-4">
          Welcome to QuizMaster
        </h2>
        <p className="text-gray-400 max-w-md mx-auto mb-8">
          You haven't taken any quizzes yet. Upload a PDF to generate your first
          AI-powered quiz!
        </p>
        <button
          onClick={() => navigate("/quiz")}
          className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full font-bold transition-all shadow-lg shadow-indigo-500/25 flex items-center gap-2 mx-auto"
        >
          Start Learning <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    );
  }
 
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Your Progress</h1>
          <p className="text-gray-400 mt-1">
            Track your performance across your library
          </p>
        </div>
        <button
          onClick={() => navigate("/quiz")}
          className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg font-medium transition-all flex items-center gap-2 border border-white/10"
        >
          <BookOpen className="w-4 h-4" /> New Quiz
        </button>
      </div>
 
      <ResultsGrid groupedResults={groupedResults} />
    </div>
  );
};

export default Home;
