/** @format */

import React from "react";

const formatDateLabel = (iso) => {
	try {
		return new Date(iso).toLocaleDateString(undefined, {
			weekday: "long",
			year: "numeric",
			month: "long",
			day: "numeric",
		});
	} catch {
		return iso;
	}
};

const formatDateTime = (value) => {
	if (!value) return null;
	try {
		return new Date(value).toLocaleString();
	} catch {
		return value;
	}
};

const formatTargets = (targets = [], fallbackPlatforms = []) => {
	const list = Array.isArray(targets) && targets.length
		? targets
		: Array.isArray(fallbackPlatforms)
		? fallbackPlatforms.map((platform) => ({ platform, accountId: null }))
		: [];
	if (!list.length) return "—";
	return list
		.map((entry) =>
			entry.accountId
				? `${entry.platform} (${entry.accountId})`
				: entry.platform,
		)
		.join(", ");
};

export default function DayPostsModal({
	date,
	posts,
	onClose,
	onEditPost,
	onRewriteAll,
}) {
	if (!date) return null;

	const hasPosts = posts && posts.length > 0;

	return (
		<div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
			<div className="bg-gray-950 border border-pink-500 text-teal-200 rounded-lg shadow-[0_0_25px_rgb(255,0,255,0.4)] max-w-3xl w-full p-6">
				<div className="flex items-start justify-between mb-6">
					<div>
						<p className="uppercase text-xs tracking-[0.4em] text-pink-400">
							day dossier
						</p>
						<h2 className="text-2xl text-pink-300 mt-1">
							{formatDateLabel(date)}
						</h2>
					</div>
					<button
						onClick={onClose}
						className="text-pink-400 hover:text-pink-200 transition-colors text-xl"
						aria-label="Close day posts modal"
					>
						✕
					</button>
				</div>

				{hasPosts ? (
					<div className="space-y-4 max-h-[50vh] overflow-y-auto pr-1">
						{posts.map((post) => {
							const platforms = Array.isArray(post.platforms)
								? post.platforms.join(", ")
								: post.platform || "—";
							const scheduled = formatDateTime(
								post.scheduledAt || post.scheduled_at || post.intended_date
							);
							const status = post.status || "unknown";
							const targetLabel = formatTargets(post.targets, post.platforms);
							return (
								<div
									key={post.id || `${post.title}-${post.platform}`}
									className="border border-teal-600 rounded-lg p-4 bg-black/70"
								>
									<div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
										<div>
											<p className="text-pink-300 text-lg font-semibold">
												{post.title || "Untitled draft"}
											</p>
											<p className="text-xs text-teal-500 uppercase tracking-[0.3em]">
												{platforms}
											</p>
											<p className="text-xs text-teal-500">
												Targets: {targetLabel}
											</p>
											<p className="text-xs text-teal-500">
												Status: {status}
											</p>
											{scheduled && (
												<p className="text-xs text-teal-500">
													Scheduled: {scheduled}
												</p>
											)}
										</div>
										<div className="flex gap-2 flex-wrap">
											<button
												onClick={() => onEditPost?.(post)}
												className="px-3 py-1 rounded bg-pink-500 text-black text-sm uppercase tracking-[0.2em] hover:bg-pink-400 transition-colors"
											>
												Edit post
											</button>
											<button
												onClick={() => onRewriteAll?.([post])}
												className="px-3 py-1 rounded border border-teal-500 text-teal-200 text-sm uppercase tracking-[0.2em] hover:bg-teal-500 hover:text-black transition-colors"
											>
												Rewrite vibes
											</button>
										</div>
									</div>
									{post.body && (
										<p className="mt-3 text-sm text-teal-300 whitespace-pre-line">
											{post.body}
										</p>
									)}
								</div>
							);
						})}
					</div>
				) : (
					<p className="text-sm text-teal-400">
						No approved posts on deck for this date. Summon one from the Lab?
					</p>
				)}

				<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-6">
					<button
						onClick={() => onRewriteAll?.(posts || [])}
						className="inline-flex items-center justify-center gap-2 px-4 py-2 border border-pink-500 text-pink-200 uppercase tracking-[0.3em] rounded hover:bg-pink-500 hover:text-black transition-colors"
					>
						<span role="img" aria-hidden="true">
							🧪
						</span>
						Rewrite entire day
					</button>
					<button
						onClick={onClose}
						className="px-4 py-2 border border-teal-600 text-teal-200 rounded uppercase tracking-[0.2em] hover:bg-teal-500 hover:text-black transition-colors"
					>
						Close lab log
					</button>
				</div>
			</div>
		</div>
	);
}
