export default function RoadmapDetails({ path, onBack }) {
  const roadmap =
    typeof path.roadmap === "string" ? JSON.parse(path.roadmap) : path.roadmap;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <button
        onClick={onBack}
        className="text-blue-600 mb-4 flex items-center gap-2"
      >
        ← Back to My Paths
      </button>

      <header className="mb-10">
        <h1 className="text-4xl font-extrabold text-gray-900">{path.goal}</h1>
        <p className="text-lg text-gray-600 mt-2">{roadmap.description}</p>
      </header>

      <div className="space-y-8">
        {roadmap.weeks.map((week, idx) => (
          <div key={idx} className="relative pl-8 border-l-2 border-blue-100">
            {/* Timeline Dot */}
            <div className="absolute -left-[9px] top-0 w-4 h-4 bg-blue-500 rounded-full border-4 border-white shadow-sm" />

            <div className="bg-gray-50 rounded-2xl p-6">
              <h3 className="text-xl font-bold text-gray-800 mb-3">
                Week {week.week_number || idx + 1}: {week.title}
              </h3>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold text-sm uppercase text-gray-400 mb-2 tracking-wider">
                    Topics
                  </h4>
                  <ul className="space-y-1">
                    {week.topics.map((t, i) => (
                      <li key={i} className="text-gray-700">
                        • {t}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold text-sm uppercase text-gray-400 mb-2 tracking-wider">
                    Resources
                  </h4>
                  <div className="space-y-2">
                    {week.resources?.map((res, i) => (
                      // inside the resources mapping
                      <a
                        href={res.url}
                        target="_blank"
                        className="group flex items-center justify-between p-3 bg-white border border-gray-100 rounded-xl hover:border-blue-500 transition-all shadow-sm"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xl">
                            {res.type === "youtube" ? "📺" : "📄"}
                          </span>
                          <div>
                            <p className="text-sm font-bold text-gray-800 truncate max-w-[200px]">
                              {res.title}
                            </p>
                            {/* Visual indicator of the level for the resource */}
                            <span className="text-[10px] font-black uppercase text-blue-500 tracking-tighter">
                              {path.experience} Content
                            </span>
                          </div>
                        </div>
                        <span className="text-gray-300 group-hover:text-blue-500">
                          →
                        </span>
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
