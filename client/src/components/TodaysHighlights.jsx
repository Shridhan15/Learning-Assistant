import React, { useMemo } from "react";
import {
  Trophy,
  Target,
  ClipboardList,
  AlertTriangle,
  Flame,
  TrendingUp,
  Sparkles,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const pct = (score, total) =>
  total > 0 ? Math.round((Number(score) / Number(total)) * 100) : 0;

function getStartOfTodayLocal() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function isBetween10pmAnd12amLocal() {
  const now = new Date();
  const h = now.getHours();
  return h >= 10 && h < 13;
}

function StatChip({ icon: Icon, label, value, hint }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-3 backdrop-blur">
      <div className="flex items-center gap-2 text-white/70 text-xs">
        <Icon className="w-4 h-4" />
        <span>{label}</span>
      </div>
      <div className="mt-1 text-white font-semibold text-lg">{value}</div>
      {hint ? <div className="text-white/40 text-xs mt-0.5">{hint}</div> : null}
    </div>
  );
}

export default function TodaysHighlights({ results = [] }) {
  const show = useMemo(() => isBetween10pmAnd12amLocal(), []);

  const todaysResults = useMemo(() => {
    const now = new Date();
    const start = new Date(now);
    start.setDate(now.getDate() - 2); // ✅ include past 2 days
    start.setHours(0, 0, 0, 0); // start from 12 AM of that day

    return (results || []).filter((r) => {
      const t = new Date(r.created_at);
      return t >= start && t <= now;
    });
  }, [results]);

  const stats = useMemo(() => {
    if (!todaysResults.length) return null;

    const sorted = [...todaysResults].sort(
      (a, b) => new Date(a.created_at) - new Date(b.created_at),
    );

    const percents = sorted.map((r) => pct(r.score, r.total_questions));
    const attempts = percents.length;

    const avgPercent =
      attempts > 0
        ? Math.round(percents.reduce((a, b) => a + b, 0) / attempts)
        : 0;

    const bestPercent = Math.max(...percents);
    const worstPercent = Math.min(...percents);

    const last = sorted[sorted.length - 1];

    // Topic-wise avg
    const topicMap = {};
    sorted.forEach((r) => {
      const p = pct(r.score, r.total_questions);
      if (!topicMap[r.topic]) topicMap[r.topic] = [];
      topicMap[r.topic].push(p);
    });

    const topicAvg = Object.entries(topicMap).map(([topic, vals]) => ({
      topic,
      avg: Math.round(vals.reduce((a, b) => a + b, 0) / vals.length),
      count: vals.length,
    }));

    const strongest = [...topicAvg].sort((a, b) => b.avg - a.avg)[0];
    const weakest = [...topicAvg].sort((a, b) => a.avg - b.avg)[0];
    const mostPracticed = [...topicAvg].sort((a, b) => b.count - a.count)[0];

    // Trend data
    const trendData = sorted.map((r, idx) => ({
      name: `#${idx + 1}`,
      percent: pct(r.score, r.total_questions),
    }));

    return {
      attempts,
      avgPercent,
      bestPercent,
      worstPercent,
      last,
      strongest,
      weakest,
      mostPracticed,
      trendData,
    };
  }, [todaysResults]);

  if (!show) return null;

  return (
    <div className="w-full rounded-3xl border border-white/10 bg-white/5 backdrop-blur p-5 sm:p-6 shadow-xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-white font-semibold text-xl sm:text-2xl">
            <Sparkles className="w-5 h-5" />
            Today’s Highlights
          </div>
          <div className="text-white/50 text-sm mt-1">
            Your quiz recap (updates live till midnight)
          </div>
        </div>

        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/10 text-white/70 text-xs">
          <TrendingUp className="w-4 h-4" />
          <span>10 PM – 12 AM</span>
        </div>
      </div>

      {/* If no quizzes today */}
      {!stats ? (
        <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="text-white font-semibold text-lg">
            No quizzes today
          </div>
          <div className="text-white/50 text-sm mt-1">
            Try 1 quick quiz tomorrow — I’ll start tracking your highlights 🔥
          </div>
        </div>
      ) : (
        <>
          {/* Stats row */}
          <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatChip
              icon={ClipboardList}
              label="Quizzes"
              value={stats.attempts}
              hint="attempted today"
            />
            <StatChip
              icon={Target}
              label="Avg Score"
              value={`${stats.avgPercent}%`}
              hint="overall today"
            />
            <StatChip
              icon={Trophy}
              label="Best"
              value={`${stats.bestPercent}%`}
              hint="highest attempt"
            />
            <StatChip
              icon={AlertTriangle}
              label="Lowest"
              value={`${stats.worstPercent}%`}
              hint="needs focus"
            />
          </div>

          {/* Charts */}
          <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Donut */}
            <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
              <div className="text-white/70 text-sm font-medium">
                Today Avg (Ring)
              </div>

              <div className="mt-3 h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: "Done", value: stats.avgPercent },
                        {
                          name: "Left",
                          value: Math.max(0, 100 - stats.avgPercent),
                        },
                      ]}
                      dataKey="value"
                      innerRadius={55}
                      outerRadius={75}
                      paddingAngle={2}
                      stroke="transparent"
                    >
                      <Cell />
                      <Cell />
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="text-center -mt-24">
                <div className="text-white text-3xl font-bold">
                  {stats.avgPercent}%
                </div>
                <div className="text-white/50 text-xs mt-1">
                  overall performance
                </div>
              </div>
            </div>

            {/* Trend */}
            <div className="rounded-3xl border border-white/10 bg-white/5 p-4 md:col-span-2">
              <div className="flex items-center justify-between">
                <div className="text-white/70 text-sm font-medium">
                  Score Trend (Today)
                </div>
                <div className="text-white/40 text-xs">
                  attempts: {stats.trendData.length}
                </div>
              </div>

              <div className="mt-3 h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={stats.trendData}>
                    <XAxis dataKey="name" hide />
                    <Tooltip
                      contentStyle={{
                        background: "rgba(0,0,0,0.8)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: 12,
                        color: "white",
                        fontSize: 12,
                      }}
                      labelStyle={{ color: "rgba(255,255,255,0.6)" }}
                    />
                    <Line
                      type="monotone"
                      dataKey="percent"
                      strokeWidth={3}
                      dot={{ r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Topic pills */}
              <div className="mt-4 flex flex-col sm:flex-row gap-3">
                <div className="flex-1 rounded-2xl border border-white/10 bg-white/5 p-3">
                  <div className="text-white/50 text-xs">💪 Strong Today</div>
                  <div className="text-white font-semibold mt-1">
                    {stats.strongest?.topic || "—"}{" "}
                    <span className="text-white/50 font-normal">
                      ({stats.strongest?.avg || 0}%)
                    </span>
                  </div>
                </div>

                <div className="flex-1 rounded-2xl border border-white/10 bg-white/5 p-3">
                  <div className="text-white/50 text-xs">⚠️ Improve</div>
                  <div className="text-white font-semibold mt-1">
                    {stats.weakest?.topic || "—"}{" "}
                    <span className="text-white/50 font-normal">
                      ({stats.weakest?.avg || 0}%)
                    </span>
                  </div>
                </div>

                <div className="flex-1 rounded-2xl border border-white/10 bg-white/5 p-3">
                  <div className="text-white/50 text-xs flex items-center gap-1">
                    <Flame className="w-4 h-4" /> Most Practiced
                  </div>
                  <div className="text-white font-semibold mt-1">
                    {stats.mostPracticed?.topic || "—"}{" "}
                    <span className="text-white/50 font-normal">
                      ({stats.mostPracticed?.count || 0}x)
                    </span>
                  </div>
                </div>
              </div>

              {/* Last quiz */}
              <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-3">
                <div className="text-white/50 text-xs">Last Quiz</div>
                <div className="text-white font-semibold mt-1">
                  {stats.last?.topic || "—"}{" "}
                  <span className="text-white/50 font-normal">
                    ({stats.last?.score}/{stats.last?.total_questions} •{" "}
                    {pct(
                      stats.last?.score || 0,
                      stats.last?.total_questions || 1,
                    )}
                    %)
                  </span>
                </div>
              </div>

              {/* CTA */}
              <button className="mt-4 w-full rounded-2xl bg-white/10 hover:bg-white/15 border border-white/10 py-3 text-white font-semibold transition-all">
                Take a Quick Revision Quiz
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
