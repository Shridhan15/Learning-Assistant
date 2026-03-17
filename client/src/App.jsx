import React from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useAuth, SignedIn, SignedOut } from "@clerk/clerk-react";
import Home from "./pages/Home";

// Components
import Navbar from "./components/Navbar";
import QuizAssistant from "./components/QuizAssistant";
import Login from "./pages/Login";
import Tutor from "./pages/Tutor";
import Hero from "./components/Hero";
import Studio from "./pages/Studio";
import ConceptTest from "./pages/ConceptTest";
import ConceptSession from "./pages/ConceptSession";
import { NavigationGuardProvider } from "./context/NavigationGuardContext";
import Dashboard from "./pages/Dashboard";
import LearningPaths from "./pages/LearningPaths";

const ProtectedLayout = ({ children }) => {
  const { getToken, userId, isLoaded } = useAuth();
  const location = useLocation();

  if (!isLoaded)
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center text-white">
        Loading...
      </div>
    );

  const childrenWithProps = React.Children.map(children, (child) =>
    React.isValidElement(child)
      ? React.cloneElement(child, { getToken, userId })
      : child,
  );

  const isTutorPage = location.pathname === "/tutor";
  const isDashboard = location.pathname === "/dashboard";

  return (
    <NavigationGuardProvider>
      <div className="h-screen bg-gray-950 flex flex-col overflow-hidden no-scrollbar">
        <Navbar />
        <main
          className={
            isTutorPage || isDashboard
              ? "pt-16 w-full flex-1 h-[calc(100vh-4rem)] no-scrollbar" // Full width for Dashboard
              : "pt-20 max-w-7xl mx-auto p-4 w-full flex-1 overflow-y-auto no-scrollbar" // Boxed for others
          }
        >
          {childrenWithProps}
        </main>
      </div>
    </NavigationGuardProvider>
  );
};

const App = () => {
  return (
    <Routes>
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
              <Hero />
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
              <Navigate to="/" replace />
            </SignedOut>
          </>
        }
      />
      <Route
        path="/dashboard"
        element={
          <>
            <SignedIn>
              <ProtectedLayout>
                <Dashboard />
              </ProtectedLayout>
            </SignedIn>
            <SignedOut>
              <Navigate to="/" replace />
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
              <Navigate to="/" replace />
            </SignedOut>
          </>
        }
      />
      <Route
        path="/studio"
        element={
          <>
            <SignedIn>
              <ProtectedLayout>
                <Studio />
              </ProtectedLayout>
            </SignedIn>
            <SignedOut>
              <Navigate to="/" replace />
            </SignedOut>
          </>
        }
      />
      <Route
        path="/learningpaths"
        element={
          <>
            <SignedIn>
              <ProtectedLayout>
                <LearningPaths />
              </ProtectedLayout>
            </SignedIn>
            <SignedOut>
              <Navigate to="/" replace />
            </SignedOut>
          </>
        }
      />
      {/* <Route
        path="/concept-test"
        element={
          <>
            <SignedIn>
              <ProtectedLayout>
                <ConceptTest />
              </ProtectedLayout>
            </SignedIn>
            <SignedOut>
              <Navigate to="/" replace />
            </SignedOut>
          </>
        }
      /> */}
      <Route
        path="/concept-test/session"
        element={
          <>
            <SignedIn>
              <ProtectedLayout>
                <ConceptSession />
              </ProtectedLayout>
            </SignedIn>
            <SignedOut>
              <Navigate to="/" replace />
            </SignedOut>
          </>
        }
      />

      <Route
        path="/login"
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
    </Routes>
  );
};

export default App;
