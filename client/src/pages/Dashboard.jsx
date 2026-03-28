import React, { useState, useEffect, useContext } from "react";
import {
  useUser,
  useAuth,
  UserButton as ClerkUserButton,
} from "@clerk/clerk-react";
import {
  BarChart3,
  Calendar as CalendarIcon,
  StickyNote,
  LayoutDashboard,
  Menu,
  X,
} from "lucide-react";
import UsageStats from "../components/UsageStats";
import StudyCalendar from "../components/StudyCalendar/StudyCalendar";
import Notes from "../components/Notes";
import { AppContext } from "../context/AppContext";
import Files from "../components/Files";
import { toast } from "react-toastify";

const Dashboard = () => {
  const { user } = useUser();
  const { getToken, userId } = useAuth();
  const [activeTab, setActiveTab] = useState("stats");
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const API_BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
  const { files, deleteBook } = useContext(AppContext);

  const menuItems = [
    { id: "stats", label: "Usage Stats", icon: <BarChart3 size={18} /> },
    {
      id: "calendar",
      label: "Study Calendar",
      icon: <CalendarIcon size={18} />,
    },
    { id: "notes", label: "My Notes", icon: <StickyNote size={18} /> },
    { id: "files", label: "My Files", icon: <LayoutDashboard size={18} /> },
  ];

  const handleAddEvent = async (eventPayload) => {
    try {
      const token = await getToken();

      // We wrap the fetch in a promise for the toast
      const saveEventPromise = fetch(`${API_BASE_URL}/calendar/add-event`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "user-id": userId,
        },
        body: JSON.stringify(eventPayload),
      }).then(async (res) => {
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.detail || "Failed to save event");
        }
        return res.json();
      });

      // Show the toast during the process
      await toast.promise(saveEventPromise, {
        pending: "Adding to your study calendar...",
        success: "Event added successfully!",
        error: {
          render({ error }) {
            return `Error: ${error.message}`;
          },
        },
      });

      fetchCalendarEvents();

      // setShowModal(false);
    } catch (error) {
      console.error("Error saving event:", error);
      // Error is handled by toast.promise
    }
  };

  const fetchCalendarEvents = async () => {
    try {
      const token = await getToken();
      const response = await fetch(`${API_BASE_URL}/calendar/get-events`, {
        headers: { Authorization: `Bearer ${token}`, "user-id": userId },
      });
      const data = await response.json();
      setCalendarEvents(
        data.events.map((ev) => ({
          ...ev,
          start: ev.start_time,
          end: ev.end_time,
        })),
      );
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (userId) fetchCalendarEvents();
  }, [userId]);

  const handleDeleteEvent = async (eventId) => {
    // 1. Keep the confirmation for safety
    if (!window.confirm("Are you sure you want to delete this event?")) return;

    try {
      const token = await getToken();

      // 2. Define the deletion promise
      const deletePromise = fetch(
        `${API_BASE_URL}/calendar/delete-event/${eventId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
            "user-id": userId,
          },
        },
      ).then(async (res) => {
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.detail || "Failed to delete event");
        }
        return res.json();
      });

      // 3. Fire the toast
      await toast.promise(deletePromise, {
        pending: "Removing event from calendar...",
        success: "Event deleted!",
        error: {
          render({ error }) {
            return `Error: ${error.message}`;
          },
        },
      });

      // 4. Refresh the calendar view
      fetchCalendarEvents();
    } catch (error) {
      console.error("Error deleting event:", error);
      // error is already handled by toast.promise
    }
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-gray-950/50 backdrop-blur-xl border-r border-white/10">
      <div className="p-6">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Workspace
        </h3>
      </div>

      <nav className="flex-1 px-4 space-y-1">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => {
              setActiveTab(item.id);
              setIsMobileMenuOpen(false);
            }}
            className={`cursor-pointer w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
              activeTab === item.id
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20"
                : "text-gray-400 hover:bg-white/5 hover:text-white"
            }`}
          >
            {item.icon}
            <span className="font-medium text-sm">{item.label}</span>
          </button>
        ))}
      </nav>

      {/* CLERK BUTTON FOOTER - Fixed to bottom of sidebar */}
      <div className="p-4 mt-auto border-t border-white/5 bg-gray-950/40">
        <div className="flex items-center gap-3 p-2 rounded-xl bg-white/5 border border-white/5">
          <ClerkUserButton
            appearance={{ elements: { avatarBox: "w-8 h-8" } }}
          />
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-medium text-white truncate">
              {user?.fullName}
            </span>
            <span className="text-[10px] text-gray-500 truncate">
              {user?.primaryEmailAddress?.emailAddress}
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-full w-full overflow-hidden bg-gray-950">
      {/* Desktop Sidebar */}
      <aside className="hidden md:block w-64 h-full">
        <SidebarContent />
      </aside>

      {/* Mobile Menu Toggle */}
      <button
        onClick={() => setIsMobileMenuOpen(true)}
        className="md:hidden fixed bottom-6 right-6 z-50 p-4 bg-indigo-600 text-white rounded-full shadow-2xl"
      >
        <Menu size={24} />
      </button>

      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-[60] md:hidden">
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div className="absolute left-0 top-0 bottom-0 w-64 bg-gray-950 animate-in slide-in-from-left duration-300">
            <SidebarContent />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 md:p-8 no-scrollbar">
          <div className="max-w-5xl mx-auto space-y-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-6 bg-indigo-500 rounded-full" />
              <h1 className="text-2xl font-bold text-white tracking-tight">
                {menuItems.find((i) => i.id === activeTab)?.label}
              </h1>
            </div>

            {activeTab === "stats" && (
              <div className="animate-in fade-in duration-500">
                <UsageStats
                  userId={userId}
                  getToken={getToken}
                  API_BASE_URL={API_BASE_URL}
                />
              </div>
            )}

            {activeTab === "calendar" && (
              <div className="animate-in fade-in zoom-in-95 duration-500 bg-white/5 border border-white/10 rounded-3xl p-1 min-h-[600px]">
                <StudyCalendar
                  events={calendarEvents}
                  onAddEvent={handleAddEvent}
                  onDeleteEvent={handleDeleteEvent}
                />
              </div>
            )}

            {activeTab === "notes" && (
              <div className="animate-in fade-in duration-500 h-[calc(100vh-100px)]">
                <Notes />
              </div>
            )}
            {activeTab === "files" && (
              <div className="animate-in fade-in duration-500 h-[calc(100vh-120px)]">
                <Files files={files} onDelete={deleteBook} />
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
