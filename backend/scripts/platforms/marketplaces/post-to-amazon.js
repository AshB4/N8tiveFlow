/** @format */

require("dotenv/config");
const axios = require("axios");
const crypto = require("crypto");

// Required env vars: AMAZON_PAAPI_ACCESS_KEY, AMAZON_PAAPI_SECRET_KEY, AMAZON_PARTNER_TAG

const DEFAULT_REGION = "us-east-1";
const DEFAULT_HOST = "webservices.amazon.com";
const SERVICE = "ProductAdvertisingAPI";

const TARGETS = {
	GetItems: "com.amazon.paapi5.v1.ProductAdvertisingAPIv1.GetItems",
	SearchItems: "com.amazon.paapi5.v1.ProductAdvertisingAPIv1.SearchItems",
};

const PATHS = {
	GetItems: "/paapi5/getitems",
	SearchItems: "/paapi5/searchitems",
};

const CONTENT_TYPE = "application/json; charset=utf-8";
const CONTENT_ENCODING = "amz-1.0";

function requiredEnv(name) {
	const value = process.env[name];
	if (!value) {
		throw new Error(`Missing required Amazon config: ${name}`);
	}
	return value;
}

function hash(value) {
	return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

function hmac(key, value) {
	return crypto.createHmac("sha256", key).update(value, "utf8").digest();
}

function buildSigningKey(secretKey, dateStamp, region) {
	const kDate = hmac(`AWS4${secretKey}`, dateStamp);
	const kRegion = hmac(kDate, region);
	const kService = hmac(kRegion, SERVICE);
	return hmac(kService, "aws4_request");
}

function isoNow() {
	const now = new Date();
	const date = now.toISOString().replace(/[-:]/g, "").replace(/\..+/, "");
	return {
		amzDate: `${date.slice(0, 8)}T${date.slice(8)}Z`,
		dateStamp: date.slice(0, 8),
	};
}

function buildCanonicalRequest({
	method,
	path,
	host,
	amzDate,
	target,
	payload,
}) {
	const canonicalHeaders = `content-encoding:${CONTENT_ENCODING}\ncontent-type:${CONTENT_TYPE}\nhost:${host}\nx-amz-date:${amzDate}\nx-amz-target:${target}\n`;
	const signedHeaders = "content-encoding;content-type;host;x-amz-date;x-amz-target";
	const payloadHash = hash(payload);
	const canonicalRequest = `${method}\n${path}\n\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;
	return { signedHeaders, canonicalRequest, payloadHash };
}

function buildAuthHeader({
	accessKey,
	secretKey,
	region,
	amzDate,
	dateStamp,
	canonicalRequest,
	signedHeaders,
}) {
	const credentialScope = `${dateStamp}/${region}/${SERVICE}/aws4_request`;
	const stringToSign = `AWS4-HMAC-SHA256\n${amzDate}\n${credentialScope}\n${hash(
		canonicalRequest,
	)}`;
	const signingKey = buildSigningKey(secretKey, dateStamp, region);
	const signature = crypto
		.createHmac("sha256", signingKey)
		.update(stringToSign, "utf8")
		.digest("hex");
	return `AWS4-HMAC-SHA256 Credential=${accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
}

function buildAmazonLink({ asin, partnerTag, marketplace, utm }) {
	const base = new URL(`https://${marketplace}/dp/${asin}`);
	base.searchParams.set("tag", partnerTag);
	if (utm) {
		utm.split("&").forEach((pair) => {
			const [key, value] = pair.split("=");
			if (key && value) base.searchParams.set(key, value);
		});
	}
	return base.toString();
}

function extractAsin(post) {
	return (
		post.amazonAsin ||
		post.asin ||
		post.metadata?.amazon?.asin ||
		post.metadata?.asin ||
		post.platformOverrides?.amazon?.asin ||
		null
	);
}

function extractSearchKeywords(post) {
	return (
		post.amazonSearchKeywords ||
		post.metadata?.amazon?.keywords ||
		post.platformOverrides?.amazon?.keywords ||
		post.tags?.join(" ") ||
		post.hashtags?.join?.(" ") ||
		post.title ||
		null
	);
}

async function callPaapi({
	mode,
	body,
	host,
	region,
	accessKey,
	secretKey,
}) {
	const target = TARGETS[mode];
	const path = PATHS[mode];
	const url = `https://${host}${path}`;
	const payload = JSON.stringify(body);
	const { amzDate, dateStamp } = isoNow();
	const { signedHeaders, canonicalRequest } = buildCanonicalRequest({
		method: "POST",
		path,
		host,
		amzDate,
		target,
		payload,
	});
	const authorization = buildAuthHeader({
		accessKey,
		secretKey,
		region,
		amzDate,
		dateStamp,
		canonicalRequest,
		signedHeaders,
	});

	const headers = {
		"Content-Type": CONTENT_TYPE,
		"Content-Encoding": CONTENT_ENCODING,
		host,
		"X-Amz-Date": amzDate,
		"X-Amz-Target": target,
		Authorization: authorization,
	};

	const response = await axios.post(url, payload, {
		headers,
		timeout: 10000,
	});
	return response.data;
}

async function postToAmazon(post) {
	const partnerTag = requiredEnv("AMAZON_PARTNER_TAG");
	const accessKey = requiredEnv("AMAZON_PAAPI_ACCESS_KEY");
	const secretKey = requiredEnv("AMAZON_PAAPI_SECRET_KEY");
	const marketplace = process.env.AMAZON_MARKETPLACE || "www.amazon.com";
	const region = process.env.AMAZON_PAAPI_REGION || DEFAULT_REGION;
	const host = process.env.AMAZON_PAAPI_HOST || DEFAULT_HOST;

	const asin = extractAsin(post);
	const keywords = extractSearchKeywords(post);
	if (!asin && !keywords) {
		throw new Error("Amazon posting requires an ASIN or search keywords");
	}

	const requestBody = {
		PartnerTag: partnerTag,
		PartnerType: "Associates",
		Marketplace: marketplace,
	};

	let mode = "GetItems";
	if (asin) {
		requestBody.ItemIds = [asin];
	} else {
		mode = "SearchItems";
		requestBody.Keywords = keywords;
		requestBody.SearchIndex = post.amazonSearchIndex || "All";
	}

	let data;
	try {
		data = await callPaapi({
			mode,
			body: requestBody,
			host,
			region,
			accessKey,
			secretKey,
		});
	} catch (error) {
		const apiMessage = error.response?.data?.Errors?.map((e) => e.Message).join(
			"; ",
		);
		const reason = apiMessage || error.message || "Unknown Amazon API error";
		throw new Error(`Amazon request failed: ${reason}`);
	}

	const item = data.ItemsResult?.Items?.[0] || data.SearchResult?.Items?.[0];
	if (!item) {
		return {
			status: "no_results",
			mode,
			asinAttempted: asin,
			keywordsAttempted: mode === "SearchItems" ? keywords : undefined,
			response: data,
		};
	}

	const resolvedAsin = item.ASIN || asin;
	const link = buildAmazonLink({
		asin: resolvedAsin,
		partnerTag,
		marketplace,
		utm: post.amazonUtm,
	});

	return {
		status: "success",
		mode,
		asin: resolvedAsin,
		link,
		title: item.ItemInfo?.Title?.DisplayValue || post.title,
		price: item.Offers?.Listings?.[0]?.Price?.DisplayAmount,
		image: item.Images?.Primary?.Medium?.URL,
		raw: data,
	};
}

module.exports = postToAmazon;
