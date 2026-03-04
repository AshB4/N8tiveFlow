/** @format */

import { config as loadEnv } from "dotenv";
import axios from "axios";
import crypto from "crypto";
import { readFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

loadEnv({ path: path.join(__dirname, "../../../.env"), override: false });
loadEnv({ path: path.join(__dirname, "../../../../.env"), override: false });

const CREATE_TWEET_URL = "https://api.x.com/2/tweets";
const MEDIA_UPLOAD_URL = "https://upload.twitter.com/1.1/media/upload.json";
const MAX_TWEET_LENGTH = 280;

function envAny(...names) {
	for (const name of names) {
		const value = process.env[name];
		if (value) return value;
	}
	return null;
}

function requiredEnvAny(...names) {
	const value = envAny(...names);
	if (value) return value;
	throw new Error(`Missing required X config: ${names.join(" or ")}`);
}

function percentEncode(value) {
	return encodeURIComponent(value).replace(/[!'()*]/g, (c) => `%${
		c.charCodeAt(0).toString(16).toUpperCase()
	}`);
}

function buildStatus({ title, body, hashtags }) {
	let status = body || title || "";
	const hashtagText = Array.isArray(hashtags)
		? hashtags
			.filter(Boolean)
			.map((tag) => (tag.startsWith("#") ? tag : `#${tag}`))
			.join(" ")
		: typeof hashtags === "string"
		? hashtags
		: "";

	if (hashtagText) {
		status = status ? `${status}\n\n${hashtagText}` : hashtagText;
	}

	if (status.length <= MAX_TWEET_LENGTH) {
		return status;
	}

	return status.slice(0, MAX_TWEET_LENGTH - 1).trimEnd() + "…";
}

function buildOAuthHeader({
	method,
	url,
	params = {},
	consumerKey,
	consumerSecret,
	token,
	tokenSecret,
}) {
	const oauthParams = {
		oauth_consumer_key: consumerKey,
		oauth_nonce: crypto.randomBytes(16).toString("hex"),
		oauth_signature_method: "HMAC-SHA1",
		oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
		oauth_token: token,
		oauth_version: "1.0",
	};

	const signatureBaseParams = {
		...oauthParams,
		...params,
	};

	const sortedKeys = Object.keys(signatureBaseParams)
		.sort()
		.filter((key) => signatureBaseParams[key] !== undefined);

	const paramString = sortedKeys
		.map((key) => `${percentEncode(key)}=${percentEncode(signatureBaseParams[key])}`)
		.join("&");

	const baseString = [
		method.toUpperCase(),
		percentEncode(url),
		percentEncode(paramString),
	].join("&");

	const signingKey = `${percentEncode(consumerSecret)}&${percentEncode(
		tokenSecret,
	)}`;
	const signature = crypto
		.createHmac("sha1", signingKey)
		.update(baseString)
		.digest("base64");

	const headerParams = {
		...oauthParams,
		oauth_signature: signature,
	};

	const header =
		"OAuth " +
		Object.keys(headerParams)
			.sort()
			.map((key) => `${percentEncode(key)}="${percentEncode(headerParams[key])}"`)
			.join(", ");

	return header;
}

function formatAxiosError(error, endpointLabel) {
	const status = error?.response?.status ?? null;
	const data = error?.response?.data ?? null;
	const detail =
		(typeof data === "object" && data !== null
			? data.detail || data.title || JSON.stringify(data)
			: data) || error?.message || "Unknown error";
	return `${endpointLabel} failed${status ? ` (status ${status})` : ""}: ${detail}`;
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
	if (mediaType === "gif") return "image/gif";
	const ext = path.extname(filePath || "").toLowerCase();
	if (ext === ".gif") return "image/gif";
	if (ext === ".png") return "image/png";
	if (ext === ".webp") return "image/webp";
	return "image/jpeg";
}

async function uploadMedia({
	consumerKey,
	consumerSecret,
	token,
	tokenSecret,
	mediaPath,
	mediaType,
}) {
	try {
		const fileBuffer = await readFile(mediaPath);
		const mimeType = inferMimeType(mediaPath, mediaType);
		if (mimeType.startsWith("video/")) {
			throw new Error(
				"X video upload requires chunked upload flow (not enabled yet). Use image/gif for now.",
			);
		}

		const form = new FormData();
		form.append(
			"media",
			new Blob([fileBuffer], { type: mimeType }),
			path.basename(mediaPath),
		);

		const authorization = buildOAuthHeader({
			method: "POST",
			url: MEDIA_UPLOAD_URL,
			params: {},
			consumerKey,
			consumerSecret,
			token,
			tokenSecret,
		});

		const response = await axios.post(MEDIA_UPLOAD_URL, form, {
			headers: {
				Authorization: authorization,
				"User-Agent": "PostPunkBot",
			},
			timeout: 20000,
		});
		const mediaId = response.data?.media_id_string || null;
		if (!mediaId) {
			throw new Error(
				`X media upload returned no media_id_string: ${JSON.stringify(
					response.data || {},
				)}`,
			);
		}
		return mediaId;
	} catch (error) {
		throw new Error(formatAxiosError(error, "X media upload"));
	}
}

export default async function postToX(post, context = {}) {
	const accountCreds = context?.account?.credentials || {};
	const consumerKey =
		accountCreds.apiKey ||
		requiredEnvAny("X_API_KEY", "TWITTER_API_KEY");
	const consumerSecret =
		accountCreds.apiSecret ||
		requiredEnvAny("X_API_SECRET", "TWITTER_API_SECRET");
	const token =
		accountCreds.accessToken ||
		requiredEnvAny("X_ACCESS_TOKEN", "TWITTER_ACCESS_TOKEN");
	const tokenSecret =
		accountCreds.accessSecret ||
		requiredEnvAny("X_ACCESS_SECRET", "TWITTER_ACCESS_SECRET");

	const status = buildStatus(post);
	if (!status) {
		throw new Error("X post requires text content");
	}

	const mediaPath = resolveLocalMediaPath(post?.mediaPath);
	let mediaId = null;
	if (mediaPath) {
		mediaId = await uploadMedia({
			consumerKey,
			consumerSecret,
			token,
			tokenSecret,
			mediaPath,
			mediaType: post?.mediaType || null,
		});
	}

	const bodyPayload = mediaId
		? {
				text: status,
				media: { media_ids: [mediaId] },
			}
		: { text: status };
	const authorization = buildOAuthHeader({
		method: "POST",
		url: CREATE_TWEET_URL,
		params: {},
		consumerKey,
		consumerSecret,
		token,
		tokenSecret,
	});

	try {
		const response = await axios.post(CREATE_TWEET_URL, bodyPayload, {
			headers: {
				Authorization: authorization,
				"Content-Type": "application/json",
				"User-Agent": "PostPunkBot",
			},
			timeout: 10000,
		});

		return {
			status: "success",
			id: response.data?.data?.id,
			text: response.data?.data?.text,
			mediaId,
			raw: response.data,
		};
	} catch (error) {
		throw new Error(formatAxiosError(error, "X create tweet"));
	}
}
