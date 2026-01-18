import React, { useEffect, useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";
import ResultsGrid from "../components/ResultsGrid";
import { useUser } from "@clerk/clerk-react";

import {
  BookOpen,
  Calendar,
  Trophy,
  ArrowRight,
  Loader2,
  BrainCircuit,
} from "lucide-react";
import EmptyState from "../components/EmptyState";
import PageLoading from "../components/PageLoading";
import VoiceAssistant from "../components/VoiceAssistant";
import TodaysHighlights from "../components/TodaysHighlights";

const Home = () => {
  const { user, isLoaded } = useUser();
  const { getToken, userId } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [groupedResults, setGroupedResults] = useState({});
  const API_BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

  useEffect(() => {
    fetchResults();
  }, []);

  const fetchResults = async () => {
    try {
      const token = await getToken();
      
      const response = await fetch(`${API_BASE_URL}/results`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "user-id": userId,
        },
      });
      const data = await response.json();
 
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
    return <PageLoading />;
  }

  if (Object.keys(groupedResults).length === 0) {
    return <EmptyState />;
  }

  const allResults = Object.values(groupedResults).flat();



  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <TodaysHighlights results={allResults} />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Your Progress</h1>
          <p className="text-gray-400 mt-1">
            Track your performance across your library
          </p>
        </div>
        
      </div>

      <VoiceAssistant userId={user.id} />

      <ResultsGrid groupedResults={groupedResults} />
    </div>
  );
};

export default Home;
