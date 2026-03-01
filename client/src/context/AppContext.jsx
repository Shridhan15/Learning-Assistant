import { createContext, useEffect } from "react";
import { useState } from "react";
import { useAuth } from "@clerk/clerk-react";

export const AppContext = createContext();

const AppContextProvider = (props) => {
  const { getToken, userId } = useAuth();
  const API_BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

  const [files, setFiles] = useState([]);
  const [filesLoading, setFilesLoading] = useState(true);

  const fetchFiles = async () => {
    try {
      const token = await getToken();
      const response = await fetch(`${API_BASE_URL}/files/fetch-files`, {
        headers: { Authorization: `Bearer ${token}`, "user-id": userId },
      });
      const data = await response.json();
      setFiles(data.files || []);
    } catch (error) {
      console.error("Error fetching files:", error);
    } finally {
      setFilesLoading(false);
    }
  };

  const value = {
    files,
    setFiles,
    fetchFiles,
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  return (
    // means all the child componentes wrapped inside AppContextProvider will be able to access the context data
    <AppContext.Provider value={value}>{props.children}</AppContext.Provider>
  );
};
export default AppContextProvider;
