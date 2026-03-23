import axios from "axios";
import crypto from "crypto";

export const REQUIREMENTS = {
  x: {
    credentials: ["apiKey", "apiSecret", "accessToken", "accessSecret"],
    metadata: [],
  },
  facebook: {
    credentials: ["accessToken"],
    metadata: ["pageId"],
  },
  instagram: {
    credentials: ["accessToken"],
    metadata: ["accountId"],
  },
  threads: {
    credentials: ["accessToken"],
    metadata: ["accountId"],
  },
  devto: {
    credentials: ["apiKey"],
    metadata: [],
  },
  pinterest: {
    credentials: [],
    metadata: [],
  },
  substack: {
    credentials: [],
    metadata: ["publicationUrl"],
  },
};

export const isMissing = (value) => {
  if (value === null || value === undefined) return true;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return true;
    if (/^(replace|todo|changeme)/i.test(trimmed)) return true;
  }
  return false;
};

function percentEncode(value) {
  return encodeURIComponent(String(value)).replace(
    /[!'()*]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
  );
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
  const signatureBaseParams = { ...oauthParams, ...params };
  const paramString = Object.keys(signatureBaseParams)
    .sort()
    .filter((key) => signatureBaseParams[key] !== undefined)
    .map((key) => `${percentEncode(key)}=${percentEncode(signatureBaseParams[key])}`)
    .join("&");
  const baseString = [
    method.toUpperCase(),
    percentEncode(url),
    percentEncode(paramString),
  ].join("&");
  const signingKey = `${percentEncode(consumerSecret)}&${percentEncode(tokenSecret)}`;
  const signature = crypto.createHmac("sha1", signingKey).update(baseString).digest("base64");
  return (
    "OAuth " +
    Object.keys({ ...oauthParams, oauth_signature: signature })
      .sort()
      .map((key) =>
        `${percentEncode(key)}="${percentEncode(
          key === "oauth_signature" ? signature : oauthParams[key],
        )}"`,
      )
      .join(", ")
  );
}

function buildResult({
  account,
  platform,
  status,
  summary,
  detail,
  errorCode = null,
  errorSubcode = null,
}) {
  return {
    platform,
    accountId: account?.id || null,
    label: account?.label || `${platform}:${account?.id || "default"}`,
    status,
    summary,
    detail,
    errorCode,
    errorSubcode,
  };
}

async function validateXCredentials(account) {
  const creds = account?.credentials || {};
  const url = "https://api.twitter.com/1.1/account/verify_credentials.json";
  const auth = buildOAuthHeader({
    method: "GET",
    url,
    consumerKey: creds.apiKey,
    consumerSecret: creds.apiSecret,
    token: creds.accessToken,
    tokenSecret: creds.accessSecret,
  });
  try {
    const response = await axios.get(url, {
      headers: { Authorization: auth, "User-Agent": "PostPunkBot" },
      timeout: 10000,
    });
    return buildResult({
      account,
      platform: "x",
      status: "healthy",
      summary: "Validated",
      detail: `user @${response.data?.screen_name || "unknown"}`,
    });
  } catch (error) {
    const apiErrors = error.response?.data?.errors;
    const reason = Array.isArray(apiErrors)
      ? apiErrors.map((e) => e.message).join("; ")
      : error.response?.data?.detail || error.response?.data?.error || error.message;
    return buildResult({
      account,
      platform: "x",
      status: "error",
      summary: String(reason).includes("503") ? "Provider unavailable" : "Invalid credential",
      detail: String(reason),
    });
  }
}

function graphErrorSummary(message = "") {
  const lower = String(message).toLowerCase();
  if (lower.includes("expired")) return "Expired token";
  if (lower.includes("permissions")) return "Missing permission";
  return "Invalid credential";
}

async function validateFacebookCredentials(account) {
  const token = account?.credentials?.accessToken;
  try {
    const response = await axios.get("https://graph.facebook.com/v20.0/me", {
      params: { fields: "id,name", access_token: token },
      timeout: 10000,
    });
    return buildResult({
      account,
      platform: "facebook",
      status: "healthy",
      summary: "Validated",
      detail: `id ${response.data?.id || "unknown"}`,
    });
  } catch (error) {
    const graphError = error.response?.data?.error || {};
    const reason = graphError.message || graphError.type || error.message;
    return buildResult({
      account,
      platform: "facebook",
      status: "error",
      summary: graphErrorSummary(reason),
      detail: String(reason),
      errorCode: graphError.code ?? null,
      errorSubcode: graphError.error_subcode ?? null,
    });
  }
}

async function validateInstagramCredentials(account) {
  const token = account?.credentials?.accessToken;
  const accountId = account?.metadata?.accountId;
  try {
    const response = await axios.get(`https://graph.facebook.com/v20.0/${accountId}`, {
      params: { fields: "id,username", access_token: token },
      timeout: 10000,
    });
    return buildResult({
      account,
      platform: "instagram",
      status: "healthy",
      summary: "Validated",
      detail: `instagram @${response.data?.username || response.data?.id || "unknown"}`,
    });
  } catch (error) {
    const graphError = error.response?.data?.error || {};
    const reason = graphError.message || graphError.type || error.message;
    return buildResult({
      account,
      platform: "instagram",
      status: "error",
      summary: graphErrorSummary(reason),
      detail: String(reason),
      errorCode: graphError.code ?? null,
      errorSubcode: graphError.error_subcode ?? null,
    });
  }
}

async function validateThreadsCredentials(account) {
  const token = account?.credentials?.accessToken;
  const accountId = account?.metadata?.accountId;
  try {
    const response = await axios.get(`https://graph.threads.net/v1.0/${accountId}`, {
      params: {
        fields: "id,username,threads_profile_picture_url",
        access_token: token,
      },
      timeout: 10000,
    });
    return buildResult({
      account,
      platform: "threads",
      status: "healthy",
      summary: "Validated",
      detail: `threads @${response.data?.username || response.data?.id || "unknown"}`,
    });
  } catch (error) {
    const graphError = error.response?.data?.error || {};
    const reason = graphError.message || graphError.type || error.message;
    return buildResult({
      account,
      platform: "threads",
      status: "error",
      summary: graphErrorSummary(reason),
      detail: String(reason),
      errorCode: graphError.code ?? null,
      errorSubcode: graphError.error_subcode ?? null,
    });
  }
}

async function validateDevtoCredentials(account) {
  const apiKey = account?.credentials?.apiKey;
  try {
    const response = await axios.get("https://dev.to/api/users/me", {
      headers: {
        "api-key": apiKey,
        accept: "application/vnd.forem.api-v1+json",
        "user-agent": "PostPunkBot/1.0",
      },
      timeout: 10000,
    });
    return buildResult({
      account,
      platform: "devto",
      status: "healthy",
      summary: "Validated",
      detail: `dev.to @${response.data?.username || response.data?.name || "unknown"}`,
    });
  } catch (error) {
    const reason =
      error.response?.data?.error || error.response?.data?.message || error.message;
    return buildResult({
      account,
      platform: "devto",
      status: "error",
      summary: "Invalid credential",
      detail: String(reason),
    });
  }
}

async function validatePinterestCredentials(account) {
  const issues = [];
  if (isMissing(process.env.PINTEREST_USERNAME)) issues.push("PINTEREST_USERNAME");
  if (isMissing(process.env.PINTEREST_PASSWORD)) issues.push("PINTEREST_PASSWORD");
  if (isMissing(process.env.PINTEREST_LOGIN_EMAIL)) issues.push("PINTEREST_LOGIN_EMAIL");
  if (isMissing(process.env.PINTEREST_BOARD_NAME)) issues.push("PINTEREST_BOARD_NAME");
  if (isMissing(process.env.PINTEREST_SESSION_STATE_PATH)) issues.push("PINTEREST_SESSION_STATE_PATH");
  if (issues.length > 0) {
    return buildResult({
      account,
      platform: "pinterest",
      status: "error",
      summary: "Missing credentials",
      detail: `missing env [${issues.join(", ")}]`,
    });
  }
  return buildResult({
    account,
    platform: "pinterest",
    status: "healthy",
    summary: "Ready for Playwright login",
    detail: "playwright credentials present",
  });
}

async function validateSubstackCredentials(account) {
  const publicationUrl = account?.metadata?.publicationUrl;
  const newPostUrl = account?.metadata?.newPostUrl;
  return buildResult({
    account,
    platform: "substack",
    status: "healthy",
    summary: "Ready for browser posting",
    detail: newPostUrl
      ? `editor ${newPostUrl}`
      : `publication ${publicationUrl}`,
  });
}

async function liveValidate(platform, account) {
  if (platform === "x") return validateXCredentials(account);
  if (platform === "facebook") return validateFacebookCredentials(account);
  if (platform === "instagram") return validateInstagramCredentials(account);
  if (platform === "threads") return validateThreadsCredentials(account);
  if (platform === "devto") return validateDevtoCredentials(account);
  if (platform === "pinterest") return validatePinterestCredentials(account);
  if (platform === "substack") return validateSubstackCredentials(account);
  return buildResult({
    account,
    platform,
    status: "unknown",
    summary: "No live check implemented",
    detail: "No live validation logic implemented for this platform",
  });
}

export async function runPlatformHealthChecks(accounts, { live = false } = {}) {
  const safeAccounts = Array.isArray(accounts) ? accounts : [];
  const results = [];

  for (const account of safeAccounts) {
    const platform = String(account?.platform || "").toLowerCase();
    const requirement = REQUIREMENTS[platform];
    const accountLabel = `${platform}:${account?.id || "unknown"}`;

    if (!requirement) {
      results.push({
        platform,
        accountId: account?.id || null,
        label: account?.label || accountLabel,
        status: "warning",
        summary: "No health rules",
        detail: "No health-check rules yet for this platform",
        errorCode: null,
        errorSubcode: null,
      });
      continue;
    }

    const missingCreds = requirement.credentials.filter((key) =>
      isMissing(account?.credentials?.[key]),
    );
    const missingMeta = requirement.metadata.filter((key) =>
      isMissing(account?.metadata?.[key]),
    );

    if (missingCreds.length > 0 || missingMeta.length > 0) {
      const parts = [];
      if (missingCreds.length) parts.push(`credentials[${missingCreds.join(", ")}]`);
      if (missingMeta.length) parts.push(`metadata[${missingMeta.join(", ")}]`);
      results.push({
        platform,
        accountId: account?.id || null,
        label: account?.label || accountLabel,
        status: "error",
        summary: "Missing configuration",
        detail: `missing ${parts.join(" and ")}`,
        errorCode: null,
        errorSubcode: null,
      });
      continue;
    }

    if (!live) {
      results.push({
        platform,
        accountId: account?.id || null,
        label: account?.label || accountLabel,
        status: "healthy",
        summary: "Configured",
        detail: "Required fields present",
        errorCode: null,
        errorSubcode: null,
      });
      continue;
    }

    results.push(await liveValidate(platform, account));
  }

  return {
    checkedAt: new Date().toISOString(),
    live,
    results,
  };
}
