import { FileText, Trash2, CalendarDays } from "lucide-react";
import { getDisplayName } from "../utils/fileHelpers";
import { useUser } from "@clerk/clerk-react";
import { useState } from "react";

const Files = ({ files = [], onDelete }) => {
  //   console.log("Rendering Files component with files:", files);
  const { user } = useUser();
  const [deletingId, setDeletingId] = useState(null);
  const formatDate = (date) => {
    return new Date(date).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const handleDeleteClick = async (filename, displayName) => { 

    setDeletingId(filename);

    try {
      await onDelete(filename);
    } catch (err) {
      console.error("Delete failed:", err);
    }

    setDeletingId(null);
  };
  return (
    <div className="flex flex-col h-full w-full bg-gray-900/20 text-white overflow-hidden border border-white/10 rounded-3xl backdrop-blur-sm">
      {/* HEADER */}
      <div className="flex items-center justify-between p-4 pb-0 shrink-0">
        <div className="flex items-center gap-2 bg-indigo-500/10 px-3 py-1.5 rounded-full border border-indigo-500/20">
          <FileText className="w-3.5 h-3.5 text-indigo-400" />
          <span className="text-xs font-medium text-indigo-300">
            {files.length} File{files.length !== 1 && "s"}
          </span>
        </div>
      </div>

      {/* FILE LIST */}
      <div className="flex flex-col gap-2 p-4 overflow-y-auto no-scrollbar flex-1">
        {files.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 text-sm">
            No files uploaded yet
          </div>
        ) : (
          files.map((file) => (
            <div
              key={file.id}
              className="group flex items-center justify-between p-3 rounded-xl transition-all duration-300 border bg-gray-900/40 border-white/5 hover:border-white/20 hover:bg-white/5"
            >
              {/* LEFT */}
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                  <FileText className="w-4 h-4 text-indigo-400" />
                </div>

                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-medium text-gray-300 truncate max-w-[220px]">
                    {getDisplayName(file.filename, user?.id)}
                  </span>

                  <div className="flex items-center gap-1 text-[10px] text-gray-500 mt-0.5">
                    <CalendarDays className="w-3 h-3" />
                    {formatDate(file.created_at)}
                  </div>
                </div>
              </div>

              {/* RIGHT ACTIONS */}
              <button
                disabled={deletingId === file.filename}
                onClick={() =>
                  handleDeleteClick(
                    file.filename,
                    getDisplayName(file.filename, user?.id),
                  )
                }
                className="cursor-pointer opacity-0 group-hover:opacity-100 transition-all p-2 rounded-lg hover:bg-red-500/20 text-gray-500 hover:text-red-400"
              >
                <Trash2
                  className={`w-4 h-4 ${
                    deletingId === file.filename
                      ? "animate-pulse text-red-500"
                      : ""
                  }`}
                />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Files;
