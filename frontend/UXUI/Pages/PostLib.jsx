/** @format */

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useToast } from "@/Components/ui/use-toast";
import { getStatusLabel, normalizePostStatus } from "../utils/postStatus";

const API_BASE = import.meta.env?.VITE_API_BASE || "http://localhost:3001";

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
	const [isBulkSaving, setIsBulkSaving] = useState(false);

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
				.filter((post) => normalizePostStatus(post.status) !== "posted")
				.map((post) => post.id),
		);
	};

	const clearSelection = () => {
		setSelectedIds([]);
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
			const preset = SCHEDULE_PRESETS[bulkPreset] || SCHEDULE_PRESETS.custom;
			const scheduledSlots =
				bulkPreset === "custom"
					? sortedPosts.map((_, index) => {
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
							sortedPosts.length,
					  );

			const updates = await Promise.all(
				sortedPosts.map(async (post, index) => {
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

	return (
		<div className="min-h-screen bg-black text-teal-300 font-mono">
			<div className="max-w-6xl mx-auto px-6 py-12">
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
										Select drafts or failed posts, then apply a custom interval or a weekday preset like Mon / Wed / Fri.
									</p>
								</div>
								<div className="flex flex-wrap gap-2">
									<button
										onClick={selectDrafts}
										className="border border-teal-500 text-teal-300 px-3 py-2 rounded hover:bg-teal-500 hover:text-black transition-colors"
									>
										Select Active Queue
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
								<label className="flex items-center gap-3 text-teal-300 mt-7">
									<input
										type="checkbox"
										checked={bulkApprove}
										onChange={() => setBulkApprove(!bulkApprove)}
									/>
									Approve scheduled posts
								</label>
							</div>

							<div className="mt-4 flex flex-wrap items-center gap-3">
								<p className="text-sm text-teal-400">{selectedIds.length} selected</p>
								<button
									onClick={applyBulkSchedule}
									disabled={isBulkSaving}
									className="bg-pink-500 text-black px-4 py-2 rounded hover:bg-pink-400 transition-colors disabled:opacity-50"
								>
									{isBulkSaving ? "Scheduling..." : "Apply Bulk Schedule"}
								</button>
								<button
									onClick={resetFailedPosts}
									disabled={isBulkSaving}
									className="px-4 py-2 rounded border border-amber-500 text-amber-200 hover:bg-amber-500 hover:text-black transition-colors disabled:opacity-50"
								>
									Reset Failed To Draft
								</button>
							</div>
						</section>

						{posts.length === 0 ? (
							<p className="text-center text-teal-500">
								No posts found. Create some in the lab or composer.
							</p>
						) : (
							posts.map((post) => (
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
											<div className="flex justify-between items-start mb-4">
												<div className="flex items-start gap-3">
													<input
														type="checkbox"
														className="mt-1"
														checked={selectedIds.includes(post.id)}
														onChange={() => toggleSelected(post.id)}
													/>
													<div>
													<h3 className="text-xl text-pink-400">{post.title}</h3>
													{post.metadata?.productProfileLabel && (
														<p className="text-sm text-amber-300">
															Product: {post.metadata.productProfileLabel}
														</p>
													)}
													<p className="text-sm text-teal-500">
														Status: {getStatusLabel(post.status)} | Targets: {formatTargetsLabel(post.targets)}
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
							))
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
