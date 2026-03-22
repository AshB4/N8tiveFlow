/** @format */

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useToast } from "@/Components/ui/use-toast";
import AppTopNav from "../Components/AppTopNav";
import {
	getStatusLabel,
	getWorkflowPalette,
	isAffiliatePost,
	normalizePostStatus,
} from "../utils/postStatus";

const API_BASE = import.meta.env?.VITE_API_BASE || "http://localhost:3001";
const DEFAULT_ROTATION_SETTINGS = {
	cadenceDays: 1,
	defaultTime: "10:00",
	maxPostsPerDay: 1,
	mixProducts: true,
	approveOnSchedule: true,
	activeProductIds: [],
	customProducts: [],
};

const formatTargetsLabel = (targets = []) => {
	if (!Array.isArray(targets) || targets.length === 0) return "—";
	return targets
		.map((target) =>
			target.accountId
				? `${target.platform} (${target.accountId})`
				: target.platform,
		)
		.join(", ");
};

const toDateTimeLocal = (value) => {
	if (!value) return "";
	const parsed = new Date(value);
	if (Number.isNaN(parsed.getTime())) return "";
	const offset = parsed.getTimezoneOffset() * 60000;
	return new Date(parsed.getTime() - offset).toISOString().slice(0, 16);
};

const buildScheduledIso = (dateValue, timeValue, offsetDays) => {
	if (!dateValue) return null;
	const [year, month, day] = dateValue.split("-").map(Number);
	const [hours, minutes] = String(timeValue || "09:00").split(":").map(Number);
	const scheduled = new Date(year, month - 1, day + offsetDays, hours || 0, minutes || 0, 0, 0);
	return scheduled.toISOString();
};

const getProductLink = (post) =>
	post?.metadata?.productLinks?.primary ||
	post?.metadata?.productLinks?.amazon ||
	post?.metadata?.productLinks?.gumroad ||
	"";

const getPerformanceMetrics = (post) => ({
	likes24h: Number(post?.metadata?.performance?.likes24h || 0),
	likes7d: Number(post?.metadata?.performance?.likes7d || 0),
	comments24h: Number(post?.metadata?.performance?.comments24h || 0),
	comments7d: Number(post?.metadata?.performance?.comments7d || 0),
	clicks24h: Number(post?.metadata?.performance?.clicks24h || 0),
	clicks7d: Number(post?.metadata?.performance?.clicks7d || 0),
	saves7d: Number(post?.metadata?.performance?.saves7d || 0),
});

const isSelectableQueuePost = (post) =>
	normalizePostStatus(post?.status) !== "posted" && !(post?.scheduledAt || post?.scheduled_at);

const SCHEDULE_PRESETS = {
	custom: {
		label: "Custom Interval",
		days: [],
		defaultTime: "09:00",
	},
	mwf: {
		label: "Mon / Wed / Fri",
		days: [1, 3, 5],
		defaultTime: "10:00",
	},
	mwfsu: {
		label: "Mon / Wed / Fri / Sat / Sun",
		days: [1, 3, 5, 6, 0],
		defaultTime: "10:00",
	},
};

const buildPresetSchedule = (dateValue, timeValue, allowedDays, count) => {
	if (!dateValue || !Array.isArray(allowedDays) || allowedDays.length === 0) return [];
	const [year, month, day] = dateValue.split("-").map(Number);
	const [hours, minutes] = String(timeValue || "09:00").split(":").map(Number);
	const cursor = new Date(year, month - 1, day, hours || 0, minutes || 0, 0, 0);
	const results = [];

	while (results.length < count) {
		if (allowedDays.includes(cursor.getDay())) {
			results.push(new Date(cursor).toISOString());
		}
		cursor.setDate(cursor.getDate() + 1);
	}

	return results;
};

const addDaysToDateOnly = (dateValue, daysToAdd) => {
	if (!dateValue) return "";
	const [year, month, day] = dateValue.split("-").map(Number);
	const next = new Date(year, month - 1, day + daysToAdd, 12, 0, 0, 0);
	return next.toISOString().slice(0, 10);
};

const interleavePostsByProduct = (selectedPosts = [], productOrder = []) => {
	const buckets = new Map();
	for (const post of selectedPosts) {
		const key =
			post?.metadata?.productProfileId ||
			post?.metadata?.productProfileLabel ||
			post?.title ||
			post?.id;
		if (!buckets.has(key)) buckets.set(key, []);
		buckets.get(key).push(post);
	}

	for (const bucket of buckets.values()) {
		bucket.sort((a, b) => {
			const left = new Date(a.createdAt || a.scheduledAt || 0).getTime();
			const right = new Date(b.createdAt || b.scheduledAt || 0).getTime();
			return left - right;
		});
	}

	const preferredOrder = Array.isArray(productOrder) ? productOrder : [];
	const orderedKeys = [
		...preferredOrder.filter((key) => buckets.has(key)),
		...[...buckets.keys()].filter((key) => !preferredOrder.includes(key)).sort(),
	];
	const mixed = [];
	let added = true;

	while (added) {
		added = false;
		for (const key of orderedKeys) {
			const bucket = buckets.get(key);
			if (bucket?.length) {
				mixed.push(bucket.shift());
				added = true;
			}
		}
	}

	return mixed;
};

