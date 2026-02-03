import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useNavigationGuard } from "../context/NavigationGuardContext";
import { Loader2, Save, X, FileText } from "lucide-react"; 

const SessionSummaryGate = ({
  open,
  pendingRoute,
  onClose,
  sessionMsgs,
  API_BASE_URL,
}) => {
  const navigate = useNavigate();
  const { registerGuard } = useNavigationGuard();

  const [mode, setMode] = useState("prompt");  
  const [summaryData, setSummaryData] = useState(null);  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!open) return null;

  const resumeNavigation = () => {
    registerGuard(null);
    onClose();
    navigate(pendingRoute);
  };

  const handleGenerateSummary = async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch(`${API_BASE_URL}/generate-summary`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: sessionMsgs }),
      });

      if (!res.ok) throw new Error("Failed to generate summary");

      const json = await res.json();
      setSummaryData(json.data);  
      setMode("summary");
    } catch (err) {
      console.error(err);
      setError("Could not generate summary. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm transition-all duration-300">
      <div
        className={`relative w-full mt-20 bg-gray-900 rounded-2xl border border-gray-700 shadow-2xl overflow-hidden transition-all duration-300 ${
          mode === "summary" ? "max-w-2xl scale-100" : "max-w-md scale-95"
        }`}
      > 
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />

        <div className="p-4">
          {/* ---------- PROMPT MODE ---------- */}
          {mode === "prompt" && (
            <div className="text-center space-y-6">
              <div className="mx-auto w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mb-4">
                <FileText className="w-8 h-8 text-indigo-400" />
              </div>

              <div>
                <h3 className="text-2xl font-bold text-white">
                  Save your progress?
                </h3>
                <p className="text-gray-400 mt-2">
                  You've covered a lot of ground. Would you like to generate a
                  concise summary card before you leave?
                </p>
              </div>

              {error && (
                <div className="p-3 bg-red-900/30 border border-red-800 rounded-lg text-red-200 text-sm">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  onClick={resumeNavigation}
                  className="px-4 py-3 rounded-xl font-medium text-gray-300 hover:bg-gray-800 transition-colors"
                >
                  Skip & Leave
                </button>
                <button
                  onClick={handleGenerateSummary}
                  disabled={loading}
                  className="px-4 py-3 rounded-xl font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-lg shadow-indigo-900/20 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {loading ? "Analyzing..." : "Generate Summary"}
                </button>
              </div>
            </div>
          )}

          {/* ---------- SUMMARY MODE ---------- */}
          {mode === "summary" && summaryData && (
            <div className="flex flex-col h-full max-h-[80vh]">
              {/* Header */}
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h2 className="text-xl md:text-2xl font-bold text-white leading-tight">
                    {summaryData.title}
                  </h2>
                  <p className="text-sm text-indigo-400 font-medium mt-1">
                    Session Recap
                  </p>
                </div>
                <button
                  onClick={resumeNavigation}
                  className="cursor-pointer text-gray-500 hover:text-white transition"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
 
              <div
                className="flex-1 overflow-y-auto pr-2 space-y-6 scrollbar-hide"
                style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
              >
                {/* Key Points */}
                <div className="bg-gray-800/50 rounded-xl p-5 border border-gray-700/50">
                  <h4 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3">
                    Key Takeaways
                  </h4>
                  <ul className="space-y-3">
                    {summaryData.key_points.map((point, i) => (
                      <li
                        key={i}
                        className="flex gap-3 text-gray-300 text-base leading-relaxed"
                      >
                        <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-indigo-500 mt-2.5" />
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Struggles  */}
                {summaryData.struggle_area && (
                  <div className="bg-orange-900/10 rounded-xl p-5 border border-orange-500/20">
                    <h4 className="text-sm font-semibold text-orange-400 uppercase tracking-wider mb-2">
                      Focus Area
                    </h4>
                    <p className="text-gray-300 text-sm leading-relaxed">
                      {summaryData.struggle_area}
                    </p>
                  </div>
                )}
              </div>

              {/* Footer Actions */}
              <div className="flex justify-end gap-3 mt-3 pt-4 border-t border-gray-800">
                <button
                  onClick={resumeNavigation}
                  className="cursor-pointer  px-5 py-2.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors text-sm font-medium"
                >
                  Discard
                </button>
                <button
                  onClick={resumeNavigation}  
                  className="cursor-pointer px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-lg shadow-emerald-900/20 flex items-center gap-2 font-medium"
                >
                  <Save className="w-4 h-4" />
                  Save to Notes
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SessionSummaryGate;
