import React, { useState } from "react";
import PostModal from "../Components/CalendarPage/PostModal.jsx";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import postQueue from "../../../../backend/queue/postQueue.js";
import GuiltDaemon from "../Components/CalendarPage/GuiltDaemon.jsx";
import "@fullcalendar/common/main.css";
import "@fullcalendar/daygrid/main.css";


const eventz = postQueue
  .filter((post) => post.status === "approved")
  .map((post) => ({
    title: post.title,
    date: post.scheduled_at || post.intended_date,
    color: "#67e8f9",
  }));

  const [selectedPost, setSelectedPost] = useState(null);


export default function CalendarPage() {
  return (
    <div className="min-h-screen bg-black text-pink-500 font-mono p-4">
      <h1 className="text-4xl text-center text-pink-500 mb-4 tracking-widest">
        POSTPUNK
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
       <aside className="bg-black text-teal-300 font-mono p-4 border-2 border-pink-600 shadow-lg w-full md:w-64 rounded">
  <h2 className="text-pink-500 text-xl mb-4 border-b border-pink-500 pb-1">QUEUE</h2>
  {postQueue
    .filter((post) => post.status === "approved")
    .map((post, index) => (
      <div key={index} className="mb-3">
        <div className="uppercase">
          {new Date(post.scheduled_at).toLocaleDateString("en-US", {
            weekday: "short",
          })}
        </div>
        <div className="pl-2 text-pink-300">“{post.title}”</div>
        <div className="pl-2 text-sm text-teal-400">={post.platform}</div>
      </div>
    ))}
</aside>

        <main className="col-span-2">
          <FullCalendar
  plugins={[dayGridPlugin, interactionPlugin]}
  initialView="dayGridMonth"
  initialDate="2024-05-01"
  events={eventz}
  eventClick={(info) => {
    const foundPost = postQueue.find(
      (p) => p.title === info.event.title && (p.scheduled_at || p.intended_date) === info.event.startStr
    );
    setSelectedPost(foundPost || null);
  }}
  headerToolbar={{
    left: "prev,next",
    center: "title",
    right: "",
  }}
  height="auto"
  dayMaxEventRows={3}
  eventDisplay="block"
/>
<PostModal post={selectedPost} onClose={() => setSelectedPost(null)} />

        </main>
      </div>

      <footer className="mt-4 text-center text-pink-500 text-sm">
        <GuiltDaemon />
      </footer>
    </div>
  );
}



