import { createContext, useEffect, useState } from "react";
import { useAuth, useUser } from "@clerk/clerk-react";
import { fetchFilesAPI, deleteBookAPI } from "../services/fileService";
import { fetchResultsAPI } from "../services/quizService";
import { toast } from "react-toastify";

export const AppContext = createContext();

const AppContextProvider = ({ children }) => {
  const { getToken } = useAuth();
  const { user, isLoaded } = useUser();
  const userId = user?.id;

  const API_BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

  const [files, setFiles] = useState([]);
  const [groupedResults, setGroupedResults] = useState({});
  const [loading, setLoading] = useState(true);
  const [filesLoading, setFilesLoading] = useState(true);

  const fetchFiles = async () => {
    try {
      const token = await getToken();
      const data = await fetchFilesAPI(token, API_BASE_URL, userId);

      setFiles(data.files || []);
      setFilesLoading(false);
    } catch (error) {
      console.error("Error fetching files:", error);
    }
  };

  const fetchResults = async () => {
    try {
      const token = await getToken();
      const data = await fetchResultsAPI(token, userId);

      const grouped = data.results.reduce((acc, item) => {
        if (!acc[item.filename]) acc[item.filename] = [];
        acc[item.filename].push(item);
        return acc;
      }, {});

      setGroupedResults(grouped);
    } catch (error) {
      console.error("Error fetching results:", error);
    }
  };
 

  const deleteBook = async (filename) => {
    // 1. Get confirmation so users don't accidentally lose their data
    if (
      !window.confirm(
        "Are you sure? This will delete all notes, quizzes, and chat history for this book.",
      )
    ) {
      return;
    }

    try {
      const token = await getToken();

      // 2. Wrap the API call in a toast promise
      await toast.promise(
        deleteBookAPI(token, API_BASE_URL, userId, filename),
        {
          pending: "Cleaning up all book data...",
          success: {
            render({ data }) {
              // This displays your backend message: "Book deleted and usage quota restored"
              return data.message || "Book deleted successfully!";
            },
          },
          error: {
            render({ error }) {
              // This displays "Delete failed" or your custom detail from the backend
              return `Error: ${error.message}`;
            },
          },
        },
      );

      // 3. Update local state only AFTER the API succeeds
      setFiles((prev) => prev.filter((file) => file.filename !== filename));

      setGroupedResults((prev) => {
        const newResults = { ...prev };
        delete newResults[filename];
        return newResults;
      });
    } catch (error) {
      // Error is already handled by toast.promise, but we log it for debugging
      console.error("Delete cleanup failed:", error);
    }
  };

  useEffect(() => {
    if (!isLoaded || !userId) return;

    const loadData = async () => {
      setLoading(true);
      try {
        await Promise.all([fetchFiles(), fetchResults()]);
      } catch (err) {
        console.error("Initial load failed", err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [isLoaded, userId]);

  const value = {
    files,
    groupedResults,
    fetchResults,
    loading,
    deleteBook,
    fetchFiles,
    filesLoading,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export default AppContextProvider;
