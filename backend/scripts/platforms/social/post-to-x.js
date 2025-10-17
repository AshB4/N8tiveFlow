/** @format */

import "dotenv/config";
import axios from "axios";
import crypto from "crypto";

const POST_URL = "https://api.twitter.com/1.1/statuses/update.json";
const MAX_TWEET_LENGTH = 280;

function requiredEnv(name) {
	const value = process.env[name];
	if (!value) {
		throw new Error(`Missing required Twitter config: ${name}`);
	}
	return value;
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
	params,
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

export default async function postToX(post) {
	const consumerKey = requiredEnv("TWITTER_API_KEY");
	const consumerSecret = requiredEnv("TWITTER_API_SECRET");
	const token = requiredEnv("TWITTER_ACCESS_TOKEN");
	const tokenSecret = requiredEnv("TWITTER_ACCESS_SECRET");

	const status = buildStatus(post);
	if (!status) {
		throw new Error("Twitter post requires text content");
	}

	const bodyParams = { status };
	const authorization = buildOAuthHeader({
		method: "POST",
		url: POST_URL,
		params: bodyParams,
		consumerKey,
		consumerSecret,
		token,
		tokenSecret,
	});

	try {
		const response = await axios.post(POST_URL, new URLSearchParams(bodyParams), {
			headers: {
				Authorization: authorization,
				"Content-Type": "application/x-www-form-urlencoded",
				"User-Agent": "PostPunkBot",
			},
			timeout: 10000,
		});

		return {
			status: "success",
			id: response.data?.id_str,
			text: response.data?.text,
			raw: response.data,
		};
	} catch (error) {
		const apiErrors = error.response?.data?.errors;
		const reason = Array.isArray(apiErrors)
			? apiErrors.map((e) => e.message).join("; ")
			: error.response?.data || error.message;
		throw new Error(`Twitter post failed: ${reason}`);
	}
}
