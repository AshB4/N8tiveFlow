import React, { useState , useEffect} from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import GuiltDaemon from "../Components/CalendarPage/GuiltDaemon.jsx";
import PostModal from "../Components/CalendarPage/PostModal.jsx";




export default function PostCalendar() {
  const [postQueue, setPostQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState(null);


  const eventz = postQueue
  .filter((post) => post.status === "approved")
  .map((post) => ({
    title: post.title,
    date: post.scheduled_at || post.intended_date,
    color: "#67e8f9",
  }));

  useEffect(() => {
    fetch("http://localhost:3001/api/posts")
      .then((res) => res.json())
      .then((data) => {
        setPostQueue(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div>Loading posts…</div>;

  const earliest = eventz.length
  ? eventz.reduce((a, b) => (a.date < b.date ? a : b)).date
  : undefined;

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
  initialDate={earliest}
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

      <div className="flex flex-col sm:flex-row sm:items-start sm:gap-4 p-4">
  <GuiltDaemon />
</div>
    </div>
  );
}



