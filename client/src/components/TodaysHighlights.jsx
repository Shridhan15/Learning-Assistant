import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Trophy,
  Target,
  ClipboardList,
  AlertTriangle,
  TrendingUp,
  Sparkles,
  ArrowRight,
  Clock,
  BookOpen,
  CalendarDays,
} from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, Tooltip, XAxis } from "recharts";
 
function MonthlyHeatmap({ data = [] }) {
  const calendarData = useMemo(() => {
    const today = new Date();
    const daysMap = {};
    const result = [];

    for (let i = 27; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const dateKey = d.toISOString().split("T")[0];
      const readableDate = d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });

      daysMap[dateKey] = { date: dateKey, readableDate, count: 0 };
      result.push(daysMap[dateKey]);
    }

    data.forEach((item) => {
      if (!item.created_at) return;
      const itemDate = new Date(item.created_at).toISOString().split("T")[0];
      if (daysMap[itemDate]) {
        daysMap[itemDate].count += 1;
      }
    });

    return result;
  }, [data]);

  const getColor = (count) => {
    if (count === 0) return "bg-white/5 border-transparent";
    if (count <= 2) return "bg-indigo-500/30 border-indigo-500/50";
    if (count <= 5) return "bg-indigo-500/60 border-indigo-500/80";
    return "bg-indigo-400 border-indigo-300 shadow-[0_0_8px_rgba(129,140,248,0.6)]";
  };

  return (
    <div className="h-full flex flex-col justify-between">
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-1.5 text-white/90 font-medium text-xs">
          <CalendarDays className="w-3.5 h-3.5 text-indigo-400" />
          <span>Consistency</span>
        </div>
        <div className="text-[10px] text-white/40">28 Days</div>
      </div>

      <div className="flex-1 flex items-center justify-center">
        <div className="grid grid-cols-7 gap-1.5">
          {calendarData.map((day) => (
            <div key={day.date} className="group/day relative">
              <div
                className={`w-5 h-5 rounded-[3px] border transition-all duration-300 ${getColor(day.count)} hover:scale-110 cursor-default`}
              />
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max px-2 py-1 bg-gray-900 border border-white/10 text-white text-[10px] font-medium rounded shadow-xl opacity-0 group-hover/day:opacity-100 transition-opacity pointer-events-none z-50 whitespace-nowrap">
                {day.readableDate} •{" "}
                <span className="text-indigo-400">{day.count} Quizzes</span>
                <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900/50" />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-center gap-2 text-[9px] text-white/30">
        <span>Less</span>
        <div className="flex gap-1">
          <div className="w-2 h-2 rounded-[1px] bg-white/5" />
          <div className="w-2 h-2 rounded-[1px] bg-indigo-500/30" />
          <div className="w-2 h-2 rounded-[1px] bg-indigo-500/60" />
          <div className="w-2 h-2 rounded-[1px] bg-indigo-400" />
        </div>
        <span>More</span>
      </div>
    </div>
  );
}

// --- 2. Stat Chip ---
function StatChip({
  icon: Icon,
  label,
  value,
  subtext,
  accentColor = "text-white",
}) {
  return (
    <div className="relative group overflow-hidden rounded-lg sm:rounded-xl border border-white/5 bg-gray-900/40 p-2 sm:p-2.5 backdrop-blur-sm transition-all hover:bg-gray-900/60 hover:border-white/10">
      <div className="flex items-start justify-between gap-1">
        <div className="flex flex-col min-w-0">
          <span className="text-[9px] sm:text-[10px] uppercase tracking-wider font-semibold text-white mb-0.5">
            {label}
          </span>
          <span
            className={`text-sm sm:text-lg font-bold tracking-tight truncate leading-tight ${accentColor}`}
          >
            {value}
          </span>
        </div>
        <div className="p-1 sm:p-1.5 rounded-md sm:rounded-lg bg-white/5 text-gray-400 group-hover:text-white group-hover:bg-white/10 transition-colors shrink-0">
          <Icon className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
        </div>
      </div>
      {subtext && (
        <div className="mt-1.5 sm:mt-2 pt-1.5 sm:pt-2 border-t border-white/5">
          <p className="text-[9px] sm:text-[10px] text-gray-500 truncate font-medium leading-none">
            {subtext}
          </p>
        </div>
      )}
    </div>
  );
}
 
const pct = (score, total) =>
  total > 0 ? Math.round((Number(score) / Number(total)) * 100) : 0;

export function isBetween10pmAnd12amLocal() {
  const now = new Date();
  const h = now.getHours();
  return h >= 20 && h < 24;
}

export default function TodaysHighlights({ results = [] }) {
  const navigate = useNavigate();
  const show = useMemo(() => isBetween10pmAnd12amLocal(), []);

  const stats = useMemo(() => {
    const now = new Date();
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);

    const todaysResults = (results || []).filter((r) => {
      const t = new Date(r.created_at);
      return t >= start && t <= now;
    });

    if (!todaysResults.length) return null;

    const sorted = [...todaysResults].sort(
      (a, b) => new Date(a.created_at) - new Date(b.created_at),
    );

    const attempts = sorted.length;

    const totalPct = sorted.reduce(
      (acc, r) => acc + pct(r.score, r.total_questions),
      0,
    );
    const avgPercent = Math.round(totalPct / attempts);

    const bestRun = sorted.reduce((prev, curr) =>
      pct(prev.score, prev.total_questions) >
      pct(curr.score, curr.total_questions)
        ? prev
        : curr,
    );

    const worstRun = sorted.reduce((prev, curr) =>
      pct(prev.score, prev.total_questions) <
      pct(curr.score, curr.total_questions)
        ? prev
        : curr,
    );

    const trendData = sorted.map((r, idx) => ({
      name: idx + 1,
      percent: pct(r.score, r.total_questions),
      topic: r.topic,
    }));

    return {
      attempts,
      avgPercent,
      bestRun: {
        ...bestRun,
        percent: pct(bestRun.score, bestRun.total_questions),
      },
      worstRun: {
        ...worstRun,
        percent: pct(worstRun.score, worstRun.total_questions),
      },
      trendData,
    };
  }, [results]);

  if (!show) return null;

  return (
    <div className="w-full bg-gray-900/50 border border-white/10 rounded-2xl transition-all duration-300 shadow-xl shadow-black/20 group backdrop-blur-md">
      {/* Content */}
      <div className="p-4 sm:p-5">
        {!stats ? (
          <div className="py-8 flex flex-col items-center justify-center text-center border border-dashed border-white/10 rounded-xl bg-white/5">
            <div className="p-2 bg-gray-800 rounded-full mb-2 text-gray-400">
              <Clock className="w-5 h-5" />
            </div>
            <h3 className="text-white font-medium text-xs">No quizzes today</h3>
            <button
              onClick={() => navigate("/quiz")}
              className="mt-3 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold rounded-full transition-all flex items-center gap-1.5"
            >
              Start Quiz <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-4"> 
            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
              <StatChip
                icon={ClipboardList}
                label="Quizzes"
                value={stats.attempts}
                subtext="Attempts today"
              />
              <StatChip
                icon={Target}
                label="Avg Score"
                value={`${stats.avgPercent}%`}
                accentColor={
                  stats.avgPercent >= 80
                    ? "text-emerald-400"
                    : stats.avgPercent >= 50
                      ? "text-yellow-400"
                      : "text-red-400"
                }
                subtext="Overall accuracy"
              />
              <StatChip
                icon={Trophy}
                label="Best"
                value={`${stats.bestRun.percent}%`}
                accentColor="text-indigo-400"
                subtext={stats.bestRun.topic}
              />
              <StatChip
                icon={AlertTriangle}
                label="Focus"
                value={`${stats.worstRun.percent}%`}
                accentColor="text-red-400"
                subtext={stats.worstRun.topic}
              />
            </div>

            {/* Charts Section */}
            <div className="flex flex-col md:flex-row gap-4">
              {/* Left: Heatmap */}
              <div className="w-full md:w-auto shrink-0 rounded-xl border border-white/5 bg-black/20 p-3 flex flex-col justify-center">
                <MonthlyHeatmap data={results} />
              </div>

              {/* Right: Chart */} 
              <div className="flex-1 min-w-0 rounded-xl border border-white/5 bg-black/20 p-3 relative">
                {/* Header */}
                <div className="flex items-center gap-2 mb-2 text-[11px] font-medium text-gray-400 px-1">
                  <TrendingUp className="w-3 h-3 text-emerald-400" />
                  Score Trajectory
                </div>
 
                <div className="w-full h-37.5">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={stats.trendData}
                      margin={{ top: 5, right: 0, left: -20, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient
                          id="colorScore"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor="#818cf8"
                            stopOpacity={0.3}
                          />
                          <stop
                            offset="95%"
                            stopColor="#818cf8"
                            stopOpacity={0}
                          />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="name" hide />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-gray-950 border border-white/10 rounded-lg p-2 shadow-xl backdrop-blur-md z-[60]">
                                <p className="text-white text-[10px] mb-0.5">
                                  {data.topic}
                                </p>
                                <p className="text-indigo-400 font-bold text-xs">
                                  {data.percent}%
                                </p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="percent"
                        stroke="#818cf8"
                        strokeWidth={2}
                        fill="url(#colorScore)"
                        dot={{
                          r: 2,
                          fill: "#818cf8",
                          stroke: "#111827",
                          strokeWidth: 1,
                        }}
                        activeDot={{ r: 4, fill: "#fff" }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
 
            <div className="w-full py-2 rounded-lg bg-white/2 border border-white/5 text-center mt-1 hidden md:block">
              <p className="text-[11px] font-medium text-gray-500 flex items-center justify-center gap-1.5">
                <BookOpen className="w-3 h-3 text-indigo-400/70" />
                Learn and practice to improve stats
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
