import React, { useState } from "react";
import { Loader2, Save, X, FileText, } from "lucide-react";
import { useUser } from "@clerk/clerk-react";
import { useAuth } from "@clerk/clerk-react";
import toast from "react-hot-toast";
const SessionSummaryGate = ({
  open,
  onClose, 
  sessionMsgs,
  activeFile,
  API_BASE_URL,
}) => {
  const [mode, setMode] = useState("prompt");
  const [summaryData, setSummaryData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { user, isLoaded } = useUser();

  const { getToken, userId } = useAuth();
  if (!open) return null;

  // We remove navigate and registerGuard from here.
  // We just tell the parent "we are done" via onClose.
  const handleFinalize = () => {
    // Reset local state before closing so it's fresh for next time
    setMode("prompt");
    setSummaryData(null);
    onClose();
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

  const handleSaveSummary = async () => {
    console.log("Button Clicked!");
    try {
      setLoading(true);
      const token = await getToken();
      console.log("2. Token received:", !!token);
      console.log("3. Data being sent:", {
        filename: activeFile,
        title: summaryData?.title,
        userId: userId,
      });

      const response = await fetch(`${API_BASE_URL}/save-summary`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "user-id": userId,
        },
        body: JSON.stringify({
          filename: activeFile,
          title: summaryData.title,
          key_points: summaryData.key_points,
          struggle_area: summaryData.struggle_area,
        }),
      });
      console.log("4. Response status:", response.status);

      if (response.ok) {
        console.log("Summary saved successfully!");
        handleFinalize(); // Close the modal and continue navigation
      } else {
        const errorData = await response.json();
        console.error("6. Server Error Data:", errorData);
        throw new Error("Failed to save");
      }
    } catch (err) {
      console.error("7. Catch Block caught error:", err);
      setError(err.message);
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
                  concise summary card before switching?
                </p>
              </div>

              {error && (
                <div className="p-3 bg-red-900/30 border border-red-800 rounded-lg text-red-200 text-sm">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  onClick={handleFinalize}
                  className="cursor-pointer px-4 py-3 rounded-xl font-medium text-gray-300 hover:bg-gray-800 transition-colors"
                >
                  Skip & Continue
                </button>
                <button
                  onClick={handleGenerateSummary}
                  disabled={loading}
                  className="cursor-pointer px-4 py-3 rounded-xl font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-lg flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Generate Summary"
                  )}
                </button>
              </div>
            </div>
          )}

          {mode === "summary" && summaryData && (
            <div className="flex flex-col h-full max-h-[80vh]">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h2 className="text-xl md:text-2xl font-bold text-white">
                    {summaryData.title}
                  </h2>
                  <p className="text-sm text-indigo-400 font-medium">
                    Session Recap
                  </p>
                </div>
                <button
                  onClick={handleFinalize}
                  className="cursor-pointer text-gray-500 hover:text-white transition"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-6 no-scrollbar">
                <div className="bg-gray-800/50 rounded-xl p-5 border border-gray-700/50">
                  <h4 className="text-sm font-semibold text-gray-300 uppercase mb-3">
                    Key Takeaways
                  </h4>
                  <ul className="space-y-3">
                    {summaryData.key_points.map((point, i) => (
                      <li
                        key={i}
                        className="flex gap-3 text-gray-300 text-base"
                      >
                        <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-indigo-500 mt-2.5" />
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-3 pt-4 border-t border-gray-800">
                <button
                  onClick={handleFinalize}
                  className="cursor-pointer px-5 py-2.5 rounded-lg text-gray-400 hover:text-white text-sm font-medium"
                >
                  Discard
                </button>
                <button
                  onClick={handleSaveSummary}
                  className="cursor-pointer px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-2 font-medium"
                >
                  <Save className="w-4 h-4" /> Save to Notes
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
