/** @format */

import axios from "axios";

function resolveAccount(input) {
	if (input?.account || input?.target) return input.account || null;
	return input || null;
}

function buildText(post) {
	const body = (post?.body || "").trim();
	const hashtags = Array.isArray(post?.hashtags)
		? post.hashtags
				.filter(Boolean)
				.map((tag) => (String(tag).startsWith("#") ? String(tag) : `#${tag}`))
				.join(" ")
		: "";
	if (!body) return hashtags;
	return hashtags ? `${body}\n\n${hashtags}` : body;
}

function resolveMediaUrl(post) {
	const imageUrl = typeof post?.image === "string" ? post.image.trim() : "";
	if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
		return imageUrl;
	}
	return "";
}

async function postToThreads(post, context = {}) {
	const account = resolveAccount(context);
	const accessToken =
		account?.credentials?.accessToken || process.env.THREADS_ACCESS_TOKEN || "";
	const accountId = account?.metadata?.accountId || process.env.THREADS_ACCOUNT_ID || "";
	if (!accessToken || accessToken === "TODO_USER_ACCESS_TOKEN") {
		throw new Error("Threads access token not configured");
	}
	if (!accountId) {
		throw new Error("Threads account ID not configured in metadata or env");
	}

	const mediaUrl = resolveMediaUrl(post);
	const text = buildText(post);
	if (!text && !mediaUrl) {
		throw new Error("Threads post requires text and/or media URL");
	}
	if (!mediaUrl && post?.mediaPath) {
		throw new Error(
			"Threads requires a public media URL. Local mediaPath uploads are not supported by this API flow.",
		);
	}

	const createUrl = `https://graph.threads.net/v1.0/${accountId}/threads`;
	const createPayload = {
		media_type: mediaUrl ? "IMAGE" : "TEXT",
		text,
		access_token: accessToken,
	};
	if (mediaUrl) {
		createPayload.image_url = mediaUrl;
	}

	try {
		const createResponse = await axios.post(createUrl, createPayload, {
			timeout: 20000,
		});
		const creationId = createResponse.data?.id;

		const publishUrl = `https://graph.threads.net/v1.0/${accountId}/threads_publish`;
		const publishPayload = {
			creation_id: creationId,
			access_token: accessToken,
		};
		const publishResponse = await axios.post(publishUrl, publishPayload, {
			timeout: 20000,
		});

		return {
			success: true,
			creationId,
			threadId: publishResponse.data?.id || null,
			mediaPosted: Boolean(mediaUrl),
		};
	} catch (error) {
		console.error("Threads posting error:", error.response?.data || error.message);
		throw new Error("Failed to post to Threads");
	}
}

export default postToThreads;
