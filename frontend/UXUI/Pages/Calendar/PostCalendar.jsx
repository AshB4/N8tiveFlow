import React from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import "@fullcalendar/common/main.css";
import "@fullcalendar/daygrid/main.css";

const events = [
  { title: "Cron Ritual Hacks", date: "2024-05-09T10:00:00", color: "#f472b6" },
  { title: "Install Video", date: "2024-05-10T12:00:00", color: "#f472b6" },
  { title: "System Reboot?", date: "2024-05-08T22:00:00", color: "#67e8f9" },
  { title: "Dev Confession", date: "2024-05-11T11:00:00", color: "#f472b6" },
  { title: "BTS Debug", date: "2024-05-24T15:00:00", color: "#67e8f9" },
];

const eventz = postQueue
  .filter(post => post.status === "approved")
  .map(post => ({
    title: post.title,
    date: post.scheduled_at || post.intended_date,
    color: "#67e8f9" // Or based on platform, status, etc.
  }));


export default function CalendarPage() {
  return (
    <div className="min-h-screen bg-black text-pink-500 font-mono p-4">
      <h1 className="text-4xl text-center text-pink-500 mb-4 tracking-widest">
        POSTPUNK
      </h1>
<div className="bg-ritual text-white text-xl p-4 rounded shadow">
  🎯 Tailwind is working in PostPunk
</div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <aside className="bg-black border border-pink-500 rounded p-4">
          <h2 className="text-xl mb-2 border-b border-pink-500 pb-1">QUEUE</h2>
          <ul className="space-y-2">
            <li>
              MON<br />"Green Square Life"<br />=Twitter
            </li>
            <li>
              TUE<br />"Cron Ritual Hacks"<br />=LinkedIn
            </li>
            <li>
              WED<br />"System Reboot?"<br />=Twitter
            </li>
            <li>
              THU<br />"Install Video"<br />=YouTube
            </li>
            <li>
              FRI<br />"Dev Confession"<br />=Instagram
            </li>
          </ul>
          <div className="text-right mt-4 text-pink-500">
            <span className="text-xs">⏻</span>
          </div>
        </aside>

        <main className="col-span-2">
          <FullCalendar
            plugins={[dayGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            initialDate="2024-05-01"
            events={events}
            headerToolbar={{
              left: "prev,next",
              center: "title",
              right: ""
            }}
            height="auto"
            dayMaxEventRows={3}
            eventDisplay="block"
          />
        </main>
      </div>

      <footer className="mt-4 text-center text-pink-500 text-sm">
        GUILT DAEMON — How productive. Your true fans weep...
      </footer>
    </div>

  );
}

// | Feature                     | How It Helps                          |
// | --------------------------- | ------------------------------------- |
// | 🗓 Schedule post months out | Pre-plan launches, evergreen promos   |
// | 🖱 Click-to-edit post       | CRUD in calendar view                 |
// | 🏷 Color by platform/status | Visual at-a-glance clarity            |
// | 🔃 Sync with queue file     | Changes are written to `postQueue.js` |
// | 🚀 Save to Docker backend   | For persistence + syncing             |

// add inthisink as a button https://metatags.io 
//See your:
// 🧠 Title
// 🧾 Description
// 🖼 Image
// 👥 Twitter & Facebook previews
// Update your SEOHead.jsx if anything looks off