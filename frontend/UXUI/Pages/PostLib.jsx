/** @format */

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useToast } from "@/Components/ui/use-toast";

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

export default function PostLib() {
	const { toast } = useToast();
	const [posts, setPosts] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const [editingId, setEditingId] = useState(null);
	const [editForm, setEditForm] = useState({});

	const loadPosts = async () => {
		try {
			setLoading(true);
			setError("");
			const res = await fetch(`${API_BASE}/api/posts`);
			if (!res.ok) throw new Error(`Failed to load posts: ${res.status}`);
			const data = await res.json();
			// Filter unique posts by id
			const uniquePosts = data.filter((post, index, arr) => arr.findIndex(p => p.id === post.id) === index);
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
			scheduledAt: post.scheduledAt
				? new Date(post.scheduledAt).toISOString().slice(0, 16)
				: "",
			status: post.status,
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
			setPosts((prev) => prev.map((p) => (p.id === editingId ? updated : p)));
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
													<option value="scheduled">Scheduled</option>
													<option value="posted">Posted</option>
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
												<div>
													<h3 className="text-xl text-pink-400">{post.title}</h3>
													<p className="text-sm text-teal-500">
														Status: {post.status} | Targets: {formatTargetsLabel(post.targets)}
													</p>
													{post.scheduledAt && (
														<p className="text-sm text-teal-500">
															Scheduled: {new Date(post.scheduledAt).toLocaleString()}
														</p>
													)}
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