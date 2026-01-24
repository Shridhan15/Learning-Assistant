import React, { useState, useRef, useEffect } from "react";
import { useUser, useAuth } from "@clerk/clerk-react";
import {
  FaPlay,
  FaPodcast,
  FaWaveSquare,
  FaHeadphonesAlt,
} from "react-icons/fa";

const DailyPodcast = () => {
  const { user } = useUser();
  const { getToken } = useAuth();
  const [audioUrl, setAudioUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false); // Track if audio is actually playing
  const audioRef = useRef(null);

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
        setStatusMessage("No mistakes found yesterday! Great work.");
      } else {
        setStatusMessage("System busy. Try again later.");
      }
    } catch (error) {
      console.error("Podcast Error:", error);
      setStatusMessage("Connection failed.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full relative group">
      {/* 1. Background Glow & Mesh */}
      <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-600 rounded-2xl opacity-20 blur-lg group-hover:opacity-40 transition duration-1000"></div>

      {/* 2. Main Card */}
      <div className="relative bg-[#09090b] border border-white/10 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-8 shadow-2xl overflow-hidden">
        {/* Decorative Grid Background (Subtle) */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] opacity-20 pointer-events-none" />

        {/* --- LEFT: INFO SECTION --- */}
        <div className="flex items-start gap-6 w-full md:w-auto z-10">
          {/* Icon Box with Pulse */}
          <div className="relative">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-gray-800 to-gray-900 border border-white/10 flex items-center justify-center text-cyan-400 shadow-inner">
              {isLoading ? (
                <FaWaveSquare className="text-2xl animate-pulse" />
              ) : (
                <FaPodcast className="text-3xl" />
              )}
            </div>
            {/* Status Dot */}
            <div
              className={`absolute -top-1 -right-1 h-3 w-3 rounded-full border-2 border-[#09090b] ${audioUrl ? "bg-green-500 animate-pulse" : "bg-gray-600"}`}
            ></div>
          </div>

          <div className="space-y-1">
            <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              Daily Smart Briefing
              {audioUrl && (
                <span className="text-[10px] font-bold bg-green-500/20 text-green-400 px-2 py-0.5 rounded border border-green-500/30 uppercase tracking-widest">
                  Live
                </span>
              )}
            </h2>
            <p className="text-gray-400 text-sm max-w-md leading-relaxed">
              {statusMessage || (
                <>
                  Your AI-generated audio digest. We analyze yesterday's{" "}
                  <span className="text-white font-medium">mistakes</span> and
                  create a personalized lesson plan.
                </>
              )}
            </p>
          </div>
        </div>

        {/* --- RIGHT: ACTION SECTION --- */}
        <div className="w-full md:w-[400px] z-10 flex flex-col items-end gap-3">
          {/* STATE 1: LOADING */}
          {isLoading && (
            <div className="w-full h-14 bg-gray-800/50 rounded-xl border border-white/5 flex items-center justify-center gap-3 animate-pulse">
              <div className="flex gap-1">
                <div className="h-2 w-2 bg-cyan-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                <div className="h-2 w-2 bg-cyan-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                <div className="h-2 w-2 bg-cyan-500 rounded-full animate-bounce"></div>
              </div>
              <span className="text-xs font-bold text-cyan-400 uppercase tracking-widest">
                Synthesizing Voice
              </span>
            </div>
          )}

          {/* STATE 2: PLAY BUTTON (Idle) */}
          {!isLoading && !audioUrl && (
            <button
              onClick={handlePlay}
              disabled={!!statusMessage}
              className={`w-full group/btn relative flex items-center justify-between px-6 py-4 rounded-xl font-bold transition-all duration-300 border ${
                statusMessage
                  ? "bg-gray-800 border-gray-700 text-gray-500 cursor-not-allowed"
                  : "bg-white border-white text-black hover:bg-gray-100 hover:scale-[1.02] shadow-[0_0_20px_rgba(255,255,255,0.15)]"
              }`}
            >
              <div className="flex items-center gap-3">
                <FaPlay className="text-sm" />
                <span className="tracking-wide text-sm">
                  GENERATE MINI EPISODE
                </span>
              </div>
              <FaHeadphonesAlt className="text-gray-400 group-hover/btn:text-black transition-colors" />
            </button>
          )}

          {/* STATE 3: AUDIO PLAYER (Ready) */}
          {!isLoading && audioUrl && (
            <div className="w-full bg-[#18181b] border border-white/10 p-3 rounded-xl shadow-2xl flex flex-col gap-2">
              {/* Custom Visualizer Bars (CSS Animation) */}
              <div className="flex items-center justify-between px-1 mb-1">
                <span className="text-[10px] font-bold text-green-400 uppercase tracking-widest flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />{" "}
                  Now Playing
                </span>
                <div className="flex items-end gap-0.5 h-3">
                  {[...Array(8)].map((_, i) => (
                    <div
                      key={i}
                      className="w-1 bg-green-500/50 rounded-t-sm animate-music-bar"
                      style={{
                        height: `${Math.random() * 100}%`,
                        animationDuration: `${0.5 + Math.random()}s`,
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* The Native Player */}
              <audio
                ref={audioRef}
                controls
                autoPlay
                src={audioUrl}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                className="w-full h-8 custom-audio-player"
                style={{ filter: "invert(1) hue-rotate(180deg) contrast(0.8)" }} // Dark Mode Hack
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DailyPodcast;
