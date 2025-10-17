/** @format */

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:3001";

async function postJson(url, payload) {
	const res = await fetch(url, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(payload),
	});
	if (!res.ok) {
		const text = await res.text();
		throw new Error(`Backend error ${res.status}: ${text}`);
	}
	return res.json();
}

export async function postToAllPlatforms(post, targets) {
	const normalizedTargets = Array.isArray(targets) ? targets : [];
	const fallbackPlatforms = normalizedTargets
		.filter((target) => target && target.platform)
		.map((target) => target.platform);
	const payload = {
		post,
		targets: normalizedTargets,
		platforms: fallbackPlatforms.length ? fallbackPlatforms : undefined,
	};

	try {
		return await postJson(`${API_BASE}/api/post-to-all`, payload);
	} catch (err) {
		console.error("Failed to post", err);
		throw err;
	}
}

export default postToAllPlatforms;
