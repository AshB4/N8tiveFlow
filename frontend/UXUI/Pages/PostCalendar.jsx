// Refactored PostCalendar with widgets added to right panel and fixed ordering of variables

import React, { useState, useEffect } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import GuiltDaemon from "../Components/CalendarPage/GuiltDaemon.jsx";
import PostModal from "../Components/CalendarPage/PostModal.jsx";
import logo from "../../assets/PostPunkTransparentLogo.png";

export default function PostCalendar() {
  const [postQueue, setPostQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState(null);

  const res = await fetch('/api/posts');
const posts = await res.json();


  // const DUMMY_POSTS = 
  // [
  //   {
  //     title: "🌕 Full Moon Engagement Ritual",
  //     scheduled_at: "2025-06-01",
  //     platform: "Instagram",
  //     engagement: 49,
  //     created_at: "2025-05-01",
  //     status: "approved",
  //   },
  //   {
  //     title: "🌌 Glitch Dump",
  //     scheduled_at: null,
  //     platform: "Twitter",
  //     engagement: 0,
  //     created_at: "2025-04-10",
  //     status: "draft",
  //   },
  //   {
  //     title: "🔥 Viral Spiral Memory Dump",
  //     scheduled_at: "2025-06-10",
  //     platform: "TikTok",
  //     engagement: 120,
  //     created_at: "2025-05-03",
  //     status: "approved",
  //   }
  // ];

  // useEffect(() => {
  //   setPostQueue(DUMMY_POSTS);
  //   setLoading(false);
  // }, []);

  const scheduledPosts = postQueue.filter((post) => post.status === "approved");

  const percentScheduled = postQueue.length > 0
    ? Math.round((scheduledPosts.length / postQueue.length) * 100)
    : 0;

  const platformCounts = postQueue.reduce((acc, post) => {
    acc[post.platform] = (acc[post.platform] || 0) + 1;
    return acc;
  }, {});

  const oldestUnscheduled = postQueue
    .filter((post) => post.status !== "approved")
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))[0];

  const mostEngaged = [...postQueue]
    .filter((p) => typeof p.engagement === "number")
    .sort((a, b) => b.engagement - a.engagement)[0];

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

      <div className="grid grid-cols-1 md:grid-cols-[320px_1fr_260px] gap-4">
        <aside className="bg-black text-teal-300 p-4 border-2 border-pink-600 shadow-lg rounded">
          <h2 className="text-pink-500 text-2xl mb-4 border-b border-pink-500 pb-1">QUEUE</h2>
          {scheduledPosts.map((post, index) => (
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

        <div className="w-full flex flex-col gap-4 text-teal-300 text-sm">
          <div className="border border-teal-400 p-3 rounded bg-black">
            <h3 className="text-pink-400 text-lg mb-1">📊 Mini Stats</h3>
            <p>Total Posts: {postQueue.length}</p>
            <p>Scheduled: {scheduledPosts.length} ({percentScheduled}%)</p>
          </div>

          <div className="border border-pink-600 p-3 rounded bg-black">
            <h3 className="text-pink-400 text-lg mb-1">🎯 Platform Mix</h3>
            <ul>
              {Object.entries(platformCounts).map(([platform, count]) => (
                <li key={platform}>{platform}: {count}</li>
              ))}
            </ul>
          </div>

          <div className="border border-red-500 p-3 rounded bg-black">
            <h3 className="text-pink-400 text-lg mb-1">💀 Engagement Alerts</h3>
            {oldestUnscheduled && (
              <p>Oldest unscheduled: “{oldestUnscheduled.title}”</p>
            )}
            {mostEngaged && mostEngaged.engagement > 0 && (
              <p>Most engaged: “{mostEngaged.title}” ({mostEngaged.engagement} reactions)</p>
            )}
          </div>

          <div className="border border-teal-500 p-3 rounded bg-black">
            <h3 className="text-pink-400 text-lg mb-1">🔋 Content Fuel</h3>
            <div className="bg-gray-800 h-4 w-full rounded overflow-hidden">
              <div
                className="bg-teal-400 h-4"
                style={{ width: `${Math.min(percentScheduled, 100)}%` }}
              ></div>
            </div>
            <p className="mt-1">{percentScheduled}% scheduled</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Future ideas: Pull in the Menubar from https://ui.shadcn.com/docs/components/navigation-menu