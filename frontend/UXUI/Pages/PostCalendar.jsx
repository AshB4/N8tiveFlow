// Refactored PostCalendar with widgets added to right panel and fixed ordering of variables

import React, { useState, useEffect, useMemo } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import AppTopNav from "../Components/AppTopNav";
import GuiltDaemon from "../Components/CalendarPage/GuiltDaemon.jsx";
import DayPostsModal from "../Components/CalendarPage/DayPostsModal.jsx";
import {
  getWorkflowPalette,
  getWorkflowColorKey,
  isApprovedStatus,
  isAffiliatePost,
  normalizePostStatus,
} from "../utils/postStatus";

const API_BASE = import.meta.env?.VITE_API_BASE || "http://localhost:3001";

const toLocalDateKey = (value) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const tzOffset = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - tzOffset).toISOString().slice(0, 10);
};

const getPostDate = (post) => {
  const raw =
    post.scheduled_at || post.scheduledAt || post.intended_date || post.date;
  if (!raw) return null;
  return toLocalDateKey(raw);
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

const getPlatformSetForPost = (post) => {
  const set = new Set();
  for (const target of normalizeTargetsForPost(post)) {
    if (target?.platform) {
      set.add(String(target.platform).toLowerCase());
    }
  }
  return set;
};

const getCalendarPostPriority = (post) => {
  const platforms = getPlatformSetForPost(post);
  const hasFacebookOrInstagram =
    platforms.has("facebook") || platforms.has("instagram");
  if (hasFacebookOrInstagram) {
    return 0;
  }

  const isAmazonAffiliatePin =
    isAffiliatePost(post) &&
    (platforms.has("pinterest") || platforms.has("amazon"));
  if (isAmazonAffiliatePin) {
    return 2;
  }

  return 1;
};

const compareCalendarPostOrder = (left, right) => {
  const leftPriority = getCalendarPostPriority(left);
  const rightPriority = getCalendarPostPriority(right);
  if (leftPriority !== rightPriority) {
    return leftPriority - rightPriority;
  }

  const leftTime = new Date(
    left.scheduledAt || left.scheduled_at || left.intended_date || left.date || 0
  ).getTime();
  const rightTime = new Date(
    right.scheduledAt || right.scheduled_at || right.intended_date || right.date || 0
  ).getTime();
  if (leftTime !== rightTime) {
    return leftTime - rightTime;
  }

  return String(left.title || "").localeCompare(String(right.title || ""));
};

const getAffiliateDayBadgeStyle = (workflowKey) => {
  const styles = {
    failed: { backgroundColor: "#e11d48", color: "#ffffff" },
    posted: { backgroundColor: "#65a30d", color: "#ffffff" },
    scheduled: { backgroundColor: "#06b6d4", color: "#000000" },
    needs_action: { backgroundColor: "#f97316", color: "#000000" },
    draft: { backgroundColor: "#8b5cf6", color: "#ffffff" },
    archived: { backgroundColor: "#71717a", color: "#ffffff" },
  };
  return styles[workflowKey] || styles.scheduled;
};

export default function PostCalendar() {
  const location = useLocation();
  const [postQueue, setPostQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedDayPosts, setSelectedDayPosts] = useState([]);
  const [workingPostId, setWorkingPostId] = useState(null);
  const [remixingQueue, setRemixingQueue] = useState(false);
  const [remixResult, setRemixResult] = useState(null);
  const navigate = useNavigate();

  const loadPosts = async () => {
    const res = await fetch(`${API_BASE}/api/posts`);
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || `Failed to load posts: ${res.status}`);
    const normalizedPosts = data.map((post) => ({
      ...post,
      status: normalizePostStatus(post.status),
    }));
    setPostQueue(normalizedPosts);
    return normalizedPosts;
  };

  useEffect(() => {
    async function loadInitialPosts() {
      try {
        await loadPosts();
      } catch (err) {
        console.error("Failed to load posts", err);
      } finally {
        setLoading(false);
      }
    }

    loadInitialPosts();
  }, []);

  const scheduledPosts = postQueue.filter((post) => isApprovedStatus(post.status));
  const calendarPosts = postQueue.filter((post) => {
    const status = normalizePostStatus(post.status);
    return isApprovedStatus(status) || status === "failed";
  });

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
      calendarPosts
        .map((post) => {
          const dateIso = getPostDate(post);
          const palette = getWorkflowPalette(post);
          return {
            id: post.id || `${post.title}-${dateIso}`,
            title:
              palette.key === "failed"
                ? `FAILED • ${post.title}`
                : palette.key === "needs_action"
                ? `FIX • ${post.title}`
                : post.title,
            date: dateIso,
            color: palette.calendarColor,
            textColor: palette.calendarTextColor,
            extendedProps: {
              status: normalizePostStatus(post.status),
              workflow: palette.key,
              affiliate: isAffiliatePost(post),
              originalTitle: post.title,
              sortRank: getCalendarPostPriority(post),
            },
          };
        })
        .filter((event) => Boolean(event.date)),
    [calendarPosts]
  );

  const affiliateDayMap = useMemo(() => {
    const priority = {
      failed: 5,
      posted: 4,
      scheduled: 3,
      needs_action: 2,
      draft: 1,
      archived: 0,
    };
    const result = new Map();

    for (const post of calendarPosts) {
      const dateIso = getPostDate(post);
      if (!dateIso || !isAffiliatePost(post)) continue;
      const key = getWorkflowColorKey(post);
      const current = result.get(dateIso);
      if (!current || priority[key] > priority[current]) {
        result.set(dateIso, key);
      }
    }

    return result;
  }, [calendarPosts]);

  const now = new Date();
  const todayIso = toLocalDateKey(now);

  const initialDate = useMemo(() => {
    const requestedDate = location.state?.focusDate;
    if (requestedDate) {
      return requestedDate;
    }
    const upcomingDates = eventz
      .map((event) => event.date)
      .filter((date) => date && date >= todayIso)
      .sort();
    if (upcomingDates.length > 0) {
      return upcomingDates[0];
    }
    return todayIso;
  }, [eventz, todayIso, location.state?.focusDate]);

  const upcomingScheduled = scheduledPosts
    .map((post, idx) => ({
      ...post,
      __queueIndex: idx,
      __date: getPostDate(post),
      __targets: normalizeTargetsForPost(post),
    }))
    .filter((post) => post.__date && post.__date >= todayIso)
    .sort((a, b) => {
      if (a.__date !== b.__date) return a.__date < b.__date ? -1 : 1;
      return compareCalendarPostOrder(a, b);
    });

  const pastScheduled = scheduledPosts
    .map((post, idx) => ({
      ...post,
      __queueIndex: idx,
      __date: getPostDate(post),
      __targets: normalizeTargetsForPost(post),
    }))
    .filter((post) => post.__date && post.__date < todayIso)
    .sort((a, b) => {
      if (a.__date !== b.__date) return a.__date > b.__date ? -1 : 1;
      return compareCalendarPostOrder(a, b);
    });

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-pink-500 font-mono p-4">
        <AppTopNav />
        <div>Loading posts…</div>
      </div>
    );
  }

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
      .filter((post) => getPostDate(post) === isoDate)
      .sort(compareCalendarPostOrder);
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

  const handleRemixPinterestQueue = async () => {
    const start = new Date();
    start.setDate(start.getDate() + 1);
    const startDate = selectedDate && selectedDate >= todayIso
      ? selectedDate
      : toLocalDateKey(start);

    setRemixingQueue(true);
    setRemixResult(null);
    try {
      const res = await fetch(`${API_BASE}/api/queue/rebalance-pinterest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startDate }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || `Remix failed: ${res.status}`);
      }
      const refreshedPosts = await loadPosts();
      if (selectedDate) {
        const dayPosts = refreshedPosts
          .map((post, idx) => ({
            ...post,
            id: post.id || post._id || `queue-${idx}`,
            __queueIndex: idx,
            __hasRealId: Boolean(post.id || post._id),
            targets: normalizeTargetsForPost(post),
          }))
          .filter((post) => getPostDate(post) === selectedDate)
          .sort(compareCalendarPostOrder);
        setSelectedDayPosts(dayPosts);
      }
      setRemixResult({
        ok: true,
        startDate,
        moved: data.moved || 0,
        daysUsed: data.daysUsed || 0,
      });
    } catch (error) {
      console.error("Failed to remix Pinterest queue", error);
      setRemixResult({
        ok: false,
        message: error?.message || "Remix failed",
      });
    } finally {
      setRemixingQueue(false);
    }
  };

  const retryFailedPost = async (post) => {
    const currentScheduled = new Date(
      post.scheduledAt || post.scheduled_at || Date.now(),
    );
    if (Number.isNaN(currentScheduled.getTime())) {
      return;
    }
    const nextScheduled = new Date(currentScheduled);
    nextScheduled.setDate(nextScheduled.getDate() + 1);
    setWorkingPostId(post.id);
    try {
      const res = await fetch(`${API_BASE}/api/posts/${post.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "approved",
          scheduledAt: nextScheduled.toISOString(),
          attemptCount: 0,
          nextAttemptAt: null,
          lastErrorAt: null,
        }),
      });
      if (!res.ok) {
        throw new Error(`Retry failed: ${res.status}`);
      }
      const updated = await res.json();
      const normalized = {
        ...updated,
        status: normalizePostStatus(updated.status),
      };
      setPostQueue((prev) =>
        prev.map((entry) => (entry.id === normalized.id ? normalized : entry)),
      );
      setSelectedDayPosts((prev) =>
        prev.map((entry) => (entry.id === normalized.id ? normalized : entry)),
      );
    } catch (error) {
      console.error("Failed to retry post", error);
    } finally {
      setWorkingPostId(null);
    }
  };

  const retryFailedPostNow = async (post) => {
    setWorkingPostId(post.id);
    try {
      const res = await fetch(`${API_BASE}/api/posts/${post.id}/retry-now`, {
        method: "POST",
      });
      if (!res.ok) {
        throw new Error(`Retry-now failed: ${res.status}`);
      }
      const data = await res.json();
      const queueItem = data?.queueItem
        ? { ...data.queueItem, status: normalizePostStatus(data.queueItem.status) }
        : null;

      setPostQueue((prev) => {
        if (queueItem) {
          return prev.map((entry) => (entry.id === queueItem.id ? queueItem : entry));
        }
        return prev.filter((entry) => entry.id !== post.id);
      });

      setSelectedDayPosts((prev) => {
        if (queueItem) {
          return prev.map((entry) => (entry.id === queueItem.id ? queueItem : entry));
        }
        return prev.filter((entry) => entry.id !== post.id);
      });
    } catch (error) {
      console.error("Failed to retry post now", error);
    } finally {
      setWorkingPostId(null);
    }
  };

  return (
    <div className="min-h-screen bg-black text-pink-500 font-mono p-4">
      <AppTopNav includeLab />

      <div className="grid grid-cols-1 md:grid-cols-[320px_1fr_260px] gap-4">
        <aside
          className="bg-black text-teal-300 p-4 border-2 border-pink-600 shadow-lg rounded cursor-pointer hover:border-teal-400 transition-colors"
          onClick={() => navigate('/archive')}
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
                <div className="pl-2">
                  {isAffiliatePost(post) && (
                    <span
                      className={`mb-1 inline-flex h-6 w-6 items-center justify-center rounded-full border text-[11px] ${getWorkflowPalette(post).badgeClass}`}
                      aria-label="Affiliate post"
                      title="Affiliate post"
                    >
                      🛒
                    </span>
                  )}
                  <div className="text-pink-300 font-bold">"{post.title}"</div>
                </div>
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
                      <span className="text-pink-300 font-semibold flex items-center gap-2">
                        {isAffiliatePost(post) && (
                          <span
                            className={`inline-flex h-6 w-6 items-center justify-center rounded-full border text-[11px] ${getWorkflowPalette(post).badgeClass}`}
                            aria-label="Affiliate post"
                            title="Affiliate post"
                          >
                            🛒
                          </span>
                        )}
                        <span>{post.title}</span>
                      </span>
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
            eventContent={(eventInfo) => {
              const title =
                eventInfo.event.extendedProps.originalTitle || eventInfo.event.title;
              return (
                <div className="overflow-hidden">
                  <span className="truncate text-[11px] font-semibold leading-tight">
                    {title}
                  </span>
                </div>
              );
            }}
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
            eventOrder={(left, right) => {
              const leftRank = Number(left?.extendedProps?.sortRank ?? 1);
              const rightRank = Number(right?.extendedProps?.sortRank ?? 1);
              if (leftRank !== rightRank) return leftRank - rightRank;
              const leftTitle = String(
                left?.extendedProps?.originalTitle || left?.title || ""
              );
              const rightTitle = String(
                right?.extendedProps?.originalTitle || right?.title || ""
              );
              return leftTitle.localeCompare(rightTitle);
            }}
            dayCellClassNames={(arg) => {
              const dateStr = toLocalDateKey(arg.date);
              const classes = [];
              if (dateStr === todayIso) {
                classes.push("bg-pink-900/20");
              }
              if (selectedDate && dateStr === selectedDate) {
                classes.push("ring-2", "ring-pink-500");
              }
              return classes;
            }}
            dayCellContent={(arg) => {
              const dateStr = toLocalDateKey(arg.date);
              const affiliateWorkflow = affiliateDayMap.get(dateStr);
              const affiliateBadgeStyle = affiliateWorkflow
                ? getAffiliateDayBadgeStyle(affiliateWorkflow)
                : null;

              return (
                <div className="flex items-start justify-between px-1 pt-1">
                  <div className="flex items-center gap-1.5">
                    {affiliateBadgeStyle ? (
                      <span
                        className="inline-flex h-6 w-6 items-center justify-center rounded-full text-[11px] leading-none shadow-[0_0_0_1px_rgba(0,0,0,0.35)]"
                        style={affiliateBadgeStyle}
                        aria-label="Affiliate post scheduled"
                        title={`Affiliate post: ${affiliateWorkflow}`}
                      >
                        🛒
                      </span>
                    ) : (
                      <span className="inline-flex h-6 w-6" aria-hidden="true" />
                    )}
                    <span>{arg.dayNumberText}</span>
                  </div>
                </div>
              );
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
            onRetryPost={retryFailedPost}
            onRetryNow={retryFailedPostNow}
            workingPostId={workingPostId}
          />
        </main>

        <div className="w-full flex flex-col gap-4 text-teal-300 text-sm">
          <button
            type="button"
            onClick={handleRemixPinterestQueue}
            disabled={remixingQueue}
            className="border border-cyan-400 p-3 rounded bg-black text-left hover:border-pink-500 hover:shadow-[0_0_12px_rgba(34,211,238,0.35)] transition disabled:cursor-wait disabled:opacity-60"
          >
            <h3 className="text-pink-400 text-lg mb-1">↻ Remix Pinterest</h3>
            <p>
              {remixingQueue
                ? "Remixing..."
                : remixResult?.ok
                ? `Moved ${remixResult.moved} posts from ${remixResult.startDate}`
                : remixResult?.message || "amazon-a / amazon-b / digital / wildcard"}
            </p>
          </button>

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
