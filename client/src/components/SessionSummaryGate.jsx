import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useNavigationGuard } from "../context/NavigationGuardContext";

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
  const [summary, setSummary] = useState("");
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
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: sessionMsgs, //  SESSION ONLY
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to generate summary");
      }

      const data = await res.json();
      setSummary(data.summary);
      setMode("summary");  
    } catch (err) {
      console.error(err);
      setError("Could not generate summary. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center">
      <div className="bg-gray-900 rounded-xl w-full max-w-sm p-6 shadow-xl border border-white/10">
        {/* ---------- PROMPT MODE ---------- */}
        {mode === "prompt" && (
          <>
            <h3 className="text-lg font-semibold text-white">
              Generate session summary?
            </h3>

            <p className="text-sm text-gray-400 mt-2">
              You had a long learning session. Want to save a quick summary
              before leaving?
            </p>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={resumeNavigation}
                className="text-gray-400 hover:text-white transition"
              >
                Skip
              </button>

              <button
                onClick={handleGenerateSummary}  
                disabled={loading}
                className="bg-indigo-600 hover:bg-indigo-500 px-4 py-2 rounded-lg text-white transition disabled:opacity-50"
              >
                {loading ? "Generating..." : "Generate"}
              </button>
            </div>

            {error && <p className="text-sm text-red-400 mt-3">{error}</p>}
          </>
        )}

        {/* ---------- SUMMARY MODE ---------- */}
        {mode === "summary" && (
          <>
            <h3 className="text-lg font-semibold text-white">
              Session Summary
            </h3>

            <div className="mt-3 text-sm text-gray-300 whitespace-pre-wrap bg-gray-800/50 rounded-lg p-4 max-h-60 overflow-y-auto">
              {summary}
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={resumeNavigation}
                className="text-gray-400 hover:text-white transition"
              >
                Discard
              </button>

              <button
                onClick={resumeNavigation} // later replace with save API
                className="bg-emerald-600 hover:bg-emerald-500 px-4 py-2 rounded-lg text-white transition"
              >
                Save
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default SessionSummaryGate;
