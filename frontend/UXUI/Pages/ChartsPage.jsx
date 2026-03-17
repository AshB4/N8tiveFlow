/** @format */

import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { isApprovedStatus, normalizePostStatus } from "../utils/postStatus";

const API_BASE = import.meta.env?.VITE_API_BASE || "http://localhost:3001";

const DEFAULT_STATS = {
	totalPosts: 0,
	scheduledCount: 0,
	scheduledPercent: 0,
	platformCounts: {},
	oldestUnscheduled: null,
	mostEngaged: null,
	posts: [],
};

const focusSections = {
	overview: "Overview",
	platforms: "Platform Mix",
	engagement: "Engagement",
	pipeline: "Pipeline",
};

const computeStatsFromPosts = (posts) => {
	if (!Array.isArray(posts) || posts.length === 0) {
		return { ...DEFAULT_STATS, posts: posts ?? [] };
	}

	const totalPosts = posts.length;
	const normalizedPosts = posts.map((post) => ({
		...post,
		status: normalizePostStatus(post.status),
	}));
	const scheduledPosts = normalizedPosts.filter((post) => isApprovedStatus(post.status));
	const scheduledCount = scheduledPosts.length;
	const scheduledPercent =
		totalPosts === 0 ? 0 : Math.round((scheduledCount / totalPosts) * 100);

	const platformCounts = normalizedPosts.reduce((acc, post) => {
		const list = post.platform
			? [post.platform]
			: Array.isArray(post.platforms)
			? post.platforms
			: [];
		list.forEach((platform) => {
			if (!platform) return;
			const key = String(platform);
			acc[key] = (acc[key] || 0) + 1;
		});
		return acc;
	}, {});

	const oldestUnscheduled = normalizedPosts
		.filter((post) => !isApprovedStatus(post.status))
		.sort((a, b) => new Date(a.created_at) - new Date(b.created_at))[0] || null;

	const withPerformance = normalizedPosts.map((post) => {
		const perf = post?.metadata?.performance || {};
		const engagement =
			Number(perf.likes7d || 0) +
			Number(perf.comments7d || 0) +
			Number(perf.saves7d || 0);
		return {
			...post,
			engagement,
			manualMetrics: {
				likes24h: Number(perf.likes24h || 0),
				likes7d: Number(perf.likes7d || 0),
				comments24h: Number(perf.comments24h || 0),
				comments7d: Number(perf.comments7d || 0),
				clicks24h: Number(perf.clicks24h || 0),
				clicks7d: Number(perf.clicks7d || 0),
				saves7d: Number(perf.saves7d || 0),
			},
		};
	});

	const mostEngaged = [...withPerformance]
		.filter((post) => typeof post.engagement === "number")
		.sort((a, b) => b.engagement - a.engagement)[0] || null;

	const manualTotals = withPerformance.reduce(
		(acc, post) => {
			acc.likes24h += post.manualMetrics.likes24h;
			acc.likes7d += post.manualMetrics.likes7d;
			acc.comments24h += post.manualMetrics.comments24h;
			acc.comments7d += post.manualMetrics.comments7d;
			acc.clicks24h += post.manualMetrics.clicks24h;
			acc.clicks7d += post.manualMetrics.clicks7d;
			acc.saves7d += post.manualMetrics.saves7d;
			return acc;
		},
		{ likes24h: 0, likes7d: 0, comments24h: 0, comments7d: 0, clicks24h: 0, clicks7d: 0, saves7d: 0 },
	);

	return {
		totalPosts,
		scheduledCount,
		scheduledPercent,
		platformCounts,
		oldestUnscheduled,
		mostEngaged,
		manualTotals,
		posts: withPerformance,
	};
};

const TopPostCard = ({ title, detail, label }) => (
	<div className="border border-pink-600 rounded-lg p-4 bg-black/60">
		<h4 className="text-pink-400 text-sm uppercase tracking-[0.3em] mb-1">
			{label}
		</h4>
		<p className="text-lg text-teal-200 font-semibold">{title ?? "—"}</p>
		{detail && <p className="text-xs text-teal-400 mt-1">{detail}</p>}
	</div>
);

