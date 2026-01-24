import React, { useState } from "react";
import { useUser } from "@clerk/clerk-react";
import { FaPlay, FaPause, FaHeadphones } from "react-icons/fa"; 
import { useAuth } from "@clerk/clerk-react";

const DailyPodcast = () => {
  const { user } = useUser();
  const { getToken, userId } = useAuth();
  const [audioUrl, setAudioUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);   

  
  const API_BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

  const handlePlay = async () => { 
    if (audioUrl) return;

    setIsLoading(true);
    setStatusMessage(null);

    try { 
      const token = await getToken();

      const response = await fetch(`${API_BASE_URL}/daily-podcast`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`, 
          "user-id": user.id, 
        }, 
        body: JSON.stringify({ user_id: user.id }),
      });

      const data = await response.json();

      if (response.ok && data.url) {
        setAudioUrl(data.url);
      } else if (data.status === "no_data") {
        setStatusMessage("No mistakes recorded yesterday! Great job.");
      } else {
        setStatusMessage("Could not generate briefing. Try again later.");
      }
    } catch (error) {
      console.error("Podcast Error:", error);
      setStatusMessage("Server connection failed.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-indigo-900 via-purple-900 to-gray-900 rounded-2xl border border-indigo-500/30 shadow-2xl p-1">
      {/* Background Ambience */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

      <div className="relative z-10 bg-gray-900/40 backdrop-blur-sm rounded-xl p-6 md:p-10 flex flex-col md:flex-row items-center justify-between gap-8 h-full">
        {/* Left: Text Info */}
        <div className="flex-1 text-center md:text-left space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-bold uppercase tracking-wider">
            <FaHeadphones className="text-sm" />
            <span>Daily Audio Briefing</span>
          </div>

          <h2 className="text-2xl md:text-3xl font-bold text-white leading-tight">
            Your Morning Recap
          </h2>

          <p className="text-indigo-200/80 text-sm md:text-base max-w-md">
            {statusMessage ||
              "Listen to a personalized deep-dive into yesterday's mistakes. AI-generated, just for you."}
          </p>
        </div>
 
        <div className="flex-shrink-0"> 
          {isLoading && (
            <div className="flex flex-col items-center justify-center w-24 h-24 rounded-full bg-gray-800 border border-gray-700">
              <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-[10px] text-gray-400 mt-2 font-mono">
                BUILDING
              </span>
            </div>
          )}
 
          {!isLoading && !audioUrl && (
            <button
              onClick={handlePlay}
              disabled={!!statusMessage}  
              className={`group relative flex items-center justify-center w-20 h-20 md:w-24 md:h-24 bg-white rounded-full shadow-lg hover:scale-105 transition-transform duration-300 ${statusMessage ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <FaPlay className="text-3xl md:text-4xl text-indigo-900 ml-2 group-hover:text-indigo-700 transition-colors" />

               
              {!statusMessage && (
                <div className="absolute inset-0 rounded-full border-4 border-white/30 animate-[ping_2s_ease-in-out_infinite]"></div>
              )}
            </button>
          )}
 
          {!isLoading && audioUrl && (
            <div className="w-full md:w-80 bg-gray-800/80 p-3 rounded-lg border border-gray-600 backdrop-blur">
              <audio controls autoPlay src={audioUrl} className="w-full h-10" />
              <div className="text-center mt-2 text-xs text-green-400 flex items-center justify-center gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                Now Playing
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DailyPodcast;
