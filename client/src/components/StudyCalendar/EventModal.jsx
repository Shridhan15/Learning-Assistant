import React from "react";
import { X, Calendar as CalIcon, List } from "lucide-react";

const CATEGORIES = [
  { id: "Revision", label: "Revision", color: "from-blue-500 to-indigo-600" },
  {
    id: "Assignment",
    label: "Assignment",
    color: "from-purple-500 to-pink-600",
  },
  { id: "Exam", label: "Exam", color: "from-rose-500 to-orange-600" },
  { id: "Lecture", label: "Lecture", color: "from-emerald-500 to-teal-600" },
];

const PRIORITIES = [
  { id: 1, label: "Low", color: "bg-emerald-100 text-emerald-700" },
  { id: 2, label: "Medium", color: "bg-amber-100 text-amber-700" },
  { id: 3, label: "High", color: "bg-rose-100 text-rose-700" },
];

const EventModal = ({
  isOpen,
  onClose,
  selectedDayInfo,
  formData,
  setFormData,
  handleSubmit,
  onDeleteEvent,
}) => {
  if (!isOpen) return null;

  const formatForInput = (isoString) => {
    if (!isoString) return "";
    const date = new Date(isoString);
    const offset = date.getTimezoneOffset() * 60000;
    const localISOTime = new Date(date.getTime() - offset)
      .toISOString()
      .slice(0, 16);
    return localISOTime;
  };

  return (
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
                {selectedDayInfo?.date || "New Event"}
              </h2>
              <p className="text-xs md:text-sm text-indigo-100">
                Add details and keep your study plan organized
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="cursor-pointer p-2 rounded-2xl bg-white/15 hover:bg-white/25 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-auto p-5 md:p-6 space-y-6">
          {/* Existing Events List */}
          <div className="space-y-3">
            <h3 className="flex items-center gap-2 font-bold text-slate-800 text-base md:text-lg">
              <List className="w-5 h-5 text-indigo-600" />
              Planned for this Day
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-44 overflow-y-auto pr-1">
              {selectedDayInfo?.events?.length > 0 ? (
                selectedDayInfo.events.map((ev, i) => (
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
                          <button
                            onClick={() => onDeleteEvent(ev.id)}
                            className="cursor-pointer opacity-0 group-hover:opacity-100 p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                          >
                            <X className="w-4 h-4" />
                          </button>
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
                ))
              ) : (
                <p className="text-sm text-slate-400 italic">
                  No events scheduled yet.
                </p>
              )}
            </div>
          </div>

          {/* New Event Form */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 border-t border-slate-100 pt-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-extrabold text-slate-700 mb-1">
                  Topic Title
                </label>
                <input
                  className="w-full bg-white border border-slate-200 px-4 py-3 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/15 focus:border-indigo-400 transition"
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
                  className="w-full bg-white border border-slate-200 px-4 py-3 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/15 focus:border-indigo-400 transition"
                  placeholder="Important chapters / checklist..."
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-extrabold text-slate-700 mb-1">
                    Start Time
                  </label>
                  <input
                    type="datetime-local"
                    className="w-full bg-white border border-slate-200 px-3 py-2.5 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-indigo-500/15 focus:border-indigo-400 transition"
                    value={formatForInput(formData.start_time)}
                    onChange={(e) =>
                      e.target.value &&
                      setFormData({
                        ...formData,
                        start_time: new Date(e.target.value).toISOString(),
                      })
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-extrabold text-slate-700 mb-1">
                    End Time
                  </label>
                  <input
                    type="datetime-local"
                    className="w-full bg-white border border-slate-200 px-3 py-2.5 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-indigo-500/15 focus:border-indigo-400 transition"
                    value={formatForInput(formData.end_time)}
                    onChange={(e) =>
                      e.target.value &&
                      setFormData({
                        ...formData,
                        end_time: new Date(e.target.value).toISOString(),
                      })
                    }
                  />
                </div>
              </div>

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
                      className={`cursor-pointer px-4 py-2 rounded-2xl border text-sm font-extrabold transition-all ${
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
                      className={`cursor-pointer flex-1 px-3 py-2 rounded-2xl border text-sm font-extrabold transition-all ${
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
            onClick={onClose}
            className="cursor-pointer px-5 py-2.5 text-slate-600 font-extrabold hover:bg-slate-200/60 rounded-2xl transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={
              !formData.title || !formData.start_time || !formData.end_time
            }
            className="cursor-pointer px-6 py-2.5 rounded-2xl font-extrabold text-white bg-gradient-to-r from-indigo-600 to-purple-600 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-xl hover:brightness-110 transition-all"
          >
            Create Event
          </button>
        </div>
      </div>
    </div>
  );
};

export default EventModal;