const formatDate = (value) => {
	if (!value) return "—";
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return value;
	return date.toLocaleString();
};

export default function ChartsPage() {
	const location = useLocation();
	const navigate = useNavigate();
	const [posts, setPosts] = useState(location.state?.stats?.posts || []);
	const [analytics, setAnalytics] = useState(null);
	const [loading, setLoading] = useState(!location.state?.stats?.posts);
	const [error, setError] = useState("");
	const focus = location.state?.focus || "overview";

	useEffect(() => {
		let ignore = false;
		async function loadData() {
			try {
				const [postsRes, analyticsRes] = await Promise.all([
					fetch(`${API_BASE}/api/posts`),
					fetch(`${API_BASE}/api/analytics/summary`),
				]);
				if (!postsRes.ok) throw new Error(`Posts HTTP ${postsRes.status}`);
				if (!analyticsRes.ok) throw new Error(`Analytics HTTP ${analyticsRes.status}`);
				const postsData = await postsRes.json();
				const analyticsData = await analyticsRes.json();
				if (!ignore) {
					setPosts(Array.isArray(postsData) ? postsData : []);
					setAnalytics(analyticsData || null);
				}
			} catch (err) {
				console.error("Failed to load dashboard data", err);
				if (!ignore) setError("Unable to load analytics data.");
			} finally {
				if (!ignore) setLoading(false);
			}
		}
		loadData();
		return () => {
			ignore = true;
		};
	}, []);

	const stats = useMemo(() => {
		if (location.state?.stats) {
			return {
				...DEFAULT_STATS,
				...location.state.stats,
			};
		}
		return computeStatsFromPosts(posts);
	}, [location.state?.stats, posts]);

	const platformList = useMemo(() => {
		const entries = Object.entries(stats.platformCounts || {});
		const total = entries.reduce((sum, [, count]) => sum + count, 0) || 1;
		return entries
			.sort((a, b) => b[1] - a[1])
			.map(([platform, count]) => ({
				platform,
				count,
				percent: Math.round((count / total) * 100),
			}));
	}, [stats.platformCounts]);

	const focusTitle = focusSections[focus] || focusSections.overview;

	if (loading) {
		return (
			<div className="min-h-screen bg-black text-teal-200 flex items-center justify-center">
				Loading chart data…
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-black text-teal-200 font-mono px-6 py-10">
			<header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-pink-600 pb-6 mb-10">
				<div>
					<p className="text-sm uppercase tracking-[0.3em] text-pink-500">
						postpunk analytics
					</p>
					<h1 className="text-4xl md:text-5xl text-pink-400 glitchy">
						Signal Dashboard
					</h1>
					<p className="text-sm text-teal-400 mt-2">
						Queue health plus actual funnel performance from tracked events.
					</p>
				</div>
				<div className="flex flex-wrap gap-3">
					<Link
						to="/"
						className="px-3 py-2 border border-pink-500 text-pink-300 rounded hover:bg-pink-500 hover:text-black transition-colors"
					>
						⬅ Back to Calendar
					</Link>
					<Link
						to="/compose"
						className="px-3 py-2 border border-teal-500 text-teal-300 rounded hover:bg-teal-500 hover:text-black transition-colors"
					>
						✍️ Draft Another
					</Link>
					<Link
						to="/archive"
						className="px-3 py-2 border border-orange-500 text-orange-300 rounded hover:bg-orange-500 hover:text-black transition-colors"
					>
						📚 Posted Archive
					</Link>
				</div>
			</header>

			{error && (
				<p className="mb-6 text-sm text-red-400 bg-red-900/30 border border-red-500 rounded px-3 py-2">
					{error}
				</p>
			)}

			<section className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-8">
				<div className="space-y-6">
					<div
						className={`border rounded-lg p-5 bg-black/60 ${
							focus === "overview" ? "border-pink-500" : "border-teal-700"
						}`}
					>
						<h2 className="text-pink-300 text-lg uppercase tracking-[0.3em] mb-3">
							{focusTitle}
						</h2>
						<div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
							<div className="border border-teal-600 rounded p-3">
								<p className="text-xs uppercase tracking-[0.3em] text-teal-400">
									Total Posts
								</p>
								<p className="text-2xl text-pink-300 font-semibold">
									{stats.totalPosts}
								</p>
							</div>
							<div className="border border-teal-600 rounded p-3">
								<p className="text-xs uppercase tracking-[0.3em] text-teal-400">
									Scheduled
								</p>
								<p className="text-2xl text-teal-200 font-semibold">
									{stats.scheduledCount}
								</p>
								<p className="text-xs text-teal-500">
									{stats.scheduledPercent}% scheduled
								</p>
							</div>
							<div className="border border-teal-600 rounded p-3">
								<p className="text-xs uppercase tracking-[0.3em] text-teal-400">
									Conversions
								</p>
								<p className="text-2xl text-teal-200 font-semibold">
									{analytics?.totals?.conversions ?? 0}
								</p>
								<p className="text-xs text-teal-500">tracked funnel events</p>
							</div>
						</div>
					</div>

					<div className="border rounded-lg p-5 bg-black/60 border-teal-700">
						<h2 className="text-pink-300 text-lg uppercase tracking-[0.3em] mb-3">
							Funnel Totals
						</h2>
						<div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
							<div className="border border-teal-600 rounded p-3">
								<p className="text-xs uppercase tracking-[0.3em] text-teal-400">Clicks</p>
								<p className="text-2xl text-pink-300 font-semibold">{analytics?.totals?.clicks ?? 0}</p>
							</div>
							<div className="border border-teal-600 rounded p-3">
								<p className="text-xs uppercase tracking-[0.3em] text-teal-400">Signups</p>
								<p className="text-2xl text-pink-300 font-semibold">{analytics?.totals?.signups ?? 0}</p>
							</div>
							<div className="border border-teal-600 rounded p-3">
								<p className="text-xs uppercase tracking-[0.3em] text-teal-400">Likes</p>
								<p className="text-2xl text-pink-300 font-semibold">{stats.manualTotals?.likes7d ?? analytics?.totals?.likes ?? 0}</p>
							</div>
							<div className="border border-teal-600 rounded p-3">
								<p className="text-xs uppercase tracking-[0.3em] text-teal-400">Saves</p>
								<p className="text-2xl text-pink-300 font-semibold">{stats.manualTotals?.saves7d ?? analytics?.totals?.saves ?? 0}</p>
							</div>
							<div className="border border-teal-600 rounded p-3">
								<p className="text-xs uppercase tracking-[0.3em] text-teal-400">Retweets</p>
								<p className="text-2xl text-pink-300 font-semibold">{analytics?.totals?.retweets ?? 0}</p>
							</div>
							<div className="border border-teal-600 rounded p-3">
								<p className="text-xs uppercase tracking-[0.3em] text-teal-400">Success Rate</p>
								<p className="text-2xl text-pink-300 font-semibold">{analytics?.posting?.successRate ?? 0}%</p>
							</div>
						</div>
					</div>

					<div
						className={`border rounded-lg p-5 bg-black/60 ${
							focus === "platforms" ? "border-pink-500" : "border-teal-700"
						}`}
					>
						<h2 className="text-pink-300 text-lg uppercase tracking-[0.3em] mb-3">
							Platform Mix
						</h2>
						{platformList.length === 0 ? (
							<p className="text-sm text-teal-500">No platform data yet.</p>
						) : (
							<ul className="space-y-2 text-sm">
								{platformList.map(({ platform, count, percent }) => (
									<li
										key={platform}
										className="flex items-center justify-between gap-4 border border-teal-600 rounded px-3 py-2"
									>
										<span className="text-pink-200 font-semibold capitalize">
											{platform}
										</span>
										<span className="text-teal-400">
											{count} posts · {percent}%
										</span>
									</li>
								))}
							</ul>
						)}
					</div>

					<div
						className={`border rounded-lg p-5 bg-black/60 ${
							focus === "engagement" ? "border-pink-500" : "border-teal-700"
						}`}
					>
						<h2 className="text-pink-300 text-lg uppercase tracking-[0.3em] mb-3">
							Engagement Watch
						</h2>
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
							<TopPostCard
								label="Most engaged"
								title={stats.mostEngaged?.title}
								detail={
									stats.mostEngaged
										? `${stats.mostEngaged.engagement} 7-day reactions logged`
										: "No reactions recorded yet."
								}
							/>
							<TopPostCard
								label="Oldest waiting"
								title={stats.oldestUnscheduled?.title}
								detail={
									stats.oldestUnscheduled
										? `Status: ${stats.oldestUnscheduled.status || "draft"}`
										: "Everything approved — keep it rolling."
								}
							/>
						</div>
					</div>
				</div>

				<aside
					className={`border rounded-lg p-5 bg-black/60 ${
						focus === "pipeline" ? "border-pink-500" : "border-teal-700"
					}`}
				>
					<h2 className="text-pink-300 text-lg uppercase tracking-[0.3em] mb-3">
						Pipeline &amp; Funnel
					</h2>
						<p className="text-sm text-teal-400 mb-4">
							Manual likes, comments, clicks, and saves recorded in the library now feed this page. Backend funnel files can still add totals later.
						</p>
					<div className="space-y-4 text-sm">
						<TopPostCard
							label="Top Platform"
							title={analytics?.topPlatform?.platform}
							detail={
								analytics?.topPlatform
									? `${analytics.topPlatform.clicks} clicks · ${analytics.topPlatform.signups} signups`
									: "No funnel events loaded."
							}
						/>
						<TopPostCard
							label="Top Campaign"
							title={analytics?.topCampaign?.campaign}
							detail={
								analytics?.topCampaign
									? `${analytics.topCampaign.clicks} clicks · ${analytics.topCampaign.conversions} conversions`
									: "No campaign data loaded."
							}
						/>
						<div className="border border-teal-600 rounded p-3">
							<p className="uppercase text-xs tracking-[0.3em] text-teal-500">
								Recent Funnel Events
							</p>
							<div className="mt-3 space-y-3">
								{analytics?.recentEvents?.length ? (
									analytics.recentEvents.slice(0, 5).map((event) => (
										<div
											key={`${event.platform}-${event.campaign}-${event.timestamp}`}
											className="border border-teal-800 rounded p-3"
										>
											<p className="text-pink-300">
												{event.platform} · {event.campaign}
											</p>
											<p className="text-teal-400">{formatDate(event.timestamp)}</p>
											<p className="text-teal-200">
												{event.clicks ?? 0} clicks, {event.signups ?? 0} signups, {event.conversions ?? 0} conversions
											</p>
										</div>
									))
								) : (
									<p className="text-teal-500">No funnel events loaded.</p>
								)}
							</div>
						</div>
						<div className="border border-pink-600 rounded p-3">
							<p className="uppercase text-xs tracking-[0.3em] text-pink-400">
								Posting Health
							</p>
							<p className="mt-2 text-teal-300">
								{analytics?.posting?.totalSuccessful ?? 0} successful out of {analytics?.posting?.totalAttempted ?? 0} attempted.
							</p>
							<p className="mt-1 text-teal-500">
								Last updated: {formatDate(analytics?.posting?.lastUpdated)}
							</p>
						</div>
						<div className="border border-orange-500 rounded p-3">
							<p className="uppercase text-xs tracking-[0.3em] text-orange-400">
								Posted History
							</p>
							<p className="mt-2 text-teal-300">
								Need to inspect what already went out instead of only seeing totals?
							</p>
							<button
								type="button"
								onClick={() => navigate("/archive")}
								className="mt-3 rounded border border-orange-500 px-3 py-2 text-orange-200 hover:bg-orange-500 hover:text-black transition-colors"
							>
								Open Posted Archive
							</button>
						</div>
					</div>
				</aside>
			</section>
		</div>
	);
}
