import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useToast } from "@/Components/ui/use-toast";
import { getStatusLabel, normalizePostStatus } from "../utils/postStatus";

const API_BASE = import.meta.env?.VITE_API_BASE || "http://localhost:3001";

const platformUrls = {
  x: "https://x.com/compose/post",
  facebook: "https://www.facebook.com/",
  linkedin: "https://www.linkedin.com/feed/",
  pinterest: "https://www.pinterest.com/",
  reddit: "https://www.reddit.com/submit",
  tumblr: "https://www.tumblr.com/new/text",
  onlyfans: "https://onlyfans.com/posts/create",
  kofi: "https://ko-fi.com/manage/posts",
  discord: "https://discord.com/channels/@me",
  devto: "https://dev.to/new",
  hashnode: "https://hashnode.com/draft/new",
  producthunt: "https://www.producthunt.com/",
  amazon: "https://affiliate-program.amazon.com/",
  instagram: "https://www.instagram.com/",
  threads: "https://www.threads.net/",
};

const formatTargetsLabel = (targets = []) => {
  if (!Array.isArray(targets) || targets.length === 0) return "—";
  return targets
    .map((target) =>
      target.accountId
        ? `${target.platform} (${target.accountId})`
        : target.platform
    )
    .join(", ");
};

const getScheduledDate = (post) => {
  const raw = post.scheduledAt || post.scheduled_at || null;
  if (!raw) return null;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const getDateKey = (date) => {
  const tzOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - tzOffset).toISOString().slice(0, 10);
};

const getPostTextForPlatform = (post, platform) => {
  const overrides = post.platformOverrides || {};
  return overrides[platform] || post.body || post.content || "";
};

const getProductLink = (post) =>
  post?.metadata?.productLinks?.primary ||
  post?.metadata?.productLinks?.amazon ||
  post?.metadata?.productLinks?.gumroad ||
  "";

const buildRetrySchedule = (offsetDays = 1) => {
  const next = new Date();
  next.setDate(next.getDate() + offsetDays);
  next.setHours(9, 0, 0, 0);
  return next.toISOString();
};

