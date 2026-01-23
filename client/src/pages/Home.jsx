import React, { useEffect, useMemo, useState } from "react";
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
  Sparkle,
} from "lucide-react";
import EmptyState from "../components/EmptyState";
import PageLoading from "../components/PageLoading";
import VoiceAssistant from "../components/VoiceAssistant";
import TodaysHighlights, {
  isBetween10pmAnd12amLocal,
} from "../components/TodaysHighlights";
import StudyCalendar from "../components/StudyCalendar/StudyCalendar";

const Home = () => {
  const { user, isLoaded } = useUser();
  const { getToken, userId } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [groupedResults, setGroupedResults] = useState({});
  const API_BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
  const [calendarEvents, setCalendarEvents] = useState([]);

  const showHighlights = useMemo(() => isBetween10pmAnd12amLocal(), []);

  const fetchCalendarEvents = async () => {
    try {
      const token = await getToken();
      const response = await fetch(`${API_BASE_URL}/get-calendar-events`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "user-id": userId,
        },
      });
      const data = await response.json();

      const mappedEvents = data.events.map((ev) => ({ 
        ...ev,
        id: ev.id,
        title: ev.title,
        start: ev.start_time,
        end: ev.end_time,
        
        priority: ev.priority,
        category: ev.category,
      }));

      setCalendarEvents(mappedEvents);
    } catch (error) {
      console.error("Error fetching events:", error);
    }
  };
 
  const handleAddEvent = async (eventPayload) => {
    try {
      const token = await getToken();
      const response = await fetch(`${API_BASE_URL}/add-calendar-event`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "user-id": userId,
        },
        body: JSON.stringify(eventPayload),
      });

      if (response.ok) { 
        fetchCalendarEvents();
      }
    } catch (error) {
      console.error("Error saving event:", error);
    }
  };

  useEffect(() => {
    if (userId) fetchCalendarEvents();
  }, [userId]);

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

  useEffect(() => {
    fetchResults();
    fetchCalendarEvents();
  }, []);
  if (loading) {
    return <PageLoading />;
  }

  if (Object.keys(groupedResults).length === 0) {
    return <EmptyState />;
  }

  const allResults = Object.values(groupedResults).flat();

  const handleDeleteBook = async (filename) => {
    try {
      const token = await getToken();

      // FIX 2: Use API_BASE_URL and add Headers
      const response = await fetch(`${API_BASE_URL}/delete-book`, {
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
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      {showHighlights && allResults.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div>
              <h3 className="text-3xl font-bold text-white">Daily Recap</h3>
              <p className=" text-gray-400">
                Your performance summary for today
              </p>
            </div>
          </div>
          <TodaysHighlights results={allResults} />
        </div>
      )}
 
      <div className="space-y-1">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
              Study Schedule
            </h1>
            <p className="text-sm md:text-base text-slate-500 mt-1">
              Plan your sessions. Stay consistent. Learn faster.
            </p>
          </div>
        </div>

        <div className="h-[520px] md:h-[560px]">
          <StudyCalendar events={calendarEvents} onAddEvent={handleAddEvent} />
        </div>
      </div>

      {/* Progress Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Your Progress</h1>
          <p className="text-gray-400 mt-1">
            Track your performance and upcoming schedule
          </p>
        </div>
      </div>

      {/* Voice Assistant Section */}
      <VoiceAssistant userId={user.id} />

      {/* Library Results */}
      <div className="space-y-4">
        <ResultsGrid
          groupedResults={groupedResults}
          onDelete={handleDeleteBook}
        />
      </div>
    </div>
  );
};

export default Home;
