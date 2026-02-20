import React, { useState, useMemo } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import EventModal from "./EventModal";
import "./StudyCalendarTheme.css";

import {
  Plus,
  Calendar as CalIcon,
  List,
  Clock,
  X,
  Calendar,
} from "lucide-react";

const StudyCalendar = ({ events, onAddEvent, onDeleteEvent }) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedDayInfo, setSelectedDayInfo] = useState({
    date: null,
    events: [],
  });

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "Revision",
    priority: 1,
    start_time: "",
    end_time: "",
  });

  const resetForm = () =>
    setFormData({
      title: "",
      description: "",
      category: "Revision",
      priority: 1,
      start_time: "",
      end_time: "",
    });

  const handleCloseModal = () => {
    setModalOpen(false);
    resetForm();
    setSelectedDayInfo({ date: null, events: [] });
  };

  const handleDateClick = (arg) => {
    const dayEvents = events.filter((e) => {
      const eventStart = e.start_time || e.start;
      if (!eventStart) return false;
      return eventStart.startsWith(arg.dateStr);
    });

    const localStart = new Date(arg.date);
    localStart.setHours(9, 0, 0, 0);
    const localEnd = new Date(arg.date);
    localEnd.setHours(10, 0, 0, 0);

    setFormData((prev) => ({
      ...prev,
      start_time: localStart.toISOString(),
      end_time: localEnd.toISOString(),
    }));

    setSelectedDayInfo({ date: arg.dateStr, events: dayEvents });
    setModalOpen(true);
  };

  const handleSelect = (selectionInfo) => {
    setFormData((prev) => ({
      ...prev,
      start_time: new Date(selectionInfo.startStr).toISOString(),
      end_time: new Date(selectionInfo.endStr).toISOString(),
    }));
    setModalOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.title.trim() || !formData.start_time || !formData.end_time)
      return;

    onAddEvent(formData);
    handleCloseModal();
  };

  const formattedEvents = useMemo(
    () =>
      events.map((e) => ({
        id: e.id,
        title: e.title,
        start: e.start_time || e.start,
        end: e.end_time || e.end,
        priority: Number(e.priority),
        category: e.category,
        description: e.description,
        backgroundColor:
          e.priority === 3
            ? "#f43f5e"
            : e.priority === 2
              ? "#fbbf24"
              : "#10b981",
        borderColor: "transparent",
      })),
    [events],
  );

  return (
    <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 min-h-screen rounded-3xl">
      <div className="p-1 rounded-3xl">
        <div className="max-w-[1600px] mx-auto">
          <div className="flex flex-col lg:flex-row gap-6">
            {/* LEFT SIDE: Calendar */}
            <div className="flex-1 rounded-3xl border border-white/10 bg-slate-950/70 backdrop-blur-xl shadow-2xl overflow-hidden flex flex-col">
              <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-2xl bg-white/5 border border-white/10">
                    <CalIcon className="w-5 h-5 text-indigo-300" />
                  </div>
                  <div>
                    <p className="text-base font-extrabold text-white leading-tight">
                      Study Schedule
                    </p>
                    <p className="text-xs text-white/50 font-semibold">
                      Interactive Planner
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setModalOpen(true)}
                  className="cursor-pointer group inline-flex items-center justify-center gap-1 rounded-2xl px-4 py-2 text-sm font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 shadow-lg hover:shadow-xl hover:brightness-110 transition-all duration-200"
                >
                  <Plus className="w-4 h-4" />
                  Add Event
                </button>
              </div>

              <div className="h-[75vh] p-4 study-calendar-dark">
                {/* FIXED: Added back all required props to FullCalendar */}
                <FullCalendar
                  plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                  initialView="dayGridMonth"
                  events={formattedEvents}
                  dateClick={handleDateClick}
                  selectable={true}
                  select={handleSelect}
                  height="100%"
                  expandRows={true}
                  headerToolbar={{
                    left: "prev,next",
                    center: "title",
                    right: "today dayGridMonth,timeGridWeek",
                  }}
                  dayMaxEvents={3}
                />
              </div>
            </div>

            {/* RIGHT SIDE: Upcoming Events List */}
            <aside className="w-full lg:w-80 xl:w-86 flex flex-col gap-4">
              <div className="rounded-3xl border border-white/10 bg-slate-950/70 backdrop-blur-xl p-5 flex flex-col h-full max-h-[85vh]">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <List className="w-5 h-5 text-indigo-400" />
                    Upcoming
                  </h3>
                  <span className="px-2 py-1 rounded-md bg-white/5 text-white/40 text-[10px] font-bold uppercase tracking-widest">
                    {events.length} Events
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto space-y-4 pr-2 no-scrollbar">
                  {events.length > 0 ? (
                    [...events]
                      .sort(
                        (a, b) =>
                          new Date(a.start_time) - new Date(b.start_time),
                      )
                      .map((ev) => (
                        <div
                          key={ev.id}
                          className="group relative bg-white/5 border border-white/5 rounded-2xl p-4 hover:bg-white/10 hover:border-indigo-500/30 transition-all"
                        >
                          <div
                            className={`absolute left-0 top-4 bottom-4 w-1 rounded-r-full ${ev.priority === 3 ? "bg-rose-500" : ev.priority === 2 ? "bg-amber-500" : "bg-emerald-500"}`}
                          />
                          <div className="pl-2">
                            <div className="flex justify-between items-start mb-1">
                              <h4 className="text-sm font-bold text-slate-100 truncate w-40">
                                {ev.title}
                              </h4>
                              <span className="text-[10px] font-bold text-white/30 uppercase tracking-tighter">
                                {ev.category}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-white/50 text-[11px] mb-2">
                              <Clock className="w-3 h-3 text-indigo-400" />
                              <span>
                                {new Date(ev.start_time).toLocaleDateString(
                                  [],
                                  { month: "short", day: "numeric" },
                                )}
                                {" • "}
                                {new Date(ev.start_time).toLocaleTimeString(
                                  [],
                                  { hour: "2-digit", minute: "2-digit" },
                                )}
                              </span>
                            </div>
                            {ev.description && (
                              <p className="text-white/40 text-xs italic line-clamp-2 border-l border-white/10 pl-2">
                                {ev.description}
                              </p>
                            )}
                          </div>
                          <button
                            onClick={() => onDeleteEvent(ev.id)}
                            className=" cursor-pointer absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1.5 text-white/20 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <div className="p-4 rounded-full bg-white/5 mb-4 text-white/10">
                        <Calendar className="w-8 h-8" />
                      </div>
                      <p className="text-white/30 text-sm font-medium">
                        No sessions planned yet.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>

      <EventModal
        isOpen={modalOpen}
        onClose={handleCloseModal}
        selectedDayInfo={selectedDayInfo}
        formData={formData}
        setFormData={setFormData}
        handleSubmit={handleSubmit}
        onDeleteEvent={onDeleteEvent}
      />
    </div>
  );
};

export default StudyCalendar;
