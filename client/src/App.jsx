import React from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom"; // Added useLocation
import { useAuth, SignedIn, SignedOut } from "@clerk/clerk-react";
import Home from "./pages/Home";

// Components
import Navbar from "./components/Navbar";
import QuizAssistant from "./components/QuizAssistant";
import Login from "./pages/Login";
import Tutor from "./pages/Tutor";
import Hero from "./components/Hero";
import Footer from "./components/Footer";

// --- LAYOUT WRAPPER ---
const ProtectedLayout = ({ children }) => {
  const { getToken, userId, isLoaded } = useAuth();
  const location = useLocation(); // 1. Get current route

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center text-white">
        Loading...
      </div>
    );
  }

  const childrenWithProps = React.Children.map(children, (child) => {
    if (React.isValidElement(child)) {
      return React.cloneElement(child, { getToken, userId });
    }
    return child;
  });

  // 2. Check if we are on the Tutor page
  const isTutorPage = location.pathname === "/tutor";

  return (
    <div className="min-h-screen bg-gray-950">
      <Navbar />

      {/* 3. Conditionally render styles */}
      <main
        className={
          isTutorPage
            ? "pt-16 w-full" // Tutor: Exact navbar height (16 = 4rem), full width, no padding
            : "pt-20 max-w-7xl mx-auto p-4" // Others: Extra spacing, centered container
        }
      >
        {childrenWithProps}
      </main>
      <Footer />
    </div>
  );
};

const App = () => {
  return (
    <Routes>
      {/* ROUTE 1: The Root Path ("/") 
        - Logged In? -> Show Dashboard (Home)
        - Logged Out? -> Show Hero Page (Landing)
      */}
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

      {/* ROUTE 2: Protected Routes (Quiz, Tutor)
        - Logged In? -> Show Page
        - Logged Out? -> Redirect to Home (Hero) so they can sign in
      */}
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

      {/* ROUTE 3: Explicit Login Page (Optional)
        - If you still want a dedicated /login page, keep this.
        - Otherwise, the Hero page handles login via the modal.
      */}
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
