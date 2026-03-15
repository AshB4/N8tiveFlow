// Refactored PostCalendar with widgets added to right panel and fixed ordering of variables

import React, { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import GuiltDaemon from "../Components/CalendarPage/GuiltDaemon.jsx";
import DayPostsModal from "../Components/CalendarPage/DayPostsModal.jsx";
import logo from "../../assets/PostPunkTransparentLogo.png";
import { isApprovedStatus, normalizePostStatus } from "../utils/postStatus";

const getPostDate = (post) => {
  const raw =
    post.scheduled_at || post.scheduledAt || post.intended_date || post.date;
  if (!raw) return null;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
};

const normalizeTargetsForPost = (post) => {
  if (!post) return [];
  if (Array.isArray(post.targets) && post.targets.length) {
    return post.targets
      .map((target) => {
        if (!target) return null;
        const platform = String(target.platform || "").toLowerCase();
        if (!platform) return null;
        const accountValue =
          target.accountId ?? target.account ?? target.account_id ?? null;
        const accountId =
          accountValue === undefined || accountValue === null
            ? null
            : String(accountValue);
        return { platform, accountId };
      })
      .filter(Boolean);
  }
  const platforms = Array.isArray(post.platforms)
    ? post.platforms
    : post.platform
    ? [post.platform]
    : [];
  return platforms
    .map((platform) => {
      if (!platform) return null;
      return { platform: String(platform).toLowerCase(), accountId: null };
    })
    .filter(Boolean);
};

const formatTargetsLabel = (targets = [], fallbackPlatforms = []) => {
  const list = Array.isArray(targets) && targets.length
    ? targets
    : Array.isArray(fallbackPlatforms)
    ? fallbackPlatforms.map((platform) => ({ platform, accountId: null }))
    : [];
  if (!list.length) return "—";
  return list
    .map((entry) =>
      entry.accountId ? `${entry.platform} (${entry.accountId})` : entry.platform
    )
    .join(", ");
};

export default function PostCalendar() {
  const [postQueue, setPostQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedDayPosts, setSelectedDayPosts] = useState([]);
  const navigate = useNavigate();

  // Fetch posts from the backend queue
  useEffect(() => {
    async function loadPosts() {
      try {
        const res = await fetch("http://localhost:3001/api/posts");
        const data = await res.json();
        setPostQueue(
          data.map((post) => ({
            ...post,
            status: normalizePostStatus(post.status),
          })),
        );
      } catch (err) {
        console.error("Failed to load posts", err);
      } finally {
        setLoading(false);
      }
    }

    loadPosts();
  }, []);

  const scheduledPosts = postQueue.filter((post) => isApprovedStatus(post.status));

  const percentScheduled = postQueue.length > 0
    ? Math.round((scheduledPosts.length / postQueue.length) * 100)
    : 0;

  const platformCounts = postQueue.reduce((acc, post) => {
    const list = post.platform
      ? [post.platform]
      : Array.isArray(post.platforms)
      ? post.platforms
      : [];
    list.forEach((p) => {
      acc[p] = (acc[p] || 0) + 1;
    });
    return acc;
  }, {});

  const oldestUnscheduled = postQueue
    .filter((post) => !isApprovedStatus(post.status))
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))[0];

  const mostEngaged = [...postQueue]
    .filter((p) => typeof p.engagement === "number")
    .sort((a, b) => b.engagement - a.engagement)[0];

  const eventz = useMemo(
    () =>
      postQueue
        .filter((post) => isApprovedStatus(post.status))
        .map((post) => {
          const dateIso = getPostDate(post);
          return {
            id: post.id || `${post.title}-${dateIso}`,
            title: post.title,
            date: dateIso,
            color: "#67e8f9",
            textColor: "#000000",
          };
        })
        .filter((event) => Boolean(event.date)),
    [postQueue]
  );

  const now = new Date();
  const todayIso = now.toISOString().slice(0, 10);

  const initialDate = useMemo(() => {
    const upcomingDates = eventz
      .map((event) => event.date)
      .filter((date) => date && date >= todayIso)
      .sort();
    if (upcomingDates.length > 0) {
      return upcomingDates[0];
    }
    return todayIso;
  }, [eventz, todayIso]);

  const upcomingScheduled = scheduledPosts
    .map((post, idx) => ({
      ...post,
      __queueIndex: idx,
      __date: getPostDate(post),
      __targets: normalizeTargetsForPost(post),
    }))
    .filter((post) => post.__date && post.__date >= todayIso)
    .sort((a, b) => (a.__date < b.__date ? -1 : 1));

  const pastScheduled = scheduledPosts
    .map((post, idx) => ({
      ...post,
      __queueIndex: idx,
      __date: getPostDate(post),
      __targets: normalizeTargetsForPost(post),
    }))
    .filter((post) => post.__date && post.__date < todayIso)
    .sort((a, b) => (a.__date > b.__date ? -1 : 1));

  if (loading) return <div>Loading posts…</div>;

  const statsPayload = {
    totalPosts: postQueue.length,
    scheduledCount: scheduledPosts.length,
    scheduledPercent: percentScheduled,
    platformCounts,
    oldestUnscheduled,
    mostEngaged,
    posts: postQueue,
  };

  const handleViewCharts = (focus = "overview") => {
    navigate("/charts", {
      state: {
        stats: statsPayload,
        focus,
      },
    });
  };

  const handleDaySelection = (isoDate) => {
    setSelectedDate(isoDate);
    const dayPosts = postQueue
      .map((post, idx) => ({
        ...post,
        id: post.id || post._id || `queue-${idx}`,
        __queueIndex: idx,
        __hasRealId: Boolean(post.id || post._id),
        targets: normalizeTargetsForPost(post),
      }))
      .filter((post) => getPostDate(post) === isoDate);
    setSelectedDayPosts(dayPosts);
  };

  const handleEditPost = (post) => {
    setSelectedDate(null);
    setSelectedDayPosts([]);
    navigate("/compose", { state: { draft: post } });
  };

  const handleRewriteAll = (postsForDay) => {
    setSelectedDate(null);
    setSelectedDayPosts([]);
    navigate("/lab", { state: { date: selectedDate, posts: postsForDay } });
  };

  return (
    <div className="min-h-screen bg-black text-pink-500 font-mono p-4">
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 mb-6 border-b border-pink-500 pb-4">
        <img
          src={logo}
          alt="PostPunk Logo"
          className="h-32 w-auto drop-shadow-[0_0_12px_#ff00ff]"
        />
        <div className="flex flex-wrap gap-3">
          <Link
            to="/today"
            className="px-4 py-2 border border-amber-500 text-amber-300 hover:bg-amber-500 hover:text-black transition-colors rounded"
          >
            Today Ops
          </Link>
          <Link
            to="/compose"
            className="px-4 py-2 border border-pink-500 text-pink-300 hover:bg-pink-500 hover:text-black transition-colors rounded"
          >
            Summon Composer
          </Link>
          <Link
            to="/lab"
            className="px-4 py-2 border border-teal-400 text-teal-300 hover:bg-teal-400 hover:text-black transition-colors rounded"
          >
            Open Scribble Sanctum
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[320px_1fr_260px] gap-4">
        <aside
          className="bg-black text-teal-300 p-4 border-2 border-pink-600 shadow-lg rounded cursor-pointer hover:border-teal-400 transition-colors"
          onClick={() => navigate('/lib')}
        >
          <h2 className="text-pink-500 text-2xl mb-4 border-b border-pink-500 pb-1">QUEUE</h2>
          {upcomingScheduled.length === 0 ? (
            <p className="text-sm text-teal-500 italic">
              No upcoming posts. Summon one from the Lab or Composer.
            </p>
          ) : (
            upcomingScheduled.map((post) => (
              <div key={post.__queueIndex} className="mb-3">
                <div className="uppercase">
                  {new Date(post.__date).toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })}
                </div>
                <div className="pl-2 text-pink-300 font-bold">"{post.title}"</div>
                <div className="pl-2 text-sm text-teal-400">
                  {formatTargetsLabel(post.__targets, post.platforms)}
                </div>
              </div>
            ))
          )}
          {pastScheduled.length > 0 && (
            <div className="mt-6 pt-4 border-t border-pink-600">
              <h3 className="text-pink-400 text-lg mb-2 uppercase tracking-[0.2em]">
                Past echoes
              </h3>
              <ul className="space-y-2 text-xs text-teal-500 max-h-40 overflow-y-auto pr-1">
                {pastScheduled.map((post) => (
                  <li key={`past-${post.__queueIndex}`} className="border border-teal-700 rounded p-2 bg-black/60">
                    <div className="flex justify-between gap-2">
                      <span className="text-pink-300 font-semibold">{post.title}</span>
                      <span>
                        {new Date(post.__date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </div>
                    <p className="mt-1">
                      {formatTargetsLabel(post.__targets, post.platforms)}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="mt-6">
            <GuiltDaemon />
          </div>
        </aside>

        <main className="col-span-1 md:col-span-1 border-2 border-pink-600 rounded p-2">
          <FullCalendar
            plugins={[dayGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            initialDate={initialDate}
            events={eventz}
            eventClick={(info) => {
              handleDaySelection(info.event.startStr);
            }}
            dateClick={(info) => {
              handleDaySelection(info.dateStr);
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
            dayCellClassNames={(arg) => {
              const dateStr = arg.date.toISOString().slice(0, 10);
              const classes = [];
              if (dateStr === todayIso) {
                classes.push("bg-pink-900/20");
              }
              if (selectedDate && dateStr === selectedDate) {
                classes.push("ring-2", "ring-pink-500");
              }
              return classes;
            }}
          />
          <DayPostsModal
            date={selectedDate}
            posts={selectedDayPosts}
            onClose={() => {
              setSelectedDate(null);
              setSelectedDayPosts([]);
            }}
            onEditPost={handleEditPost}
            onRewriteAll={handleRewriteAll}
          />
        </main>

        <div className="w-full flex flex-col gap-4 text-teal-300 text-sm">
          <button
            type="button"
            onClick={() => handleViewCharts("overview")}
            className="border border-teal-400 p-3 rounded bg-black text-left hover:border-pink-500 hover:shadow-[0_0_12px_rgba(255,0,255,0.35)] transition"
          >
            <h3 className="text-pink-400 text-lg mb-1">📊 Mini Stats</h3>
            <p>Total Posts: {postQueue.length}</p>
            <p>Scheduled: {scheduledPosts.length} ({percentScheduled}%)</p>
          </button>

          <button
            type="button"
            onClick={() => handleViewCharts("platforms")}
            className="border border-pink-600 p-3 rounded bg-black text-left hover:border-teal-500 hover:shadow-[0_0_12px_rgba(13,148,136,0.35)] transition"
          >
            <h3 className="text-pink-400 text-lg mb-1">🎯 Platform Mix</h3>
            <ul>
              {Object.entries(platformCounts).map(([platform, count]) => (
                <li key={platform}>{platform}: {count}</li>
              ))}
            </ul>
          </button>

          <button
            type="button"
            onClick={() => handleViewCharts("engagement")}
            className="border border-red-500 p-3 rounded bg-black text-left hover:border-teal-400 hover:shadow-[0_0_12px_rgba(239,68,68,0.35)] transition"
          >
            <h3 className="text-pink-400 text-lg mb-1">💀 Engagement Alerts</h3>
            {oldestUnscheduled && (
              <p>Oldest unscheduled: “{oldestUnscheduled.title}”</p>
            )}
            {mostEngaged && mostEngaged.engagement > 0 && (
              <p>Most engaged: “{mostEngaged.title}” ({mostEngaged.engagement} reactions)</p>
            )}
          </button>

           <button
             type="button"
             onClick={() => handleViewCharts("pipeline")}
             className="border border-teal-500 p-3 rounded bg-black text-left hover:border-pink-400 hover:shadow-[0_0_12px_rgba(56,189,248,0.35)] transition"
           >
             <h3 className="text-pink-400 text-lg mb-1">🔋 Content Fuel</h3>
             <div className="bg-gray-800 h-4 w-full rounded overflow-hidden">
               <div
                 className="bg-teal-400 h-4"
                 style={{ width: `${Math.min(percentScheduled, 100)}%` }}
               ></div>
             </div>
             <p className="mt-1">{percentScheduled}% scheduled</p>
           </button>
        </div>
      </div>
    </div>
  );
}

// Future ideas: Pull in the Menubar from https://ui.shadcn.com/docs/components/navigation-menu
