import { createContext, useEffect, useState } from "react";
import { useAuth, useUser } from "@clerk/clerk-react";
import { fetchFilesAPI, deleteBookAPI } from "../services/fileService";
import { fetchResultsAPI } from "../services/quizService";

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
    try {
      const token = await getToken();

      await deleteBookAPI(token, API_BASE_URL, userId, filename);

      // update files
      setFiles((prev) => prev.filter((file) => file.filename !== filename));

      // update results
      setGroupedResults((prev) => {
        const newResults = { ...prev };
        delete newResults[filename];
        return newResults;
      });
    } catch (error) {
      console.error("Delete failed:", error);
    }
  };
 
  useEffect(() => {
    if (!isLoaded || !userId) return;

    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchFiles(), fetchResults()]);
      setLoading(false);
    };

    loadData();
  }, [isLoaded, userId]);

  const value = {
    files,
    groupedResults,
    loading,
    deleteBook,
    fetchFiles,
    filesLoading,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export default AppContextProvider;
