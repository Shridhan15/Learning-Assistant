// client/src/pages/StudioPage.jsx
import React from "react";
import DailyPodcast from "../components/studio/DailyPodcast"; // <--- Import the new file

const Studio = () => {
  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-6 pb-32">
      <header className="mb-10">
        <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">
          The Studio
        </h1>
      </header>

      {/* Hero Section */}
      <section className="mb-8 w-full max-w-5xl mx-auto">
        <DailyPodcast /> {/* <--- Using the component here */}
      </section>

      {/* Other components (Flashcards, etc.) go here... */}
    </div>
  );
};

export default Studio;