export default function TodayQueue() {
  const { toast } = useToast();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [workingPostId, setWorkingPostId] = useState(null);
  const [retryDays, setRetryDays] = useState("1");

  const loadPosts = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/posts`);
      if (!res.ok) throw new Error(`Failed to load queue: ${res.status}`);
      const data = await res.json();
      setPosts(
        data.map((post) => ({
          ...post,
          status: normalizePostStatus(post.status),
        })),
      );
    } catch (error) {
      console.error("Failed to load today's queue", error);
      toast({
        title: "Queue load failed",
        description: error.message || "Could not load queue entries.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPosts();
  }, []);

  const todayKey = getDateKey(new Date());

  const dueToday = useMemo(() => {
    return posts
      .filter((post) => {
        const scheduled = getScheduledDate(post);
        return (
          post.status === "approved" &&
          scheduled &&
          getDateKey(scheduled) === todayKey
        );
      })
      .sort((a, b) => {
        const left = getScheduledDate(a)?.getTime() || 0;
        const right = getScheduledDate(b)?.getTime() || 0;
        return left - right;
      });
  }, [posts, todayKey]);

  const failedOrNeedsReview = useMemo(() => {
    return posts.filter((post) => {
      if (post.status === "failed") return true;
      if (post.status === "draft") {
        const scheduled = getScheduledDate(post);
        return scheduled && getDateKey(scheduled) <= todayKey;
      }
      return false;
    });
  }, [posts, todayKey]);

  const updatePost = async (postId, payload, successMessage) => {
    setWorkingPostId(postId);
    try {
      const res = await fetch(`${API_BASE}/api/posts/${postId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`Update failed: ${res.status}`);
      const updated = await res.json();
      setPosts((prev) =>
        prev.map((post) =>
          post.id === postId
            ? { ...updated, status: normalizePostStatus(updated.status) }
            : post,
        ),
      );
      toast({
        title: successMessage,
        description: updated.title || "Queue entry updated.",
      });
    } catch (error) {
      console.error("Failed to update post", error);
      toast({
        title: "Update failed",
        description: error.message || "Could not update queue entry.",
        variant: "destructive",
      });
    } finally {
      setWorkingPostId(null);
    }
  };

  const retryPost = async (post, offsetDays = 1) => {
    const schedule = buildRetrySchedule(offsetDays);
    await updatePost(
      post.id,
      {
        status: "approved",
        scheduledAt: schedule,
        attemptCount: 0,
        nextAttemptAt: null,
        lastErrorAt: null,
      },
      "Retry scheduled",
    );
  };

  const handleCopy = async (text, label) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied",
        description: `${label} copied to your clipboard.`,
      });
    } catch (error) {
      toast({
        title: "Copy failed",
        description: error.message || "Clipboard access failed.",
        variant: "destructive",
      });
    }
  };

  const handleOpenPlatform = (platform) => {
    const url = platformUrls[platform] || "about:blank";
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const renderPlatformActions = (post) => {
    const targets = Array.isArray(post.targets) && post.targets.length
      ? post.targets
      : (post.platforms || []).map((platform) => ({ platform, accountId: null }));

    return (
      <div className="space-y-3">
        {targets.map((target) => {
          const platform = String(target.platform || "").toLowerCase();
          const text = getPostTextForPlatform(post, platform);
          return (
            <div
              key={`${post.id}-${platform}-${target.accountId || "default"}`}
              className="rounded border border-teal-700 bg-black/50 p-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-pink-300 font-semibold capitalize">
                    {platform}
                  </p>
                  <p className="text-xs text-teal-500">
                    {target.accountId ? `Account ${target.accountId}` : "Default target"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleCopy(text, `${platform} copy`)}
                    className="px-3 py-1 rounded border border-teal-500 text-teal-200 hover:bg-teal-500 hover:text-black transition-colors"
                  >
                    Copy text
                  </button>
                  <button
                    onClick={() => handleOpenPlatform(platform)}
                    className="px-3 py-1 rounded border border-pink-500 text-pink-200 hover:bg-pink-500 hover:text-black transition-colors"
                  >
                    Open platform
                  </button>
                </div>
              </div>
              {post.mediaPath && (
                <p className="mt-2 text-xs text-teal-400">
                  Media attached: {post.mediaPath}
                </p>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-black text-teal-300 font-mono">
      <div className="max-w-6xl mx-auto px-6 py-12">
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-10 border-b border-pink-600 pb-6">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-pink-500">today ops</p>
            <h1 className="text-4xl md:text-5xl text-pink-400 glitchy">Today Queue</h1>
            <p className="text-sm text-teal-400 mt-2">
              Due today, needs review, and manual assist in one place.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/"
              className="px-4 py-2 border border-pink-500 text-pink-300 rounded hover:bg-pink-500 hover:text-black transition-colors"
            >
              Calendar
            </Link>
            <Link
              to="/lib"
              className="px-4 py-2 border border-teal-500 text-teal-300 rounded hover:bg-teal-500 hover:text-black transition-colors"
            >
              Library
            </Link>
            <button
              onClick={loadPosts}
              className="px-4 py-2 border border-gray-500 text-gray-200 rounded hover:bg-gray-700 transition-colors"
            >
              Refresh
            </button>
          </div>
        </header>

        {loading ? (
          <p className="text-center text-teal-400">Loading queue...</p>
        ) : (
          <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
            <section className="space-y-5">
              <div className="rounded-lg border border-pink-600 bg-black/60 p-5">
                <h2 className="text-2xl text-pink-300">Due Today</h2>
                <p className="text-sm text-teal-400 mt-2">
                  These are approved posts scheduled for today. Use the manual actions when automation is flaky.
                </p>
              </div>

              {dueToday.length === 0 ? (
                <div className="rounded-lg border border-teal-700 bg-black/50 p-5 text-teal-400">
                  Nothing scheduled today, slacker. Go queue something.
                </div>
              ) : (
                dueToday.map((post) => (
                  <article
                    key={post.id}
                    className="rounded-lg border border-teal-500 bg-black/60 p-5 shadow-[0_0_20px_rgba(13,148,136,0.25)]"
                  >
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div>
                        <h3 className="text-2xl text-pink-300">{post.title}</h3>
                        {post.metadata?.productProfileLabel && (
                          <p className="text-sm text-amber-300 mt-2">
                            Product: {post.metadata.productProfileLabel}
                          </p>
                        )}
                        <p className="text-sm text-teal-500 mt-2">
                          Status: {getStatusLabel(post.status)} | Targets: {formatTargetsLabel(post.targets)}
                        </p>
                        <p className="text-sm text-teal-500">
                          Scheduled: {getScheduledDate(post)?.toLocaleString() || "—"}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => updatePost(post.id, { status: "posted" }, "Marked as posted")}
                          disabled={workingPostId === post.id}
                          className="px-3 py-2 rounded bg-pink-500 text-black hover:bg-pink-400 transition-colors disabled:opacity-50"
                        >
                          Mark posted
                        </button>
                        <button
                          onClick={() => updatePost(post.id, { status: "failed" }, "Marked as failed")}
                          disabled={workingPostId === post.id}
                          className="px-3 py-2 rounded border border-red-500 text-red-300 hover:bg-red-500 hover:text-white transition-colors disabled:opacity-50"
                        >
                          Mark failed
                        </button>
                      </div>
                    </div>

                    <p className="mt-4 whitespace-pre-wrap text-teal-200">{post.body}</p>
                    {(post.metadata?.imageStatus || post.metadata?.imageConcept || post.metadata?.imagePrompt) && (
                      <div className="mt-4 rounded border border-amber-700 bg-black/50 p-3 text-sm">
                        <p className="text-amber-300">
                          Image: {post.metadata?.imageStatus || "prompt-needed"}
                        </p>
                        {post.metadata?.imageConcept && (
                          <p className="mt-1 text-teal-300">
                            Concept: {post.metadata.imageConcept}
                          </p>
                        )}
                        {post.metadata?.imagePrompt && (
                          <button
                            onClick={() => handleCopy(post.metadata.imagePrompt, "Image prompt")}
                            className="mt-2 px-3 py-1 rounded border border-amber-500 text-amber-200 hover:bg-amber-500 hover:text-black transition-colors"
                          >
                            Copy image prompt
                          </button>
                        )}
                      </div>
                    )}
                    {getProductLink(post) && (
                      <div className="mt-4 rounded border border-pink-700 bg-black/50 p-3 text-sm">
                        <p className="text-pink-300">Product link attached for punch-mode posting.</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <button
                            onClick={() => handleCopy(getProductLink(post), "Product link")}
                            className="px-3 py-1 rounded border border-pink-500 text-pink-200 hover:bg-pink-500 hover:text-black transition-colors"
                          >
                            Copy link
                          </button>
                          <button
                            onClick={() => window.open(getProductLink(post), "_blank", "noopener,noreferrer")}
                            className="px-3 py-1 rounded border border-teal-500 text-teal-200 hover:bg-teal-500 hover:text-black transition-colors"
                          >
                            Open link
                          </button>
                        </div>
                      </div>
                    )}
                    <div className="mt-4">
                      {renderPlatformActions(post)}
                    </div>
                  </article>
                ))
              )}
            </section>

            <section className="space-y-5">
              <div className="rounded-lg border border-amber-600 bg-black/60 p-5">
                <h2 className="text-2xl text-amber-300">Needs Review Or Retry</h2>
                <p className="text-sm text-teal-400 mt-2">
                  Drafts scheduled for today or earlier, plus failed posts you need to revisit.
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <label className="text-sm text-teal-300">
                    Retry in
                    <input
                      type="number"
                      min="0"
                      value={retryDays}
                      onChange={(e) => setRetryDays(e.target.value)}
                      className="ml-2 w-20 rounded border border-teal-500 bg-black px-2 py-1 text-teal-200"
                    />
                    <span className="ml-2">day(s)</span>
                  </label>
                </div>
              </div>

              {failedOrNeedsReview.length === 0 ? (
                <div className="rounded-lg border border-teal-700 bg-black/50 p-5 text-teal-400">
                  No review backlog right now.
                </div>
              ) : (
                failedOrNeedsReview.map((post) => (
                  <article
                    key={post.id}
                    className="rounded-lg border border-amber-500 bg-black/60 p-5"
                  >
                    <h3 className="text-xl text-pink-300">{post.title}</h3>
                    {post.metadata?.productProfileLabel && (
                      <p className="text-sm text-amber-300 mt-2">
                        Product: {post.metadata.productProfileLabel}
                      </p>
                    )}
                    <p className="text-sm text-teal-500 mt-2">
                      Status: {getStatusLabel(post.status)} | Targets: {formatTargetsLabel(post.targets)}
                    </p>
                    <p className="text-sm text-teal-500">
                      Scheduled: {getScheduledDate(post)?.toLocaleString() || "—"}
                    </p>
                    {post.metadata?.imageStatus && (
                      <p className="text-sm text-amber-300">
                        Image: {post.metadata.imageStatus}
                      </p>
                    )}
                    {post.nextAttemptAt && (
                      <p className="text-sm text-amber-400">
                        Next retry: {new Date(post.nextAttemptAt).toLocaleString()}
                      </p>
                    )}
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        onClick={() => updatePost(post.id, { status: "approved" }, "Approved for posting")}
                        disabled={workingPostId === post.id}
                        className="px-3 py-2 rounded border border-teal-500 text-teal-200 hover:bg-teal-500 hover:text-black transition-colors disabled:opacity-50"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => retryPost(post, Math.max(0, Number.parseInt(retryDays, 10) || 1))}
                        disabled={workingPostId === post.id}
                        className="px-3 py-2 rounded border border-amber-500 text-amber-200 hover:bg-amber-500 hover:text-black transition-colors disabled:opacity-50"
                      >
                        Retry later
                      </button>
                      <Link
                        to="/compose"
                        state={{ draft: post }}
                        className="px-3 py-2 rounded border border-pink-500 text-pink-200 hover:bg-pink-500 hover:text-black transition-colors"
                      >
                        Edit
                      </Link>
                      <button
                        onClick={() => handleCopy(post.body || "", "Main body")}
                        className="px-3 py-2 rounded border border-gray-500 text-gray-200 hover:bg-gray-700 transition-colors"
                      >
                        Copy body
                      </button>
                    </div>
                  </article>
                ))
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
