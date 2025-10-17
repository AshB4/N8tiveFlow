/** @format */

import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";

const PLATFORM_OPTIONS = [
	"x",
	"linkedin",
	"facebook",
	"pinterest",
	"reddit",
	"tumblr",
	"kofi",
	"discord",
	"devto",
	"hashnode",
	"producthunt",
	"amazon",
];

const VIBES = [
	"🚪 Open the portal with a spicy hook",
	"🧪 Add a stat + a story = instant credibility",
	"🧜‍♀️ Drop one surprise CTA the algorithm won't expect",
	"🛸 Remix an old win with a new metric",
	"🧠 Translate your last DM rant into value",
];

export default function PostLab() {
	const location = useLocation();
	const [title, setTitle] = useState("");
	const [body, setBody] = useState("");
	const [scheduledAt, setScheduledAt] = useState("");
	const [selectedPlatforms, setSelectedPlatforms] = useState(["x"]);
	const [localDrafts, setLocalDrafts] = useState([]);
	const [statusMessage, setStatusMessage] = useState("");
	const [isSaving, setIsSaving] = useState(false);

	const togglePlatform = (platform) => {
		setSelectedPlatforms((prev) =>
			prev.includes(platform)
				? prev.filter((p) => p !== platform)
				: [...prev, platform]
		);
	};

	const resetForm = () => {
		setTitle("");
		setBody("");
		setScheduledAt("");
		setSelectedPlatforms(["x"]);
	};

	useEffect(() => {
		const incomingPosts = location.state?.posts || [];
		if (!incomingPosts.length) return;

		const firstPost = incomingPosts[0];
		const normalizePlatforms = Array.isArray(firstPost?.platforms)
			? firstPost.platforms.map((p) => String(p).toLowerCase())
			: firstPost?.platform
			? [String(firstPost.platform).toLowerCase()]
			: ["x"];

		const toDateTimeLocal = (value) => {
			if (!value) return "";
			const parsed = new Date(value);
			if (Number.isNaN(parsed.getTime())) return "";
			const offset = parsed.getTimezoneOffset() * 60000;
			return new Date(parsed.getTime() - offset).toISOString().slice(0, 16);
		};

		setTitle(firstPost?.title || "");
		setBody(firstPost?.body || firstPost?.content || "");
		setScheduledAt(
			toDateTimeLocal(firstPost?.scheduledAt || firstPost?.scheduled_at)
		);
		setSelectedPlatforms(normalizePlatforms);
		setLocalDrafts(
			incomingPosts.map((post) => ({
				id: post.id || `import-${post.title}-${post.platform}`,
				title: post.title,
				platforms: Array.isArray(post.platforms)
					? post.platforms
					: post.platform
					? [post.platform]
					: [],
				scheduledAt: post.scheduledAt || post.scheduled_at || null,
			}))
		);
		setStatusMessage("Loaded calendar posts. Remix freely.");
	}, [location.state]);

	const handleSave = async () => {
		if (!title.trim() || !body.trim()) {
			setStatusMessage("⚠️ Gotta feed the lab at least a title AND a body.");
			return;
		}

		setIsSaving(true);
		setStatusMessage("Summoning scribes…");

		try {
			const scheduledIso = scheduledAt ? new Date(scheduledAt).toISOString() : null;
			const response = await fetch("http://localhost:3001/api/posts", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					title,
					body,
					platforms: selectedPlatforms,
					scheduledAt: scheduledIso,
					status: "draft",
				}),
			});

			if (!response.ok) {
				throw new Error(`Backend muttered ${response.status}`);
			}

			const saved = await response.json();
			setLocalDrafts((prev) => [
				{
					id: saved.id || `local-${Date.now()}`,
					title: saved.title,
					platforms: saved.platforms || selectedPlatforms,
					scheduledAt: saved.scheduledAt || scheduledIso,
				},
				...prev,
			]);
			setStatusMessage("✅ Draft bottled! It's waiting in the queue cauldron.");
			resetForm();
		} catch (error) {
			console.error("Failed to save post", error);
			setStatusMessage(
				`💥 Save fizzled: ${error.message || "unknown system gremlin"}`
			);
		} finally {
			setIsSaving(false);
		}
	};

	return (
		<div className="min-h-screen bg-black text-teal-300 font-mono">
			<div className="max-w-6xl mx-auto px-6 py-12">
				<header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-10 border-b border-pink-600 pb-6">
					<div>
						<p className="text-sm uppercase tracking-[0.3em] text-pink-500">
							postpunk lab
						</p>
						<h1 className="text-4xl md:text-5xl text-pink-400 glitchy">
							Scribble Sanctum
						</h1>
						<p className="text-sm text-teal-400 mt-2">
							Write. Tinker. Bottle your chaos for future you.
						</p>
					</div>
					<Link
						to="/"
						className="self-start md:self-auto inline-flex items-center gap-2 px-4 py-2 border border-pink-500 text-pink-300 hover:bg-pink-600 hover:text-black transition-colors rounded"
					>
						<span>⬅</span> Back to Chrono Grid
					</Link>
				</header>

				<section className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-8">
					<div className="border border-pink-600 bg-black/60 rounded-lg p-6 shadow-[0_0_20px_rgba(255,0,255,0.25)]">
						<div className="flex items-baseline justify-between gap-4 mb-6">
							<h2 className="text-2xl text-pink-400">Draft Console</h2>
							<span className="text-xs text-teal-500 uppercase tracking-[0.2em]">
								{new Date().toLocaleString()}
							</span>
						</div>

						<label className="block mb-4">
							<span className="text-sm text-pink-300 uppercase tracking-[0.2em]">
								Title incantation
							</span>
							<input
								type="text"
								className="mt-2 w-full bg-black border border-teal-500 text-teal-200 p-3 rounded focus:outline-none focus:ring-2 focus:ring-pink-500"
								placeholder="Example: 'Why my cron jobs wear eyeliner'"
								value={title}
								onChange={(e) => setTitle(e.target.value)}
							/>
						</label>

						<label className="block mb-6">
							<span className="text-sm text-pink-300 uppercase tracking-[0.2em]">
								Main spell
							</span>
							<textarea
								className="mt-2 w-full bg-black border border-teal-500 text-teal-200 p-3 rounded min-h-[220px] focus:outline-none focus:ring-2 focus:ring-pink-500"
								placeholder="Spin your narrative. Drop a CTA. Add weird emojis."
								value={body}
								onChange={(e) => setBody(e.target.value)}
							/>
						</label>

						<div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
							<label className="block">
								<span className="text-sm text-pink-300 uppercase tracking-[0.2em]">
									Time capsule
								</span>
								<input
									type="datetime-local"
									className="mt-2 w-full bg-black border border-teal-500 text-teal-200 p-3 rounded focus:outline-none focus:ring-2 focus:ring-pink-500"
									value={scheduledAt}
									onChange={(e) => setScheduledAt(e.target.value)}
								/>
							</label>
							<div>
								<span className="text-sm text-pink-300 uppercase tracking-[0.2em]">
									Vibe prompts
								</span>
								<ul className="mt-2 text-xs text-teal-400 space-y-1 bg-black/70 border border-teal-600 rounded p-3">
									{VIBES.map((vibe) => (
										<li key={vibe}>{vibe}</li>
									))}
								</ul>
							</div>
						</div>

						<div className="mb-6">
							<span className="text-sm text-pink-300 uppercase tracking-[0.2em]">
								Platform rituals
							</span>
							<div className="mt-3 flex flex-wrap gap-2">
								{PLATFORM_OPTIONS.map((platform) => {
									const isActive = selectedPlatforms.includes(platform);
									return (
										<button
											type="button"
											key={platform}
											onClick={() => togglePlatform(platform)}
											className={`px-3 py-1 rounded border text-sm uppercase tracking-widest transition-colors ${
												isActive
													? "border-pink-500 bg-pink-500 text-black"
													: "border-teal-500 text-teal-300 hover:bg-teal-500 hover:text-black"
											}`}
										>
											{platform}
										</button>
									);
								})}
							</div>
						</div>

						<div className="flex flex-col sm:flex-row gap-3">
							<button
								type="button"
								onClick={handleSave}
								disabled={isSaving}
								className="flex-1 bg-pink-500 text-black px-4 py-3 rounded text-lg font-semibold tracking-[0.2em] hover:bg-pink-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
							>
								{isSaving ? "Saving…" : "Save to Queue"}
							</button>
							<button
								type="button"
								onClick={resetForm}
								className="sm:w-32 border border-teal-500 text-teal-300 px-4 py-3 rounded hover:bg-teal-500 hover:text-black transition-colors"
							>
								Clear
							</button>
						</div>

						{statusMessage && (
							<p className="mt-4 text-sm text-teal-300">{statusMessage}</p>
						)}
					</div>

					<aside className="border border-teal-500 bg-black/70 rounded-lg p-6 space-y-6 shadow-[0_0_20px_rgba(13,148,136,0.35)]">
						<div>
							<h3 className="text-lg text-pink-400 uppercase tracking-[0.3em] mb-2">
								Saved this session
							</h3>
							{localDrafts.length === 0 ? (
								<p className="text-sm text-teal-500">
									No drafts bottled yet. Make some chaos.
								</p>
							) : (
								<ul className="space-y-3 text-sm">
									{localDrafts.map((draft) => (
										<li
											key={draft.id}
											className="border border-teal-600 rounded p-3 bg-black/60"
										>
											<p className="text-pink-300 font-semibold">{draft.title}</p>
											<p className="text-xs text-teal-500">
												Platforms: {draft.platforms.join(", ")}
											</p>
											{draft.scheduledAt && (
												<p className="text-xs text-teal-500">
													Scheduled: {new Date(draft.scheduledAt).toLocaleString()}
												</p>
											)}
										</li>
									))}
								</ul>
							)}
						</div>

						<div>
							<h3 className="text-lg text-pink-400 uppercase tracking-[0.3em] mb-2">
								Ritual reminder
							</h3>
							<p className="text-sm text-teal-400">
								Every save beams straight into your queue JSON. Check the
								calendar to schedule, remix, or unleash it across the socials.
							</p>
						</div>
					</aside>
				</section>
				<div className="mt-12 flex flex-wrap gap-3 justify-center">
					<Link
						to="/"
						className="px-4 py-2 border border-pink-500 text-pink-300 rounded hover:bg-pink-500 hover:text-black transition-colors"
					>
						⬅ Return Home
					</Link>
					<Link
						to="/compose"
						className="px-4 py-2 border border-teal-500 text-teal-300 rounded hover:bg-teal-500 hover:text-black transition-colors"
					>
						✍️ Jump to Composer
					</Link>
				</div>
			</div>
		</div>
	);
}
