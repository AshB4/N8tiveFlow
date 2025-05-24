// Refactored PostCalendar with better layout, fat queue, lined header, bigger logo, improved calendar theme

import React, { useState, useEffect } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import GuiltDaemon from "../Components/CalendarPage/GuiltDaemon.jsx";
import PostModal from "../Components/CalendarPage/PostModal.jsx";
import logo from "../../assets/PostPunkTransparentLogo.png";
import { PrimaryButton } from "@/Components/Global/Buttons/PrimaryButton";
import { DangerButton } from "@/Components/Global/Buttons/DangerButton";

export default function PostCalendar() {
  const [postQueue, setPostQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState(null);

  const handleSave = () => {
    console.log("Saving post... (not implemented)");
  };

  const handleDelete = () => {
    console.log("Deleting post... (not implemented)");
  };

  const eventz = postQueue
    .filter((post) => post.status === "approved")
    .map((post) => ({
      title: post.title,
      date: post.scheduled_at || post.intended_date,
      color: "#67e8f9",
      textColor: "#000000",
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
      <div className="flex items-center justify-center mb-6 border-b border-pink-500 pb-4">
        <img
          src={logo}
          alt="PostPunk Logo"
          className="h-32 w-auto drop-shadow-[0_0_12px_#ff00ff]"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[320px_1fr_200px] gap-4">
        <aside className="bg-black text-teal-300 p-4 border-2 border-pink-600 shadow-lg rounded">
          <h2 className="text-pink-500 text-2xl mb-4 border-b border-pink-500 pb-1">QUEUE</h2>
          {postQueue
            .filter((post) => post.status === "approved")
            .map((post, index) => (
              <div key={index} className="mb-3">
                <div className="uppercase">
                  {new Date(post.scheduled_at).toLocaleDateString("en-US", {
                    weekday: "short",
                  })}
                </div>
                <div className="pl-2 text-pink-300 font-bold">"{post.title}"</div>
                <div className="pl-2 text-sm text-teal-400">={post.platform}</div>
              </div>
            ))}
          <div className="mt-6">
            <GuiltDaemon />
          </div>
        </aside>

        <main className="col-span-1 md:col-span-1 border-2 border-pink-600 rounded p-2">
          <FullCalendar
            plugins={[dayGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            initialDate={earliest}
            events={eventz}
            eventClick={(info) => {
              const foundPost = postQueue.find(
                (p) =>
                  p.title === info.event.title &&
                  (p.scheduled_at || p.intended_date) === info.event.startStr
              );
              setSelectedPost(foundPost || null);
            }}
            headerToolbar={{
              left: "prev",
              center: "title",
              right: "next",
            }}
            titleFormat={{ year: "numeric", month: "long" }}
            height="auto"
            dayMaxEventRows={3}
            eventDisplay="block"
          />
          <PostModal post={selectedPost} onClose={() => setSelectedPost(null)} />
        </main>

        <div className="hidden md:block w-full">
          <div className="flex flex-col gap-2">
            <PrimaryButton label="Save Post" onClick={handleSave} />
            <DangerButton label="Delete Forever" onClick={handleDelete} />
          </div>
        </div>
      </div>
    </div>
  );
}