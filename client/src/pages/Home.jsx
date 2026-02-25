import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";
import ResultsGrid from "../components/ResultsGrid";
import { useUser } from "@clerk/clerk-react";

import EmptyState from "../components/EmptyState";
import PageLoading from "../components/PageLoading";
import VoiceAssistant from "../components/VoiceAssistant";
import TodaysHighlights from "../components/TodaysHighlights";
import Footer from "../components/Footer";

const Home = () => {
  const { user, isLoaded } = useUser();
  const [files, setFiles] = useState([]);
  const { getToken, userId } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [groupedResults, setGroupedResults] = useState({});
  const API_BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
  
  const fetchResults = async () => {
    console.log("STARTING result FETCH...");
    try {
      const token = await getToken();
      const response = await fetch(`${API_BASE_URL}/quiz/results`, {
        headers: { Authorization: `Bearer ${token}`, "user-id": userId },
      });
      const data = await response.json();
      const grouped = data.results.reduce((acc, item) => {
        if (!acc[item.filename]) acc[item.filename] = [];
        acc[item.filename].push(item);
        return acc;
      }, {});
      setGroupedResults(grouped);
    } catch (error) {
      console.error("Error loading results:", error);
    }
  };

  const fetchFiles = async () => {
    console.log("STARTING FILE FETCH...");
    try {
      const token = await getToken();
      const response = await fetch(`${API_BASE_URL}/files/fetch-files`, {
        headers: { Authorization: `Bearer ${token}`, "user-id": userId },
      });

      const data = await response.json();

      console.log("Raw Backend Response:", data);

      const fileList = Array.isArray(data) ? data : data.files || [];

      setFiles(fileList);
    } catch (error) {
      console.error("Error fetching files:", error);
    }
  };

 
  useEffect(() => {
    const loadAllData = async () => {
      if (!userId) return;

      setLoading(true);
      try {
        // Run all fetches in parallel
        await Promise.all([
          fetchResults(),
          fetchFiles(),
        ]);
      } catch (error) {
        console.error("Error fetching initial data", error);
      } finally {
        setLoading(false);
      }
    };

    loadAllData();
  }, [userId]);

  if (loading) {
    return <PageLoading />;
  }

  if (files.length === 0) {
    return <EmptyState />;
  }
  const allResults = Object.values(groupedResults).flat();

  const handleDeleteBook = async (filename) => {
    try {
      const token = await getToken();

      const response = await fetch(`${API_BASE_URL}/files/delete-book`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "user-id": userId,
        },
        body: JSON.stringify({ filename }),
      });

      if (!response.ok) throw new Error("Delete failed");

      setGroupedResults((prev) => {
        const newResults = { ...prev };
        delete newResults[filename];
        return newResults;
      });

      console.log(`Successfully deleted ${filename}`);
    } catch (error) {
      console.error("Error deleting book:", error);
      alert("Failed to delete book. Please try again.");
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-10 animate-in fade-in duration-500 pb-10">
      {allResults.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-1 bg-indigo-500 rounded-full"></div>{" "}
            {/* Accent Bar */}
            <div>
              <h3 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
                Daily Recap
              </h3>
              <p className="text-sm text-slate-400">
                Your performance summary and key insights for today.
              </p>
            </div>
          </div>
          <TodaysHighlights results={allResults} />
        </section>
      )}

      <VoiceAssistant userId={user.id} />

      <section className="space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight">
              Study Materials & Progress
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Access your uploaded documents and review quiz scores.
            </p>
          </div>
          {/* Optional: 'Upload New' button could go here */}
        </div>

        <div className="min-h-[200px]">
          {/* Pass a prop to ResultsGrid to handle empty states nicely */}
          <ResultsGrid
            groupedResults={groupedResults}
            onDelete={handleDeleteBook}
          />
        </div>
      </section>
      <Footer />
    </div>
  );
};

export default Home;
