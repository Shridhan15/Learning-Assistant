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
import Footer from "./components/Footer";
 
const ProtectedLayout = ({ children }) => {
  const { getToken, userId, isLoaded } = useAuth();
  const location = useLocation();

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

  const isTutorPage = location.pathname === "/tutor";

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      <Navbar />

      <main
        className={
          isTutorPage
            ? "pt-16 w-full flex-1 h-[calc(100vh-4rem)]"  
            : "pt-20 max-w-7xl mx-auto p-4 w-full flex-1"  
        }
      >
        {childrenWithProps}
      </main>
 
      {!isTutorPage && <Footer />}
    </div>
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
