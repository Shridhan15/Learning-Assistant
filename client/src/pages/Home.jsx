import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";
import ResultsGrid from "../components/ResultsGrid";
import { useUser } from "@clerk/clerk-react";
 
import EmptyState from "../components/EmptyState";
import PageLoading from "../components/PageLoading";
import VoiceAssistant from "../components/VoiceAssistant";
import TodaysHighlights, {
  isBetween10pmAnd12amLocal,
} from "../components/TodaysHighlights";
import StudyCalendar from "../components/StudyCalendar/StudyCalendar";
import UsageStats from "../components/UsageStats";

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
    <div className="max-w-7xl mx-auto space-y-10 animate-in fade-in duration-500 pb-10">
      
      {showHighlights && allResults.length > 0 && (
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
 
      <section>
        {/* Section Header */}
        <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
              Command Center
            </h2>
            <p className="text-slate-400 mt-1">
              Manage your limits and schedule your success.
            </p>
          </div>
 
        </div>

        {/* The Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full items-stretch">
        
          <div className="w-full lg:col-span-1 h-full"> 
            <UsageStats
              userId={userId}
              getToken={getToken}
              API_BASE_URL={API_BASE_URL}
              className="h-full shadow-lg shadow-indigo-500/5"
            />
          </div>
 
          <div className="w-full lg:col-span-2 h-full flex flex-col">
            <div className="flex-1 min-h-[550px] bg-slate-900/50 border border-slate-800 rounded-xl p-1 shadow-lg shadow-indigo-500/5 overflow-hidden">
              <StudyCalendar
                events={calendarEvents}
                onAddEvent={handleAddEvent}
              />
            </div>
          </div>
        </div>
      </section>
 

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
    </div>
  );
};

export default Home;
