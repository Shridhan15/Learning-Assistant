import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth, SignedIn, SignedOut } from "@clerk/clerk-react";
import Home from "./pages/Home";

// Components
import Navbar from "./components/Navbar";  
import QuizAssistant from "./components/QuizAssistant";
import Login from "./pages/Login";
import Tutor from "./pages/Tutor";

// --- LAYOUT WRAPPER ---
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
  // This saves  from passing them manually in every Route
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
 
      <main className="pt-20 max-w-7xl mx-auto p-4">{childrenWithProps}</main>
    </div>
  );
};

const App = () => {
  return (
    <Routes> 
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

      <Route
        path="/tutor"
        element={
          <>
            <SignedIn>
              <ProtectedLayout>
                <Tutor />
              </ProtectedLayout>
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
