/** @format */

import axios from "axios";
import { readFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const GRAPH_VERSION = "v18.0";

function boolFromEnv(name, fallback = false) {
	const value = process.env[name];
	if (value === undefined) return fallback;
	return !["0", "false", "off", "no"].includes(String(value).toLowerCase());
}

function resolveAccount(input) {
	if (input?.account || input?.target) return input.account || null;
	return input || null;
}

function resolveLocalMediaPath(mediaPath) {
	if (!mediaPath) return null;
	if (path.isAbsolute(mediaPath)) return mediaPath;
	if (mediaPath.startsWith("/media/")) {
		return path.join(__dirname, "../../..", mediaPath.slice(1));
	}
	return path.join(__dirname, "../../..", mediaPath);
}

function inferMimeType(filePath, mediaType) {
	if (mediaType === "video") return "video/mp4";
	const ext = path.extname(filePath || "").toLowerCase();
	if (ext === ".png") return "image/png";
	if (ext === ".gif") return "image/gif";
	if (ext === ".webp") return "image/webp";
	return "image/jpeg";
}

async function postTextOrLink(pageId, accessToken, post) {
	const url = `https://graph.facebook.com/${GRAPH_VERSION}/${pageId}/feed`;
	const payload = {
		message: post.body,
		link: post.canonicalUrl || undefined,
		access_token: accessToken,
	};
	const response = await axios.post(url, payload, { timeout: 20000 });
	return { type: "feed", postId: response.data?.id };
}

async function postMedia(pageId, accessToken, post, mediaPath, mediaType) {
	const isVideo = mediaType === "video" || inferMimeType(mediaPath, mediaType).startsWith("video/");
	const endpoint = isVideo ? "videos" : "photos";
	const url = `https://graph.facebook.com/${GRAPH_VERSION}/${pageId}/${endpoint}`;
	const fileBuffer = await readFile(mediaPath);
	const mimeType = inferMimeType(mediaPath, mediaType);

	const form = new FormData();
	form.append("access_token", accessToken);
	form.append(isVideo ? "description" : "caption", post.body || "");
	form.append("source", new Blob([fileBuffer], { type: mimeType }), path.basename(mediaPath));

	const response = await axios.post(url, form, {
		timeout: 30000,
	});
	return {
		type: endpoint,
		postId: response.data?.post_id || response.data?.id,
	};
}

async function postToFacebook(post, context = {}) {
	const account = resolveAccount(context);
	const accessToken =
		account?.credentials?.accessToken || process.env.FACEBOOK_PAGE_ACCESS_TOKEN || "";
	const pageId = account?.metadata?.pageId || process.env.FACEBOOK_PAGE_ID || "";
	const allowBrowserFallback =
		account?.metadata?.browserFallback ??
		boolFromEnv("FACEBOOK_BROWSER_FALLBACK", true);

	if (!accessToken || accessToken === "REPLACE_WITH_REAL_PAGE_TOKEN") {
		if (allowBrowserFallback) {
			const { default: postToFacebookBrowser } = await import("./post-to-facebook-browser.js");
			return postToFacebookBrowser(post, { account, target: context?.target });
		}
		throw new Error("Facebook page access token not configured");
	}
	if (!pageId) {
		throw new Error("Facebook page ID not configured in metadata or env");
	}

	const mediaPath = resolveLocalMediaPath(post?.mediaPath || null);
	const mediaType = post?.mediaType || null;

	try {
		if (mediaPath) {
			return await postMedia(pageId, accessToken, post, mediaPath, mediaType);
		}
		return await postTextOrLink(pageId, accessToken, post);
	} catch (error) {
		console.error("Facebook posting error:", error.response?.data || error.message);
		const fbError = error?.response?.data?.error || {};
		const tokenExpired =
			Number(fbError?.code) === 190 ||
			/session has expired/i.test(String(fbError?.message || ""));
		if (allowBrowserFallback && tokenExpired) {
			const { default: postToFacebookBrowser } = await import("./post-to-facebook-browser.js");
			return postToFacebookBrowser(post, { account, target: context?.target });
		}
		throw new Error("Failed to post to Facebook");
	}
}

export default postToFacebook;
