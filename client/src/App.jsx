import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth, SignedIn, SignedOut, UserButton } from "@clerk/clerk-react";

import QuizAssistant from "./components/QuizAssistant";
import Login from "./pages/Login";

// A small wrapper to inject Auth Data into your Quiz Component
const ProtectedQuiz = () => {
  const { getToken, userId, isLoaded } = useAuth();

  // Show a simple loading state while Clerk loads
  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center text-white">
        Loading...
      </div>
    );
  }

  return (
    <div className="relative">
      {/* User Profile Button (Top Right) */}
      <div className="absolute top-4 right-4 z-50">
        <UserButton />
      </div>

      {/* The Main App */}
      <QuizAssistant getToken={getToken} userId={userId} />
    </div>
  );
};

const App = () => {
  return (
    <Routes>
      {/* SINGLE AUTH PAGE */}
      <Route
        path="/login/*"
        element={
          <>
            <SignedIn>
              <Navigate to="/" replace />
            </SignedIn>
            <SignedOut>
              <Login />
            </SignedOut>
          </>
        }
      />

      {/* PROTECTED HOME */}
      <Route
        path="/"
        element={
          <>
            <SignedIn>
              <ProtectedQuiz />
            </SignedIn>
            <SignedOut>
              <Navigate to="/login" replace />
            </SignedOut>
          </>
        }
      />
    </Routes>
  );
};

export default App;
