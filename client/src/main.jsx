import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { BrowserRouter } from "react-router-dom";
import { ClerkProvider } from "@clerk/clerk-react";
import { Toaster } from "react-hot-toast"; // 1. Import the Toaster
import AppContextProvider from "./context/AppContext.jsx";

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ClerkProvider publishableKey={PUBLISHABLE_KEY} afterSignOutUrl="/">
      <AppContextProvider>
        <BrowserRouter>
          <Toaster
            position="bottom-center"
            toastOptions={{
              style: {
                background: "#111827",
                color: "#fff",
                border: "1px solid #374151",
              },
            }}
          />
          <App />
        </BrowserRouter>
      </AppContextProvider>
    </ClerkProvider>
  </StrictMode>,
);