export default function PostLib() {
	const { toast } = useToast();
	const [posts, setPosts] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const [editingId, setEditingId] = useState(null);
	const [editForm, setEditForm] = useState({});
	const [selectedIds, setSelectedIds] = useState([]);
	const [bulkStartDate, setBulkStartDate] = useState(
		new Date().toISOString().slice(0, 10),
	);
	const [bulkTimeOfDay, setBulkTimeOfDay] = useState("09:00");
	const [bulkIntervalDays, setBulkIntervalDays] = useState("1");
	const [bulkPreset, setBulkPreset] = useState("custom");
	const [bulkApprove, setBulkApprove] = useState(true);
	const [bulkMixProducts, setBulkMixProducts] = useState(true);
	const [rotationSettings, setRotationSettings] = useState(DEFAULT_ROTATION_SETTINGS);
	const [isBulkSaving, setIsBulkSaving] = useState(false);
	const latestScheduledAt =
		posts
			.map((post) => post.scheduledAt || post.scheduled_at)
			.filter(Boolean)
			.sort()
			.at(-1) || null;

	const loadPosts = async () => {
		try {
			setLoading(true);
			setError("");
			const res = await fetch(`${API_BASE}/api/posts`);
			if (!res.ok) throw new Error(`Failed to load posts: ${res.status}`);
			const data = await res.json();
			// Filter unique posts by id
			const uniquePosts = data
				.filter((post, index, arr) => arr.findIndex((p) => p.id === post.id) === index)
				.map((post) => ({
					...post,
					status: normalizePostStatus(post.status),
				}));
			setPosts(uniquePosts);
		} catch (err) {
			console.error("Error loading posts", err);
			setError(`⚠️ Could not load posts: ${err.message}`);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		loadPosts();
	}, []);

	useEffect(() => {
		const loadRotationSettings = async () => {
			try {
				const res = await fetch(`${API_BASE}/api/settings/rotation`);
				if (!res.ok) throw new Error(`Failed to load rotation settings: ${res.status}`);
				const data = await res.json();
				setRotationSettings({ ...DEFAULT_ROTATION_SETTINGS, ...data });
				setBulkTimeOfDay(data.defaultTime || DEFAULT_ROTATION_SETTINGS.defaultTime);
				setBulkIntervalDays(String(data.cadenceDays || DEFAULT_ROTATION_SETTINGS.cadenceDays));
				setBulkApprove(
					typeof data.approveOnSchedule === "boolean"
						? data.approveOnSchedule
						: DEFAULT_ROTATION_SETTINGS.approveOnSchedule,
				);
				setBulkMixProducts(
					typeof data.mixProducts === "boolean"
						? data.mixProducts
						: DEFAULT_ROTATION_SETTINGS.mixProducts,
				);
			} catch (err) {
				console.error("Failed to load rotation settings", err);
			}
		};

		loadRotationSettings();
	}, []);

	const handleDelete = async (id) => {
		if (!confirm("Are you sure you want to delete this post?")) return;
		try {
			const res = await fetch(`${API_BASE}/api/posts/${id}`, {
				method: "DELETE",
			});
			if (!res.ok) throw new Error(`Delete failed: ${res.status}`);
			setPosts((prev) => prev.filter((p) => p.id !== id));
			toast({
				title: "Post deleted",
				description: "The post has been removed from the library.",
			});
		} catch (err) {
			console.error("Error deleting post", err);
			toast({
				title: "Delete failed",
				description: `Could not delete post: ${err.message}`,
				variant: "destructive",
			});
		}
	};

	const startEdit = (post) => {
		setEditingId(post.id);
		setEditForm({
			title: post.title,
			body: post.body,
			scheduledAt: toDateTimeLocal(post.scheduledAt || post.scheduled_at),
			status: normalizePostStatus(post.status),
			...getPerformanceMetrics(post),
		});
	};

	const cancelEdit = () => {
		setEditingId(null);
		setEditForm({});
	};

	const handleUpdate = async () => {
		try {
			const updateData = {
				...editForm,
				scheduledAt: editForm.scheduledAt
					? new Date(editForm.scheduledAt).toISOString()
					: null,
				metadata: {
					...(posts.find((post) => post.id === editingId)?.metadata || {}),
					performance: {
						likes24h: Number(editForm.likes24h || 0),
						likes7d: Number(editForm.likes7d || 0),
						comments24h: Number(editForm.comments24h || 0),
						comments7d: Number(editForm.comments7d || 0),
						clicks24h: Number(editForm.clicks24h || 0),
						clicks7d: Number(editForm.clicks7d || 0),
						saves7d: Number(editForm.saves7d || 0),
					},
				},
			};
			const res = await fetch(`${API_BASE}/api/posts/${editingId}`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(updateData),
			});
			if (!res.ok) throw new Error(`Update failed: ${res.status}`);
			const updated = await res.json();
			setPosts((prev) =>
				prev.map((p) =>
					p.id === editingId
						? { ...updated, status: normalizePostStatus(updated.status) }
						: p,
				),
			);
			setEditingId(null);
			setEditForm({});
			toast({
				title: "Post updated",
				description: "Changes have been saved.",
			});
		} catch (err) {
			console.error("Error updating post", err);
			toast({
				title: "Update failed",
				description: `Could not update post: ${err.message}`,
				variant: "destructive",
			});
		}
	};

	const toggleSelected = (id) => {
		setSelectedIds((prev) =>
			prev.includes(id) ? prev.filter((entry) => entry !== id) : [...prev, id],
		);
	};

	const selectDrafts = () => {
		setSelectedIds(
			posts
				.filter((post) => isSelectableQueuePost(post))
				.map((post) => post.id),
		);
	};

	const clearSelection = () => {
		setSelectedIds([]);
	};

	const approveSelectedPosts = async () => {
		const selectedPosts = posts.filter((post) => selectedIds.includes(post.id));
		if (selectedPosts.length === 0) {
			toast({
				title: "No posts selected",
				description: "Pick one or more queue entries before approving them.",
				variant: "destructive",
			});
			return;
		}

		setIsBulkSaving(true);
		try {
			const updates = await Promise.all(
				selectedPosts.map(async (post) => {
					const res = await fetch(`${API_BASE}/api/posts/${post.id}`, {
						method: "PUT",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({ status: "approved" }),
					});
					if (!res.ok) {
						throw new Error(`Failed to approve ${post.title}: ${res.status}`);
					}
					return res.json();
				}),
			);

			const updateMap = new Map(
				updates.map((post) => [
					post.id,
					{ ...post, status: normalizePostStatus(post.status) },
				]),
			);
			setPosts((prev) => prev.map((post) => updateMap.get(post.id) || post));
			setSelectedIds([]);
			toast({
				title: "Posts approved",
				description: `${updates.length} posts are approved only. They still need dates before they hit the calendar.`,
			});
		} catch (error) {
			console.error("Failed to approve selected posts", error);
			toast({
				title: "Approve failed",
				description: error.message || "Could not approve the selected posts.",
				variant: "destructive",
			});
		} finally {
			setIsBulkSaving(false);
		}
	};

	const clearPostedPosts = async () => {
		if (!confirm("Clear all posted posts from the queue? This keeps history in postedLog.json.")) {
			return;
		}

		setIsBulkSaving(true);
		try {
			const res = await fetch(`${API_BASE}/api/posts?scope=posted`, {
				method: "DELETE",
			});
			if (!res.ok) {
				throw new Error(`Clear posted failed: ${res.status}`);
			}
			const data = await res.json();
			setPosts((prev) =>
				prev.filter((post) => normalizePostStatus(post.status) !== "posted"),
			);
			setSelectedIds((prev) =>
				prev.filter((id) => {
					const post = posts.find((entry) => entry.id === id);
					return post && normalizePostStatus(post.status) !== "posted";
				}),
			);
			toast({
				title: "Posted posts cleared",
				description: `${data.removedCount || 0} posted entries were removed from the queue.`,
			});
		} catch (error) {
			console.error("Failed to clear posted posts", error);
			toast({
				title: "Clear failed",
				description: error.message || "Could not clear posted posts.",
				variant: "destructive",
			});
		} finally {
			setIsBulkSaving(false);
		}
	};

	const applyBulkSchedule = async () => {
		if (selectedIds.length === 0) {
			toast({
				title: "No posts selected",
				description: "Pick one or more queue entries before bulk scheduling.",
				variant: "destructive",
			});
			return;
		}

		setIsBulkSaving(true);
		try {
			const selectedPosts = posts.filter((post) => selectedIds.includes(post.id));
			const sortedPosts = [...selectedPosts].sort((a, b) => {
				const left = new Date(a.createdAt || a.scheduledAt || 0).getTime();
				const right = new Date(b.createdAt || b.scheduledAt || 0).getTime();
				return left - right;
			});
			const scheduledPosts = bulkMixProducts
				? interleavePostsByProduct(sortedPosts, rotationSettings.activeProductIds)
				: sortedPosts;
			const preset = SCHEDULE_PRESETS[bulkPreset] || SCHEDULE_PRESETS.custom;
			const scheduledSlots =
				bulkPreset === "custom"
					? scheduledPosts.map((_, index) => {
							const interval = Math.max(1, Number.parseInt(bulkIntervalDays, 10) || 1);
							return buildScheduledIso(
								bulkStartDate,
								bulkTimeOfDay,
								index * interval,
							);
					  })
					: buildPresetSchedule(
							bulkStartDate,
							bulkTimeOfDay || preset.defaultTime,
							preset.days,
							scheduledPosts.length,
					  );

			const updates = await Promise.all(
				scheduledPosts.map(async (post, index) => {
					const payload = {
						scheduledAt: scheduledSlots[index],
						status: bulkApprove ? "approved" : "draft",
					};
					const res = await fetch(`${API_BASE}/api/posts/${post.id}`, {
						method: "PUT",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify(payload),
					});
					if (!res.ok) {
						throw new Error(`Bulk schedule failed on ${post.title}: ${res.status}`);
					}
					return res.json();
				}),
			);

			const updateMap = new Map(
				updates.map((post) => [
					post.id,
					{ ...post, status: normalizePostStatus(post.status) },
				]),
			);
			setPosts((prev) => prev.map((post) => updateMap.get(post.id) || post));
			setSelectedIds([]);
			toast({
				title: "Bulk schedule applied",
				description: `${updates.length} posts were spread across the calendar.`,
			});
		} catch (err) {
			console.error("Bulk scheduling failed", err);
			toast({
				title: "Bulk schedule failed",
				description: err.message || "Could not apply the bulk schedule.",
				variant: "destructive",
			});
		} finally {
			setIsBulkSaving(false);
		}
	};

	const resetFailedPosts = async () => {
		const failedPosts = posts.filter(
			(post) => selectedIds.includes(post.id) && normalizePostStatus(post.status) === "failed",
		);
		if (failedPosts.length === 0) {
			toast({
				title: "No failed posts selected",
				description: "Select one or more failed posts before resetting retries.",
				variant: "destructive",
			});
			return;
		}

		setIsBulkSaving(true);
		try {
			const updates = await Promise.all(
				failedPosts.map(async (post) => {
					const res = await fetch(`${API_BASE}/api/posts/${post.id}`, {
						method: "PUT",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({
							status: "draft",
							attemptCount: 0,
							nextAttemptAt: null,
							lastErrorAt: null,
						}),
					});
					if (!res.ok) {
						throw new Error(`Failed to reset ${post.title}: ${res.status}`);
					}
					return res.json();
				}),
			);

			const updateMap = new Map(
				updates.map((post) => [
					post.id,
					{ ...post, status: normalizePostStatus(post.status) },
				]),
			);
			setPosts((prev) => prev.map((post) => updateMap.get(post.id) || post));
			toast({
				title: "Failed posts reset",
				description: `${updates.length} posts are back in draft review.`,
			});
		} catch (error) {
			console.error("Failed to reset retries", error);
			toast({
				title: "Reset failed",
				description: error.message || "Could not reset failed posts.",
				variant: "destructive",
			});
		} finally {
			setIsBulkSaving(false);
		}
	};

	const continueAfterLastScheduled = async () => {
		const selectedPosts = posts
			.filter((post) => selectedIds.includes(post.id))
			.filter((post) => isSelectableQueuePost(post));
		if (selectedPosts.length === 0) {
			toast({
				title: "No unscheduled posts selected",
				description: "Select one or more unscheduled queue entries first.",
				variant: "destructive",
			});
			return;
		}

		if (!latestScheduledAt) {
			toast({
				title: "No scheduled posts yet",
				description: "Schedule at least one post first, then this can continue from the last date.",
			});
			return;
		}

		const latest = new Date(latestScheduledAt);
		if (Number.isNaN(latest.getTime())) return;
		const cadence = Math.max(
			1,
			Number.parseInt(bulkIntervalDays, 10) ||
				Number(rotationSettings.cadenceDays) ||
				1,
		);

		const baseDate = addDaysToDateOnly(latest.toISOString().slice(0, 10), cadence);
		const baseTime = latest.toISOString().slice(11, 16);
		const sortedPosts = [...selectedPosts].sort((a, b) => {
			const left = new Date(a.createdAt || a.scheduledAt || 0).getTime();
			const right = new Date(b.createdAt || b.scheduledAt || 0).getTime();
			return left - right;
		});
		const scheduledPosts = bulkMixProducts
			? interleavePostsByProduct(sortedPosts, rotationSettings.activeProductIds)
			: sortedPosts;

		setIsBulkSaving(true);
		try {
			const updates = await Promise.all(
				scheduledPosts.map(async (post, index) => {
					const scheduledAt = buildScheduledIso(baseDate, baseTime, index * cadence);
					const res = await fetch(`${API_BASE}/api/posts/${post.id}`, {
						method: "PUT",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({
							scheduledAt,
							status: bulkApprove ? "approved" : normalizePostStatus(post.status),
						}),
					});
					if (!res.ok) {
						throw new Error(`Failed to schedule ${post.title}: ${res.status}`);
					}
					return res.json();
				}),
			);

			const updateMap = new Map(
				updates.map((post) => [
					post.id,
					{ ...post, status: normalizePostStatus(post.status) },
				]),
			);
			setPosts((prev) => prev.map((post) => updateMap.get(post.id) || post));
			setSelectedIds([]);
			setBulkPreset("custom");
			setBulkStartDate(baseDate);
			setBulkTimeOfDay(baseTime);
			setBulkIntervalDays(String(cadence));
			toast({
				title: "Extended the calendar",
				description: `${updates.length} posts were chained after ${latest.toLocaleString()}.`,
			});
		} catch (error) {
			console.error("Failed to continue schedule", error);
			toast({
				title: "Continue schedule failed",
				description: error.message || "Could not continue after the last scheduled post.",
				variant: "destructive",
			});
		} finally {
			setIsBulkSaving(false);
		}
	};

	return (
		<div className="min-h-screen bg-black text-teal-300 font-mono">
			<div className="max-w-6xl mx-auto px-6 py-12">
				<AppTopNav />
				<header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-10 border-b border-pink-600 pb-6">
					<div>
						<p className="text-sm uppercase tracking-[0.3em] text-pink-500">
							postpunk lib
						</p>
						<h1 className="text-4xl md:text-5xl text-pink-400 glitchy">
							Content Vault
						</h1>
						<p className="text-sm text-teal-400 mt-2">
							View, edit, and manage your posts and drafts.
						</p>
					</div>
					<Link
						to="/"
						className="self-start md:self-auto inline-flex items-center gap-2 px-4 py-2 border border-pink-500 text-pink-300 hover:bg-pink-600 hover:text-black transition-colors rounded"
					>
						<span>⬅</span> Back to Chrono Grid
					</Link>
				</header>

				{error && (
					<div className="mb-6 p-4 border border-red-500 bg-red-900/20 text-red-300 rounded">
						{error}
					</div>
				)}

				{loading ? (
					<p className="text-center text-teal-400">Loading posts...</p>
				) : (
					<div className="space-y-6">
						<section className="border border-pink-600 bg-black/60 rounded-lg p-5 shadow-[0_0_20px_rgba(255,0,255,0.18)]">
							<div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
								<div>
									<p className="text-sm uppercase tracking-[0.3em] text-pink-500">
										batch scheduler
									</p>
									<h2 className="text-2xl text-pink-400 mt-1">Spread posts across the next days</h2>
									<p className="text-sm text-teal-400 mt-2">
										Select the unscheduled queue entries, then auto-chain them after your current last scheduled date.
									</p>
								</div>
								<div className="flex flex-wrap gap-2">
									<button
										onClick={selectDrafts}
										className="border border-teal-500 text-teal-300 px-3 py-2 rounded hover:bg-teal-500 hover:text-black transition-colors"
									>
										Select Unscheduled Queue
									</button>
									<button
										onClick={clearSelection}
										className="border border-gray-600 text-gray-300 px-3 py-2 rounded hover:bg-gray-700 transition-colors"
									>
										Clear
									</button>
								</div>
							</div>

							<div className="mt-5 grid gap-4 md:grid-cols-4">
								<label className="block">
									<span className="text-sm text-pink-300 uppercase tracking-[0.2em]">Preset</span>
									<select
										className="mt-2 w-full bg-black border border-teal-500 text-teal-200 p-3 rounded"
										value={bulkPreset}
										onChange={(e) => {
											const nextPreset = e.target.value;
											setBulkPreset(nextPreset);
											const preset = SCHEDULE_PRESETS[nextPreset];
											if (preset?.defaultTime) {
												setBulkTimeOfDay(preset.defaultTime);
											}
										}}
									>
										<option value="custom">Custom Interval</option>
										<option value="mwf">Mon / Wed / Fri</option>
										<option value="mwfsu">Mon / Wed / Fri / Sat / Sun</option>
									</select>
								</label>
								<label className="block">
									<span className="text-sm text-pink-300 uppercase tracking-[0.2em]">Start Date</span>
									<input
										type="date"
										className="mt-2 w-full bg-black border border-teal-500 text-teal-200 p-3 rounded"
										value={bulkStartDate}
										onChange={(e) => setBulkStartDate(e.target.value)}
									/>
								</label>
								<label className="block">
									<span className="text-sm text-pink-300 uppercase tracking-[0.2em]">Time</span>
									<input
										type="time"
										className="mt-2 w-full bg-black border border-teal-500 text-teal-200 p-3 rounded"
										value={bulkTimeOfDay}
										onChange={(e) => setBulkTimeOfDay(e.target.value)}
									/>
								</label>
								<label className="block">
									<span className="text-sm text-pink-300 uppercase tracking-[0.2em]">Every N Days</span>
									<input
										type="number"
										min="1"
										className="mt-2 w-full bg-black border border-teal-500 text-teal-200 p-3 rounded"
										value={bulkIntervalDays}
										onChange={(e) => setBulkIntervalDays(e.target.value)}
										disabled={bulkPreset !== "custom"}
									/>
								</label>
								<div className="rounded border border-lime-500/40 bg-lime-950/10 p-3 text-sm text-lime-200 md:col-span-2">
									<p className="uppercase tracking-[0.2em] text-lime-400">Saved Rotation Defaults</p>
									<p className="mt-2">
										{rotationSettings.activeProductIds?.length || 0} active products, {rotationSettings.cadenceDays} day between posts, default time {rotationSettings.defaultTime}, max {rotationSettings.maxPostsPerDay} per day.
									</p>
									<p className="mt-2 text-teal-300">
										Scheduled through:{" "}
										{latestScheduledAt
											? new Date(latestScheduledAt).toLocaleString()
											: "nothing yet"}
									</p>
								</div>
								<label className="flex items-center gap-3 text-teal-300 mt-7">
									<input
										type="checkbox"
										checked={bulkApprove}
										onChange={() => setBulkApprove(!bulkApprove)}
									/>
									Approve scheduled posts
								</label>
								<label className="flex items-center gap-3 text-teal-300 mt-7">
									<input
										type="checkbox"
										checked={bulkMixProducts}
										onChange={() => setBulkMixProducts(!bulkMixProducts)}
									/>
									Mix products across days
								</label>
							</div>

							<div className="mt-4 flex flex-wrap items-center gap-3">
								<p className="text-sm text-teal-400">{selectedIds.length} selected</p>
								<button
									onClick={approveSelectedPosts}
									disabled={isBulkSaving}
									className="px-4 py-2 rounded border border-lime-500 text-lime-200 hover:bg-lime-500 hover:text-black transition-colors disabled:opacity-50"
								>
									Approve Only
								</button>
								<button
									onClick={applyBulkSchedule}
									disabled={isBulkSaving}
									className="bg-pink-500 text-black px-4 py-2 rounded hover:bg-pink-400 transition-colors disabled:opacity-50"
								>
									{isBulkSaving ? "Scheduling..." : "Advanced Schedule"}
								</button>
								<button
									onClick={continueAfterLastScheduled}
									disabled={isBulkSaving || !latestScheduledAt}
									className="px-4 py-2 rounded border border-cyan-500 text-cyan-200 hover:bg-cyan-500 hover:text-black transition-colors disabled:opacity-50"
								>
									Auto Schedule After Last Date
								</button>
								<button
									onClick={resetFailedPosts}
									disabled={isBulkSaving}
									className="px-4 py-2 rounded border border-amber-500 text-amber-200 hover:bg-amber-500 hover:text-black transition-colors disabled:opacity-50"
								>
									Reset Failed To Draft
								</button>
								<button
									onClick={clearPostedPosts}
									disabled={isBulkSaving}
									className="px-4 py-2 rounded border border-red-500 text-red-200 hover:bg-red-500 hover:text-white transition-colors disabled:opacity-50"
								>
									Clear Posted From Queue
								</button>
							</div>
						</section>

						{posts.length === 0 ? (
							<p className="text-center text-teal-500">
								No posts found. Create some in the lab or composer.
							</p>
						) : (
							<>
								<div className="sticky top-0 z-10 rounded-lg border border-lime-500/50 bg-black/95 p-4 shadow-[0_0_18px_rgba(132,204,22,0.14)] backdrop-blur">
									<div className="flex flex-wrap items-center gap-3">
										<p className="text-sm uppercase tracking-[0.2em] text-lime-400">List Actions</p>
										<button
											onClick={selectDrafts}
											className="rounded border border-teal-500 px-3 py-2 text-teal-200 hover:bg-teal-500 hover:text-black transition-colors"
										>
											Select All Unscheduled
										</button>
										<button
											onClick={approveSelectedPosts}
											disabled={isBulkSaving}
											className="rounded border border-lime-500 px-3 py-2 text-lime-200 hover:bg-lime-500 hover:text-black transition-colors disabled:opacity-50"
										>
											Approve Only
										</button>
										<button
											onClick={continueAfterLastScheduled}
											disabled={isBulkSaving || !latestScheduledAt || selectedIds.length === 0}
											className="rounded border border-cyan-500 px-3 py-2 text-cyan-200 hover:bg-cyan-500 hover:text-black transition-colors disabled:opacity-50"
										>
											Auto Schedule After Last Date
										</button>
										<button
											onClick={clearSelection}
											className="rounded border border-gray-600 px-3 py-2 text-gray-300 hover:bg-gray-700 transition-colors"
										>
											Clear Selection
										</button>
										<p className="text-sm text-teal-400">{selectedIds.length} selected</p>
									</div>
								</div>

								{posts.map((post) => (
									<div
										key={post.id}
										className="border border-teal-500 bg-black/60 rounded-lg p-6 shadow-[0_0_20px_rgba(13,148,136,0.35)]"
									>
										{editingId === post.id ? (
											<div className="space-y-4">
											<label className="block">
												<span className="text-sm text-pink-300 uppercase tracking-[0.2em]">
													Title
												</span>
												<input
													type="text"
													className="mt-2 w-full bg-black border border-teal-500 text-teal-200 p-3 rounded focus:outline-none focus:ring-2 focus:ring-pink-500"
													value={editForm.title}
													onChange={(e) =>
														setEditForm((prev) => ({
															...prev,
															title: e.target.value,
														}))
													}
												/>
											</label>
											<label className="block">
												<span className="text-sm text-pink-300 uppercase tracking-[0.2em]">
													Body
												</span>
												<textarea
													className="mt-2 w-full bg-black border border-teal-500 text-teal-200 p-3 rounded min-h-[120px] focus:outline-none focus:ring-2 focus:ring-pink-500"
													value={editForm.body}
													onChange={(e) =>
														setEditForm((prev) => ({
															...prev,
															body: e.target.value,
														}))
													}
												/>
											</label>
											<label className="block">
												<span className="text-sm text-pink-300 uppercase tracking-[0.2em]">
													Scheduled At
												</span>
												<input
													type="datetime-local"
													className="mt-2 w-full bg-black border border-teal-500 text-teal-200 p-3 rounded focus:outline-none focus:ring-2 focus:ring-pink-500"
													value={editForm.scheduledAt}
													onChange={(e) =>
														setEditForm((prev) => ({
															...prev,
															scheduledAt: e.target.value,
														}))
													}
												/>
											</label>
											<label className="block">
												<span className="text-sm text-pink-300 uppercase tracking-[0.2em]">
													Status
												</span>
												<select
													className="mt-2 w-full bg-black border border-teal-500 text-teal-200 p-3 rounded focus:outline-none focus:ring-2 focus:ring-pink-500"
													value={editForm.status}
													onChange={(e) =>
														setEditForm((prev) => ({
															...prev,
															status: e.target.value,
														}))
													}
												>
													<option value="draft">Draft</option>
													<option value="approved">Approved</option>
													<option value="posted">Posted</option>
													<option value="failed">Failed</option>
												</select>
											</label>
											<div className="rounded border border-amber-700 bg-black/40 p-4">
												<p className="text-sm text-pink-300 uppercase tracking-[0.2em] mb-3">
													Manual Metrics
												</p>
												<div className="grid gap-3 md:grid-cols-3">
													{[
														["likes24h", "Likes 24h"],
														["likes7d", "Likes 7d"],
														["comments24h", "Comments 24h"],
														["comments7d", "Comments 7d"],
														["clicks24h", "Clicks 24h"],
														["clicks7d", "Clicks 7d"],
														["saves7d", "Saves 7d"],
													].map(([key, label]) => (
														<label key={key} className="block">
															<span className="text-xs text-teal-400 uppercase tracking-[0.2em]">
																{label}
															</span>
															<input
																type="number"
																min="0"
																className="mt-2 w-full bg-black border border-teal-500 text-teal-200 p-3 rounded focus:outline-none focus:ring-2 focus:ring-pink-500"
																value={editForm[key] ?? 0}
																onChange={(e) =>
																	setEditForm((prev) => ({
																		...prev,
																		[key]: e.target.value,
																	}))
																}
															/>
														</label>
													))}
												</div>
											</div>
											<div className="flex gap-3">
												<button
													onClick={handleUpdate}
													className="bg-pink-500 text-black px-4 py-2 rounded hover:bg-pink-400 transition-colors"
												>
													Save
												</button>
												<button
													onClick={cancelEdit}
													className="border border-teal-500 text-teal-300 px-4 py-2 rounded hover:bg-teal-500 hover:text-black transition-colors"
												>
													Cancel
												</button>
											</div>
										</div>
									) : (
										<div>
											{(() => {
												const palette = getWorkflowPalette(post);
                        const showAffiliateBadge = isAffiliatePost(post);
												return (
											<div className="flex justify-between items-start mb-4">
												<div className="flex items-start gap-3">
													{isSelectableQueuePost(post) ? (
														<input
															type="checkbox"
															className="mt-1"
															checked={selectedIds.includes(post.id)}
															onChange={() => toggleSelected(post.id)}
														/>
													) : (
														<span className={`mt-1 rounded border px-2 py-1 text-[10px] uppercase tracking-[0.2em] ${palette.badgeClass}`}>
															{palette.label}
														</span>
													)}
													<div>
                          {showAffiliateBadge && (
                            <span
                              className={`mb-2 inline-flex h-7 w-7 items-center justify-center rounded-full border text-xs ${palette.badgeClass}`}
                              aria-label="Affiliate post"
                              title="Affiliate post"
                            >
                              🛒
                            </span>
                          )}
													<h3 className="text-xl text-pink-400">
														{post.title}
													</h3>
													{post.metadata?.productProfileLabel && (
														<p className="text-sm text-amber-300">
															Product: {post.metadata.productProfileLabel}
														</p>
													)}
													<p className={`text-sm ${palette.textClass}`}>
														Status: {getStatusLabel(post.status)} | Targets: {formatTargetsLabel(post.targets)}
													</p>
													<p className={`text-xs uppercase tracking-[0.3em] mt-1 ${palette.textClass}`}>
														{palette.label}
													</p>
													{post.metadata?.imageStatus && (
														<p className="text-sm text-amber-300">
															Image: {post.metadata.imageStatus}
														</p>
													)}
													{post.scheduledAt && (
														<p className="text-sm text-teal-500">
															Scheduled: {new Date(post.scheduledAt).toLocaleString()}
														</p>
													)}
													</div>
												</div>
												<div className="flex gap-2">
													<button
														onClick={() => startEdit(post)}
														className="border border-teal-500 text-teal-300 px-3 py-1 rounded hover:bg-teal-500 hover:text-black transition-colors"
													>
														Edit
													</button>
													<button
														onClick={() => handleDelete(post.id)}
														className="border border-red-500 text-red-300 px-3 py-1 rounded hover:bg-red-500 hover:text-white transition-colors"
													>
														Delete
													</button>
												</div>
											</div>
												);
											})()}
											<p className="text-teal-200 whitespace-pre-wrap">{post.body}</p>
											{(post.metadata?.imageConcept || post.metadata?.imagePrompt) && (
												<div className="mt-4 rounded border border-amber-700 bg-black/50 p-3 text-sm">
													{post.metadata?.imageConcept && (
														<p className="text-teal-300">
															Concept: {post.metadata.imageConcept}
														</p>
													)}
													{post.metadata?.imagePrompt && (
														<p className="mt-2 text-amber-200 whitespace-pre-wrap">
															Prompt: {post.metadata.imagePrompt}
														</p>
													)}
												</div>
											)}
											{getProductLink(post) && (
												<div className="mt-4 rounded border border-pink-700 bg-black/50 p-3 text-sm">
													<p className="text-pink-300 break-all">
														Link: {getProductLink(post)}
													</p>
												</div>
											)}
											{Object.values(getPerformanceMetrics(post)).some((value) => value > 0) && (
												<div className="mt-4 rounded border border-amber-700 bg-black/50 p-3 text-sm">
													<p className="text-amber-300">
														24h: {getPerformanceMetrics(post).likes24h} likes, {getPerformanceMetrics(post).comments24h} comments, {getPerformanceMetrics(post).clicks24h} clicks
													</p>
													<p className="mt-1 text-teal-300">
														7d: {getPerformanceMetrics(post).likes7d} likes, {getPerformanceMetrics(post).comments7d} comments, {getPerformanceMetrics(post).clicks7d} clicks, {getPerformanceMetrics(post).saves7d} saves
													</p>
												</div>
											)}
											{post.image ? (
												<img
													src={post.image}
													alt={post.altText || post.title}
													className="mt-4 max-h-48 rounded border border-teal-700"
												/>
											) : (
												<div className="mt-4 p-4 border border-red-500 bg-red-900/20 text-red-300 rounded text-center">
													🚫 No visuals – this post is flying blind!
												</div>
											)}
											</div>
										)}
									</div>
								))}
							</>
						)}
					</div>
				)}

				<div className="mt-12 flex flex-wrap gap-3 justify-center">
					<Link
						to="/today"
						className="px-4 py-2 border border-amber-500 text-amber-300 rounded hover:bg-amber-500 hover:text-black transition-colors"
					>
						☀ Today Ops
					</Link>
					<Link
						to="/"
						className="px-4 py-2 border border-pink-500 text-pink-300 rounded hover:bg-pink-500 hover:text-black transition-colors"
					>
						⬅ Return Home
					</Link>
					<Link
						to="/lab"
						className="px-4 py-2 border border-teal-500 text-teal-300 rounded hover:bg-teal-500 hover:text-black transition-colors"
					>
						🧪 Go to Lab
					</Link>
				</div>
			</div>
		</div>
	);
}
