import React, { useState, useMemo } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import "./StudyCalendarTheme.css";

import {
  Plus,
  X,
  Clock,
  Calendar as CalIcon,
  List,
  Calendar,
} from "lucide-react";

const StudyCalendar = ({ events, onAddEvent }) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedDayInfo, setSelectedDayInfo] = useState({
    date: null,
    events: [],
  });
 
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "General",
    priority: 1,
    start_time: "",
    end_time: "",
  });

  const resetForm = () =>
    setFormData({
      title: "",
      description: "",
      category: "General",
      priority: 1,
      start_time: "",
      end_time: "",
    });
 
  const formatForInput = (isoStr) => {
    if (!isoStr) return "";
    const date = new Date(isoStr);
    const offset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - offset).toISOString().slice(0, 16);
  };

  const handleDateClick = (arg) => {
    const dayEvents = events.filter((e) => {
      const eventStart = e.start_time || e.start;
      if (!eventStart) return false;
      const eventDateStr =
        typeof eventStart === "string" ? eventStart : eventStart.toISOString();
      return eventDateStr.startsWith(arg.dateStr);
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
 
    onAddEvent({
      title: formData.title.trim(),
      description: formData.description?.trim() || null,
      start_time: formData.start_time,
      end_time: formData.end_time,
      category: formData.category,
      priority: formData.priority,
    });

    resetForm();
    setModalOpen(false);
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

        // Visuals for the Month Grid
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

  const CATEGORIES = [
    {
      id: "Revision",
      label: "Revision",
      color: "from-indigo-500 to-purple-600",
    },
    { id: "Exam", label: "Exam", color: "from-rose-500 to-pink-600" },
    { id: "Quiz", label: "Quiz", color: "from-emerald-500 to-teal-600" },
    { id: "General", label: "General", color: "from-slate-500 to-slate-600" },
  ];

  const PRIORITIES = [
    {
      id: 1,
      label: "Low",
      color:
        "bg-emerald-500/10 text-emerald-700 border-emerald-200 ring-emerald-500/20",
    },
    {
      id: 2,
      label: "Medium",
      color:
        "bg-amber-500/10 text-amber-700 border-amber-200 ring-amber-500/20",
    },
    {
      id: 3,
      label: "High",
      color: "bg-rose-500/10 text-rose-700 border-rose-200 ring-rose-500/20",
    },
  ];

  return (
    <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950  ">
      <div className="p-2">
        <div className="max-w-6xl mx-auto space-y-3">
          {/* Calendar Card   */}
          <div className="rounded-3xl border border-white/10 bg-slate-950/70 backdrop-blur-xl shadow-2xl  ">
            {/* Header */}
            <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between gap-4">
              {/* Left */}
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-2xl bg-white/5 border border-white/10">
                  <CalIcon className="w-5 h-5 text-indigo-300" />
                </div>

                <div>
                  <p className="text-base font-extrabold text-white leading-tight">
                    Calendar
                  </p>
                  <p className="text-xs text-white/50 font-semibold">
                    Month • Week view
                  </p>
                </div>
              </div>

              {/* Right */}
              <button
                onClick={() => setModalOpen(true)}
                className="group inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-2.5 font-extrabold text-white
                     bg-gradient-to-r from-indigo-600 to-purple-600 shadow-lg
                     hover:shadow-xl hover:brightness-110 transition-all duration-200"
              >
                <Plus className="w-5 h-5 group-hover:rotate-12 transition-transform duration-200" />
                New Event
              </button>
            </div>

            {/* Calendar Body */}
            <div className="h-[72vh] p-4 md:p-5 overflow-y-auto overflow-x-hidden no-scrollbar   study-calendar-dark">
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
        </div>
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-[1000] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-5xl max-h-[92vh] overflow-hidden rounded-3xl bg-white shadow-2xl border border-slate-200 flex flex-col animate-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="px-6 py-5 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-2xl bg-white/15">
                  <CalIcon className="w-6 h-6" />
                </div>

                <div>
                  <h2 className="text-xl md:text-2xl font-extrabold leading-tight">
                    {selectedDayInfo.date || "New Event"}
                  </h2>
                  <p className="text-xs md:text-sm text-indigo-100">
                    Add details and keep your study plan organized
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  setModalOpen(false);
                  resetForm();
                }}
                className="p-2 rounded-2xl bg-white/15 hover:bg-white/25 transition"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-auto p-5 md:p-6 space-y-6">
              {/* Event List */}
              <div className="space-y-3">
                <h3 className="flex items-center gap-2 font-bold text-slate-800 text-base md:text-lg">
                  <List className="w-5 h-5 text-indigo-600" />
                  Planned for this Day
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-44 overflow-y-auto pr-1">
                  {selectedDayInfo.events.map((ev, i) => (
                    <div
                      key={ev.id || i}
                      className="group rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-all"
                    >
                      <div className="p-4 flex flex-col gap-2">
                        <div className="flex justify-between items-start gap-4">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-extrabold text-slate-800 text-sm truncate">
                                {ev.title}
                              </p>

                              <span
                                className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold border ${
                                  ev.priority === 3
                                    ? "bg-rose-50 text-rose-600 border-rose-200"
                                    : ev.priority === 2
                                      ? "bg-amber-50 text-amber-700 border-amber-200"
                                      : "bg-emerald-50 text-emerald-700 border-emerald-200"
                                }`}
                              >
                                {ev.priority === 3
                                  ? "High"
                                  : ev.priority === 2
                                    ? "Medium"
                                    : "Low"}
                              </span>
                            </div>

                            <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mt-1">
                              {ev.category}
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            {/* Delete button */}
                            <button
                              onClick={() => onDeleteEvent(ev.id)}
                              className="opacity-0 group-hover:opacity-100 p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                              aria-label="Delete event"
                            >
                              <X className="w-4 h-4" />
                            </button>

                            {/* Priority dot */}
                            <span
                              className={`w-2.5 h-2.5 rounded-full ${
                                ev.priority === 3
                                  ? "bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.35)]"
                                  : ev.priority === 2
                                    ? "bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.35)]"
                                    : "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.35)]"
                              }`}
                            />
                          </div>
                        </div>

                        {ev.description && (
                          <div className="pt-2 border-t border-slate-100 text-xs text-slate-600 italic">
                            “{ev.description}”
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Form */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 border-t border-slate-100 pt-6">
                {/* Left */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-extrabold text-slate-700 mb-1">
                      Topic Title
                    </label>
                    <input
                      className="w-full bg-white border border-slate-200 px-4 py-3 rounded-2xl outline-none
                               focus:ring-4 focus:ring-indigo-500/15 focus:border-indigo-400 transition"
                      placeholder="e.g. TCP Congestion Control"
                      value={formData.title}
                      onChange={(e) =>
                        setFormData({ ...formData, title: e.target.value })
                      }
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-extrabold text-slate-700 mb-1">
                      Description
                    </label>
                    <textarea
                      rows={3}
                      className="w-full bg-white border border-slate-200 px-4 py-3 rounded-2xl outline-none
                               focus:ring-4 focus:ring-indigo-500/15 focus:border-indigo-400 transition"
                      placeholder="Important chapters / checklist..."
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          description: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>

                {/* Right */}
                <div className="space-y-5">
                  {/* Date & time */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-extrabold text-slate-700 mb-1">
                        Start Time
                      </label>
                      <input
                        type="datetime-local"
                        className="w-full bg-white border border-slate-200 px-3 py-2.5 rounded-2xl text-sm outline-none
                                 focus:ring-4 focus:ring-indigo-500/15 focus:border-indigo-400 transition"
                        value={formatForInput(formData.start_time)}
                        onChange={(e) => {
                          if (!e.target.value) return;
                          setFormData({
                            ...formData,
                            start_time: new Date(e.target.value).toISOString(),
                          });
                        }}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-extrabold text-slate-700 mb-1">
                        End Time
                      </label>
                      <input
                        type="datetime-local"
                        className="w-full bg-white border border-slate-200 px-3 py-2.5 rounded-2xl text-sm outline-none
                                 focus:ring-4 focus:ring-indigo-500/15 focus:border-indigo-400 transition"
                        value={formatForInput(formData.end_time)}
                        onChange={(e) => {
                          if (!e.target.value) return;
                          setFormData({
                            ...formData,
                            end_time: new Date(e.target.value).toISOString(),
                          });
                        }}
                      />
                    </div>
                  </div>

                  {/* Category */}
                  <div>
                    <label className="block text-sm font-extrabold text-slate-700 mb-2">
                      Category
                    </label>

                    <div className="flex flex-wrap gap-2">
                      {CATEGORIES.map((cat) => (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() =>
                            setFormData({ ...formData, category: cat.id })
                          }
                          className={`px-4 py-2 rounded-2xl border text-sm font-extrabold transition-all ${
                            formData.category === cat.id
                              ? `bg-gradient-to-r ${cat.color} text-white border-transparent shadow-md`
                              : "bg-white border-slate-200 text-slate-500 hover:border-indigo-200 hover:bg-indigo-50/50"
                          }`}
                        >
                          {cat.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Priority */}
                  <div>
                    <label className="block text-sm font-extrabold text-slate-700 mb-2">
                      Priority
                    </label>

                    <div className="flex gap-3">
                      {PRIORITIES.map((prio) => (
                        <button
                          key={prio.id}
                          type="button"
                          onClick={() =>
                            setFormData({ ...formData, priority: prio.id })
                          }
                          className={`flex-1 px-3 py-2 rounded-2xl border text-sm font-extrabold transition-all ${
                            formData.priority === prio.id
                              ? prio.color + " border-transparent shadow-md"
                              : "bg-white border-slate-200 text-slate-400 hover:bg-slate-50"
                          }`}
                        >
                          {prio.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button
                onClick={() => {
                  setModalOpen(false);
                  resetForm();
                }}
                className="px-5 py-2.5 text-slate-600 font-extrabold hover:bg-slate-200/60 rounded-2xl transition"
              >
                Cancel
              </button>

              <button
                onClick={handleSubmit}
                disabled={
                  !formData.title || !formData.start_time || !formData.end_time
                }
                className="px-6 py-2.5 rounded-2xl font-extrabold text-white
                         bg-gradient-to-r from-indigo-600 to-purple-600 shadow-lg
                         disabled:opacity-50 disabled:cursor-not-allowed
                         hover:shadow-xl hover:brightness-110 transition-all"
              >
                Create Event
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudyCalendar;
