export default function ContentDashboard() {
  return (
    <div className="flex min-h-screen bg-[#181A1B]">
      {/* Sidebar/Calendar */}
      <aside className="w-72 bg-[#23272a] p-6 rounded-r-2xl shadow-xl flex flex-col gap-6">
        <h2 className="text-xl text-white font-bold mb-4">Calendar</h2>
        <div className="flex flex-col gap-3">
          {/* Example platform event */}
          <div className="flex items-center gap-3 bg-[#202225] rounded-xl p-3 shadow-lg">
            <span className="w-7 h-7 rounded-full flex items-center justify-center bg-red-600 shadow-md">
              {/* Pinterest Icon SVG */}
            </span>
            <span className="text-white font-medium">Llama Coloring Book Preview</span>
          </div>
          <div className="flex items-center gap-3 bg-[#202225] rounded-xl p-3">
            <span className="w-7 h-7 rounded-full bg-black flex items-center justify-center">
              {/* X Icon SVG */}
            </span>
            <span className="text-white font-medium">Why I Built PostPunk</span>
          </div>
        </div>
      </aside>
      {/* Main content area */}
      <main className="flex-1 p-8">
        <div className="flex gap-4 mb-6">
          <button className="px-5 py-2 rounded-full bg-[#604AE6] text-white font-bold shadow-md">
            Longform
          </button>
          <button className="px-5 py-2 rounded-full bg-[#2ea043] text-white font-bold shadow-md">
            Shortform
          </button>
        </div>
        <section className="grid grid-cols-2 gap-8">
          {/* Longform card */}
          <div className="bg-[#23272a] border-l-8 border-[#604AE6] rounded-xl p-6 shadow-lg">
            <h3 className="text-white text-lg font-bold mb-2">How to Integrate the X API with Node.js</h3>
            <span className="text-[#FFD600] text-xs font-semibold rounded px-2 py-1 bg-[#23272a]/80">Draft</span>
            <p className="text-gray-300 mt-2">A step-by-step tutorial on working with the new API.</p>
          </div>
          {/* Shortform card */}
          <div className="bg-[#23272a] border-l-8 border-[#2ea043] rounded-xl p-6 shadow-lg">
            <h3 className="text-white text-lg font-bold mb-2">Why I Built PostPunk</h3>
            <span className="text-[#6EE7B7] text-xs font-semibold rounded px-2 py-1 bg-[#23272a]/80">Scheduled</span>
            <p className="text-gray-300 mt-2">Short post for X, LinkedIn, Reddit, etc.</p>
          </div>
        </section>
      </main>
    </div>
  );
}

{/* TODO: Remix this post via GPT to adjust tone per platform */}
// Drag-and-drop, remix-ready editor for creating and scheduling posts