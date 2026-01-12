import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth, SignedIn, SignedOut } from "@clerk/clerk-react";
import Home from "./pages/Home";

// Components
import Navbar from "./components/Navbar"; // Make sure to create this file
import QuizAssistant from "./components/QuizAssistant";
import Login from "./pages/Login";

// --- LAYOUT WRAPPER ---
// This handles the Navbar, Auth Loading, and passing props to children
const ProtectedLayout = ({ children }) => {
  const { getToken, userId, isLoaded } = useAuth();

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center text-white">
        Loading...
      </div>
    );
  }

  // Automatically inject getToken and userId into children (like QuizAssistant)
  // This saves you from having to pass them manually in every Route
  const childrenWithProps = React.Children.map(children, (child) => {
    if (React.isValidElement(child)) {
      return React.cloneElement(child, { getToken, userId });
    }
    return child;
  });

  return (
    <div className="min-h-screen bg-gray-950">
      {/* 1. The Fixed Navbar */}
      <Navbar />

      {/* 2. Main Content Area */}
      {/* pt-20 adds padding at the top so content isn't hidden behind the fixed Navbar */}
      <main className="pt-20 max-w-7xl mx-auto p-4">{childrenWithProps}</main>
    </div>
  );
};

const App = () => {
  return (
    <Routes>
      {/* --- PUBLIC ROUTE: LOGIN --- */}
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

      {/* --- PROTECTED ROUTES --- */}

      {/* Route 1: Home (Quiz) */}
      <Route
        path="/"
        element={
          <>
            <SignedIn>
              <ProtectedLayout>
                <Home />
              </ProtectedLayout>
            </SignedIn>
            <SignedOut>
              <Navigate to="/login" replace />
            </SignedOut>
          </>
        }
      />

      {/* Route 2: Explicit Quiz Path (for Navbar consistency) */}
      <Route
        path="/quiz"
        element={
          <>
            <SignedIn>
              <ProtectedLayout>
                <QuizAssistant />
              </ProtectedLayout>
            </SignedIn>
            <SignedOut>
              <Navigate to="/login" replace />
            </SignedOut>
          </>
        }
      />

      {/* Future Route: AI Tutor (Placeholder) */}
      {/* You can enable this later when you build the Tutor component */}
      {/* <Route
        path="/tutor"
        element={
          <SignedIn>
            <ProtectedLayout>
              <AITutor />
            </ProtectedLayout>
          </SignedIn>
        }
      /> 
      */}
    </Routes>
  );
};

export default App;
