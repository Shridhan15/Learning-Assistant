import React, { useContext,useMemo } from "react";
import { AppContext } from "../context/AppContext";
import ResultsGrid from "../components/ResultsGrid";
import EmptyState from "../components/EmptyState";
import PageLoading from "../components/PageLoading";
import VoiceAssistant from "../components/VoiceAssistant";
import TodaysHighlights from "../components/TodaysHighlights";
import Footer from "../components/Footer";
import { useUser } from "@clerk/clerk-react";

const Home = () => {
  const { user } = useUser();
  const { files, groupedResults, loading, deleteBook } = useContext(AppContext);

  if (loading) return <PageLoading />;
  if (files.length === 0) return <EmptyState />;

  const allResults = Object.values(groupedResults).flat();

  return (
    <div className="max-w-7xl mx-auto space-y-10 animate-in fade-in duration-500 pb-10">
      {allResults.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-1 bg-indigo-500 rounded-full"></div>
            <div>
              <h3 className="text-2xl md:text-3xl font-bold text-white">
                Daily Recap
              </h3>
              <p className="text-sm text-slate-400">
                Your performance summary and insights.
              </p>
            </div>
          </div>
          <TodaysHighlights results={allResults} />
        </section>
      )}

      <VoiceAssistant userId={user?.id} />

      <section className="space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-2xl font-bold text-white">
              Study Materials & Progress
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Access your uploaded documents and review quiz scores.
            </p>
          </div>
        </div>

        <ResultsGrid groupedResults={groupedResults} onDelete={deleteBook} />
      </section>

      <Footer />
    </div>
  );
};

export default Home;
