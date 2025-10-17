/** @format */

import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

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
	const scheduledPosts = posts.filter((post) =>
		post.status ? String(post.status).toLowerCase() === "approved" : false,
	);
	const scheduledCount = scheduledPosts.length;
	const scheduledPercent =
		totalPosts === 0 ? 0 : Math.round((scheduledCount / totalPosts) * 100);

	const platformCounts = posts.reduce((acc, post) => {
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

	const oldestUnscheduled = posts
		.filter((post) => String(post.status ?? "").toLowerCase() !== "approved")
		.sort((a, b) => new Date(a.created_at) - new Date(b.created_at))[0] || null;

	const mostEngaged = [...posts]
		.filter((post) => typeof post.engagement === "number")
		.sort((a, b) => b.engagement - a.engagement)[0] || null;

	return {
		totalPosts,
		scheduledCount,
		scheduledPercent,
		platformCounts,
		oldestUnscheduled,
		mostEngaged,
		posts,
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

export default function ChartsPage() {
	const location = useLocation();
	const navigate = useNavigate();
	const [posts, setPosts] = useState(location.state?.stats?.posts || []);
	const [loading, setLoading] = useState(!location.state?.stats?.posts);
	const [error, setError] = useState("");
	const focus = location.state?.focus || "overview";

	useEffect(() => {
		if (location.state?.stats?.posts) return;
		let ignore = false;
		async function loadPosts() {
			try {
				const res = await fetch(`${API_BASE}/api/posts`);
				if (!res.ok) throw new Error(`HTTP ${res.status}`);
				const data = await res.json();
				if (!ignore) {
					setPosts(Array.isArray(data) ? data : []);
				}
			} catch (err) {
				console.error("Failed to load posts for charts", err);
				if (!ignore) setError("Unable to load latest post data.");
			} finally {
				if (!ignore) setLoading(false);
			}
		}
		loadPosts();
		return () => {
			ignore = true;
		};
	}, [location.state?.stats?.posts]);

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
						Insights tuned for engagement, reach, and the next brand push.
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
									Pipeline Health
								</p>
								<p className="text-2xl text-teal-200 font-semibold">
									{stats.totalPosts - stats.scheduledCount}
								</p>
								<p className="text-xs text-teal-500">awaiting approval</p>
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
										? `${stats.mostEngaged.engagement} reactions logged`
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
						Pipeline &amp; Experiments
					</h2>
					<p className="text-sm text-teal-400 mb-4">
						Track cohort performance across the full funnel. We can bolt on
						conversion or revenue metrics once we know which integrations you
						want to trust (Stripe, Gumroad, manual CSV, etc.). Ping me when
						you’re ready to connect the sales feed.
					</p>
					<div className="space-y-3 text-sm">
						<div className="border border-teal-600 rounded p-3">
							<p className="uppercase text-xs tracking-[0.3em] text-teal-500">
								Next actions
							</p>
							<ul className="list-disc list-inside mt-2 space-y-1 text-teal-200">
								<li>Define what counts as a conversion for each product line.</li>
								<li>Choose the data source (Shop, Gumroad, Patreon, etc.).</li>
								<li>Wire the webhook or daily import so these charts stay live.</li>
							</ul>
						</div>
						<div className="border border-pink-600 rounded p-3">
							<p className="uppercase text-xs tracking-[0.3em] text-pink-400">
								Experiment queue
							</p>
							<p className="mt-2 text-teal-300">
								Automate A/B posts, track boost budgets, or alert when a post
								is “recycle worthy”. Just say the word and we’ll toggle it on.
							</p>
						</div>
					</div>
				</aside>
			</section>
		</div>
	);
}
