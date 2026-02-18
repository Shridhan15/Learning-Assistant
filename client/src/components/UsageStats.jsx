import React, { useEffect, useState } from "react";
import {
  FileText,
  Brain,
  MessageCircle,
  HelpCircle,
  Loader2,
  AlertCircle,
  Mic,
} from "lucide-react";

const StatItem = ({ icon, label, current, max, color, helper }) => {
  const percentage = Math.min((current / max) * 100, 100);
  const isFull = current >= max;

  return (
    <div className="bg-slate-800/30 rounded-xl p-3 relative overflow-hidden group border border-slate-700/30">
      <div className="flex justify-between items-center mb-2 z-10 relative">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-slate-900 rounded-lg border border-slate-700 text-slate-300">
            {icon}
          </div>
          <div>
            <span className="text-xs font-bold text-slate-200 block leading-tight">
              {label}
            </span>
            <span className="text-[10px] text-slate-500">
              {isFull ? "Limit Reached" : `${max - current} remaining`}
            </span>
          </div>
        </div>
        <div
          className={`text-[11px] font-bold px-2 py-0.5 rounded-md border ${
            isFull
              ? "bg-red-500/10 border-red-500/20 text-red-400"
              : "bg-slate-900 border-slate-700 text-slate-300"
          }`}
        >
          {current} <span className="text-slate-500 font-normal">/ {max}</span>
        </div>
      </div>

      {/* Progress Bar - Slimmer height */}
      <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800">
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${color} ${
            isFull ? "animate-pulse" : ""
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {helper && isFull && (
        <div className="mt-1.5 text-[9px] text-red-400 flex items-center gap-1 font-medium">
          <AlertCircle className="w-2.5 h-2.5" /> {helper}
        </div>
      )}
    </div>
  );
};

const UsageStats = ({ getToken, userId, API_BASE_URL, className }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;

    const fetchUsage = async () => {
      try {
        const token = await getToken();
        const res = await fetch(`${API_BASE_URL}/api/usage`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "user-id": userId,
          },
        });

        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch (err) {
        console.error("Failed to load usage:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchUsage();
  }, [userId, getToken]);

  const getThemeColor = (current, max) => {
    const percentage = (current / max) * 100;
    if (percentage >= 100) return "bg-red-500";
    if (percentage > 85) return "bg-amber-500";
    return "bg-indigo-500"; // Matches your Indigo branding
  };

  if (loading)
    return (
      <div className="h-full flex items-center justify-center text-slate-400">
        <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
      </div>
    );

  return (
    <div className={`bg-transparent text-white h-full flex flex-col ${className}`}>
      {/* Header - More compact */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div>
          <p className="text-[10px] text-slate-500 uppercase tracking-wider">
            Resets at midnight IST
          </p>
        </div>
      </div>

      {/* Grid/List - Reduced gap */}
      <div className="flex-1 flex flex-col gap-2 overflow-y-auto no-scrollbar">
        <StatItem
          icon={<FileText className="w-3.5 h-3.5 text-indigo-400" />}
          label="Documents Uploaded"
          current={stats.total_files_uploaded}
          max={stats.limit_files}
          color={getThemeColor(stats.total_files_uploaded, stats.limit_files)}
          helper="Storage full. Delete old files."
        />

        <StatItem
          icon={<Brain className="w-3.5 h-3.5 text-indigo-400" />}
          label="Quiz Questions"
          current={stats.daily_quiz_questions}
          max={stats.limit_quiz}
          color={getThemeColor(stats.daily_quiz_questions, stats.limit_quiz)}
        />

        <StatItem
          icon={<HelpCircle className="w-3.5 h-3.5 text-indigo-400" />}
          label="AI Tutor"
          current={stats.daily_tutor_questions}
          max={stats.limit_tutor}
          color={getThemeColor(stats.daily_tutor_questions, stats.limit_tutor)}
        />

        <StatItem
          icon={<Mic className="w-3.5 h-3.5 text-indigo-400" />}
          label="Voice Coach"
          current={stats.daily_coach_msgs}
          max={stats.limit_coach}
          color={getThemeColor(stats.daily_coach_msgs, stats.limit_coach)}
        />
      </div>
    </div>
  );
};

export default UsageStats;
