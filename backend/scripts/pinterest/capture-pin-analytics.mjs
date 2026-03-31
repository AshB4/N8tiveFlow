import "dotenv/config";
import fs from "fs";
import os from "os";
import path from "path";
import { promises as fsp } from "fs";
import { execFile } from "child_process";
import { promisify } from "util";
import { fileURLToPath } from "url";
import { chromium } from "playwright";
import {
  appendPinterestMetricsSnapshot,
  getPinterestPinMappings,
  initLocalDb,
  listPostedLog,
  savePinterestPinMappings,
} from "../../utils/localDb.mjs";

const execFileAsync = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BACKEND_ROOT = path.join(__dirname, "../..");
const DEFAULT_PROFILE_DIR = path.join(BACKEND_ROOT, "config", "pinterest-chrome-profile");
const DEFAULT_STATE_PATH = path.join(BACKEND_ROOT, "config", "pinterest-state.json");

function boolFromEnv(name, fallback = true) {
  const value = process.env[name];
  if (value === undefined) return fallback;
  return !["0", "false", "off", "no"].includes(String(value).toLowerCase());
}

function getDefaultChromeUserDataDir() {
  return path.join(
    os.homedir(),
    "Library",
    "Application Support",
    "Google",
    "Chrome",
  );
}

function getPinterestBrowserOptions() {
  const channel = process.env.PINTEREST_BROWSER_CHANNEL || "chrome";
  const executablePath = process.env.PINTEREST_EXECUTABLE_PATH || undefined;
  const headless = boolFromEnv("PINTEREST_METRICS_HEADLESS", false);
  const useSystemProfile = boolFromEnv("PINTEREST_USE_SYSTEM_CHROME_PROFILE", false);
  const systemProfileDir = getDefaultChromeUserDataDir();
  const profileDir =
    process.env.PINTEREST_PROFILE_DIR ||
    (useSystemProfile && fs.existsSync(systemProfileDir) ? systemProfileDir : DEFAULT_PROFILE_DIR);
  const profileName = process.env.PINTEREST_CHROME_PROFILE_NAME || "Default";
  const statePath = process.env.PINTEREST_SESSION_STATE_PATH || DEFAULT_STATE_PATH;
  return { channel, executablePath, headless, profileDir, profileName, statePath };
}

function parseArgs(argv = []) {
  const urls = [];
  const postIds = [];
  let useMappings = false;
  let save = true;
  let discoverProfile = "";
  let discoverLimit = 20;
  let autoMap = false;
  let captureDiscovered = false;
  let captureLimit = 0;
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--url" && argv[i + 1]) {
      urls.push(argv[++i]);
    } else if (arg === "--post-id" && argv[i + 1]) {
      postIds.push(argv[++i]);
    } else if (arg === "--all-mappings") {
      useMappings = true;
    } else if (arg === "--discover-profile" && argv[i + 1]) {
      discoverProfile = argv[++i];
    } else if (arg === "--discover-limit" && argv[i + 1]) {
      discoverLimit = Number.parseInt(argv[++i], 10) || 20;
    } else if (arg === "--auto-map") {
      autoMap = true;
    } else if (arg === "--capture-discovered") {
      captureDiscovered = true;
    } else if (arg === "--capture-limit" && argv[i + 1]) {
      captureLimit = Number.parseInt(argv[++i], 10) || 0;
    } else if (arg === "--no-save") {
      save = false;
    }
  }
  return {
    urls,
    postIds,
    useMappings,
    save,
    discoverProfile,
    discoverLimit,
    autoMap,
    captureDiscovered,
    captureLimit,
  };
}

function extractPinId(value = "") {
  const match = String(value).match(/\/pin\/(\d+)/);
  return match ? match[1] : "";
}

function buildAnalyticsUrl(input) {
  const raw = String(input || "").trim();
  if (!raw) return "";
  if (/\/analytics\b/i.test(raw)) return raw;
  const pinId = extractPinId(raw) || raw;
  return `https://www.pinterest.com/pin/${pinId}/analytics?content_type=all&device_type=all&source_type=all&aggregation=last30d`;
}

function buildPinUrl(input) {
  const pinId = extractPinId(input) || String(input || "").trim();
  return pinId ? `https://www.pinterest.com/pin/${pinId}/` : "";
}

function decodeHtmlEntities(value = "") {
  return String(value || "")
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function cleanPinTitle(value = "") {
  return decodeHtmlEntities(value)
    .replace(/\s+pin page$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeMatchText(value = "") {
  return cleanPinTitle(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseNumberToken(value = "") {
  const cleaned = String(value).replace(/[^0-9.kKmMbB-]/g, "");
  if (!cleaned) return null;
  const suffix = cleaned.slice(-1).toLowerCase();
  const base = Number.parseFloat(cleaned);
  if (!Number.isFinite(base)) return null;
  if (suffix === "k") return Math.round(base * 1000);
  if (suffix === "m") return Math.round(base * 1_000_000);
  if (suffix === "b") return Math.round(base * 1_000_000_000);
  return Math.round(base);
}

function parsePublishedAt(text = "") {
  const match = String(text).match(/Published on ([A-Za-z]+ \d{1,2}, \d{4})/i);
  if (!match) return null;
  const parsed = new Date(match[1]);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function parseTitleFromBodyText(text = "") {
  const match = String(text).match(/Promote\s+([\s\S]*?)\s+Published on [A-Za-z]+ \d{1,2}, \d{4}/i);
  if (!match?.[1]) return "";
  return cleanPinTitle(match[1].replace(/\s+/g, " ").trim());
}

function findMetricValue(text, label) {
  const lines = String(text)
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (!new RegExp(`^${label}$`, "i").test(line)) continue;
    for (let j = i + 1; j < Math.min(i + 4, lines.length); j += 1) {
      const parsed = parseNumberToken(lines[j]);
      if (parsed !== null) return parsed;
    }
  }
  const inline = String(text).match(new RegExp(`${label}\\s+([0-9.,kKmMbB]+)`, "i"));
  return inline ? parseNumberToken(inline[1]) : null;
}

function parseMetrics(text = "") {
  return {
    impressions: findMetricValue(text, "Impressions"),
    pinClicks: findMetricValue(text, "Pin clicks"),
    outboundClicks: findMetricValue(text, "Outbound clicks"),
    saves: findMetricValue(text, "Saves"),
    comments: findMetricValue(text, "Comments"),
    reactions: findMetricValue(text, "Reactions"),
    profileVisits: findMetricValue(text, "Profile visits"),
    follows: findMetricValue(text, "Follows"),
  };
}

function inferConfidence(metrics, captureMethod) {
  const found = Object.values(metrics).filter((value) => value !== null).length;
  if (captureMethod === "dom") return Math.min(0.99, 0.45 + found * 0.08);
  return Math.min(0.8, 0.25 + found * 0.08);
}

async function ocrScreenshot(page) {
  const tempPath = path.join(os.tmpdir(), `postpunk-pinterest-metrics-${Date.now()}.png`);
  await page.screenshot({ path: tempPath, fullPage: true });
  try {
    const { stdout } = await execFileAsync("tesseract", [tempPath, "stdout"], {
      maxBuffer: 4 * 1024 * 1024,
    });
    return stdout || "";
  } finally {
    await fsp.unlink(tempPath).catch(() => {});
  }
}

async function clickCreatedTab(page) {
  const selectors = [
    'a[href*="_created"]',
    'a:has-text("Created")',
    'button:has-text("Created")',
    '[role="tab"]:has-text("Created")',
    'div[role="button"]:has-text("Created")',
  ];
  for (const selector of selectors) {
    const locator = page.locator(selector).first();
    const count = await locator.count().catch(() => 0);
    if (!count) continue;
    await locator.click({ timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(1500);
    return true;
  }
  return false;
}

async function collectPinCards(page) {
  return page.evaluate(() => {
    const anchors = Array.from(document.querySelectorAll('a[href*="/pin/"]'));
    const rows = [];
    for (const anchor of anchors) {
      const href = anchor.getAttribute("href") || "";
      const match = href.match(/\/pin\/(\d+)/);
      if (!match) continue;
      const pinId = match[1];
      const url = href.startsWith("http") ? href : `https://www.pinterest.com${href}`;
      const textCandidates = [
        anchor.getAttribute("title"),
        anchor.getAttribute("aria-label"),
        anchor.textContent,
        anchor.querySelector("img")?.getAttribute("alt"),
        anchor.closest('[data-test-id], [role="listitem"], div')?.textContent,
      ]
        .map((value) => String(value || "").replace(/\s+/g, " ").trim())
        .filter(Boolean);
      const titleSeen = textCandidates.find((value) => value.length > 5) || "";
      rows.push({
        pinId,
        pinUrl: `https://www.pinterest.com/pin/${pinId}/`,
        sourceUrl: url,
        titleSeen,
      });
    }
    return rows;
  });
}

async function discoverPins(page, profileUrl, limit = 20) {
  const targetUrl = String(profileUrl || process.env.PINTEREST_PROFILE_URL || "").trim();
  if (!targetUrl) {
    throw new Error("Missing Pinterest profile URL for discovery");
  }
  await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.waitForTimeout(2500);
  await clickCreatedTab(page);

  const collected = new Map();
  for (let attempt = 0; attempt < 8 && collected.size < limit; attempt += 1) {
    const rows = await collectPinCards(page);
    for (const row of rows) {
      if (!row?.pinId) continue;
      if (!collected.has(row.pinId)) {
        collected.set(row.pinId, { ...row, titleSeen: cleanPinTitle(row.titleSeen) });
      } else if (!collected.get(row.pinId).titleSeen && row.titleSeen) {
        collected.set(row.pinId, { ...row, titleSeen: cleanPinTitle(row.titleSeen) });
      }
    }
    await page.mouse.wheel(0, 2200);
    await page.waitForTimeout(1200);
  }

  return Array.from(collected.values()).slice(0, limit);
}

async function readPinTitle(page) {
  const selectors = [
    'h1[data-test-id]',
    'h1',
    'div[data-test-id="closeup-title"]',
    'div[data-test-id="pinTitle"]',
  ];
  for (const selector of selectors) {
    const value = await page.locator(selector).first().innerText().catch(() => "");
    const cleaned = cleanPinTitle(value);
    if (cleaned && cleaned.toLowerCase() !== "pinterest") return cleaned;
  }
  return "";
}
async function withPinterestPage(browserInstance, browserOptions, fn) {
  const context = await browserInstance.newContext({
    storageState: fs.existsSync(browserOptions.statePath) ? browserOptions.statePath : undefined,
    viewport: { width: 1440, height: 1200 },
  });
  try {
    const page = await context.newPage();
    return await fn(page);
  } finally {
    await context.close().catch(() => {});
  }
}

async function autoMapPins(discoveredPins = []) {
  const posted = await listPostedLog();
  const pinterestPosts = posted
    .filter((entry) => Array.isArray(entry.platforms) && entry.platforms.includes("pinterest"))
    .map((entry) => ({
      postId: entry.id,
      title: entry.title || "",
      normalizedTitle: normalizeMatchText(entry.title || ""),
      processedAt: entry.processedAt || entry.postedAt || entry.completedAt || null,
    }))
    .sort((a, b) => new Date(b.processedAt || 0) - new Date(a.processedAt || 0));

  const currentMappings = await getPinterestPinMappings();
  const existingByPinId = new Map(
    currentMappings
      .filter((entry) => entry?.pinId)
      .map((entry) => [String(entry.pinId), entry]),
  );
  const existingByPostId = new Map(
    currentMappings
      .filter((entry) => entry?.postId)
      .map((entry) => [String(entry.postId), entry]),
  );
  const nextMappings = [...currentMappings];
  const usedPostIds = new Set(currentMappings.map((entry) => String(entry.postId || "")));
  const matches = [];

  for (const pin of discoveredPins) {
    const existingMapping = existingByPinId.get(String(pin.pinId));
    if (existingMapping) {
      matches.push({
        ...pin,
        postId: existingMapping.postId || null,
        postTitle: existingMapping.titleSeen || null,
        matchType: existingMapping.postId ? "existing_mapping" : "unmatched",
      });
      continue;
    }
    const normalizedTitle = normalizeMatchText(pin.titleSeen);
    if (!normalizedTitle) {
      matches.push({ ...pin, matchType: "unmatched", postId: null });
      continue;
    }
    const exact = pinterestPosts.find(
      (entry) => !usedPostIds.has(String(entry.postId)) && entry.normalizedTitle === normalizedTitle,
    );
    if (!exact) {
      matches.push({ ...pin, matchType: "unmatched", postId: null });
      continue;
    }
    usedPostIds.add(String(exact.postId));
    const mapping = {
      postId: exact.postId,
      pinId: pin.pinId,
      pinUrl: buildPinUrl(pin.pinId),
      analyticsUrl: buildAnalyticsUrl(pin.pinId),
      titleSeen: cleanPinTitle(pin.titleSeen),
      updatedAt: new Date().toISOString(),
    };
    const priorByPostId = existingByPostId.get(String(mapping.postId));
    const deduped = nextMappings.filter(
      (entry) =>
        String(entry.postId || "") !== String(mapping.postId) &&
        String(entry.pinId || "") !== String(mapping.pinId) &&
        String(entry.pinId || "") !== String(priorByPostId?.pinId || ""),
    );
    deduped.push(mapping);
    nextMappings.length = 0;
    nextMappings.push(...deduped);
    existingByPinId.set(String(mapping.pinId), mapping);
    existingByPostId.set(String(mapping.postId), mapping);
    matches.push({ ...pin, postId: exact.postId, postTitle: exact.title, matchType: "exact_title" });
  }

  await savePinterestPinMappings(nextMappings);
  return {
    matches,
    savedMappings: nextMappings,
    matchedTargets: matches
      .filter(
        (entry) =>
          (entry.matchType === "exact_title" || entry.matchType === "existing_mapping") &&
          entry.postId &&
          entry.pinId,
      )
      .map((entry) => ({
        postId: entry.postId,
        pinUrl: entry.pinId,
      })),
  };
}

async function captureOne(page, { postId = null, pinUrl }) {
  const analyticsUrl = buildAnalyticsUrl(pinUrl);
  await page.goto(analyticsUrl, { waitUntil: "domcontentloaded", timeout: 20_000 });
  await page.waitForTimeout(2500);

  const titleSeen = await readPinTitle(page);
  const bodyText = await page.locator("body").innerText().catch(() => "");
  let captureMethod = "dom";
  let parsedMetrics = parseMetrics(bodyText);
  let sourceText = bodyText;

  const metricFound = Object.values(parsedMetrics).some((value) => value !== null);
  if (!metricFound) {
    const ocrText = await ocrScreenshot(page);
    const ocrMetrics = parseMetrics(ocrText);
    if (Object.values(ocrMetrics).some((value) => value !== null)) {
      captureMethod = "ocr";
      parsedMetrics = ocrMetrics;
      sourceText = ocrText;
    }
  }

  const pinId = extractPinId(page.url()) || extractPinId(pinUrl);
  return {
    postId,
    platform: "pinterest",
    pinId: pinId || null,
    pinUrl: pinId ? `https://www.pinterest.com/pin/${pinId}/` : pinUrl,
    analyticsUrl: page.url(),
    titleSeen: titleSeen || parseTitleFromBodyText(sourceText) || null,
    publishedAt: parsePublishedAt(sourceText),
    capturedAt: new Date().toISOString(),
    dateRange: /last30d/i.test(page.url()) ? "last30d" : null,
    metrics: parsedMetrics,
    captureMethod,
    confidence: Number(inferConfidence(parsedMetrics, captureMethod).toFixed(2)),
    rawExtractPreview: sourceText.slice(0, 2000),
  };
}

function printAndExit(payload, code = 0) {
  const output = typeof payload === "string" ? payload : JSON.stringify(payload, null, 2);
  console.log(output);
  process.exit(code);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  await initLocalDb();

  const browser = getPinterestBrowserOptions();
  const browserInstance = await chromium.launch({
    channel: browser.channel,
    executablePath: browser.executablePath,
    headless: browser.headless,
  });
  let targets = args.urls.map((url, index) => ({
    pinUrl: url,
    postId: args.postIds[index] || null,
  }));

  try {
    if (args.discoverProfile) {
      const discovered = await withPinterestPage(browserInstance, browser, (page) =>
        discoverPins(page, args.discoverProfile, args.discoverLimit),
      );
      if (args.autoMap) {
        const result = await autoMapPins(discovered);
        if (args.captureDiscovered) {
          const discoveredResults = [];
          const captureTargets =
            args.captureLimit > 0
              ? result.matchedTargets.slice(0, args.captureLimit)
              : result.matchedTargets;
          for (const target of captureTargets) {
            try {
              const snapshot = await withPinterestPage(browserInstance, browser, (page) =>
                captureOne(page, target),
              );
              discoveredResults.push(snapshot);
              if (args.save) {
                await appendPinterestMetricsSnapshot(snapshot);
              }
            } catch (error) {
              discoveredResults.push({
                postId: target.postId || null,
                pinUrl: buildPinUrl(target.pinUrl),
                error: error?.message || String(error),
                status: "capture_failed",
              });
            }
          }
          printAndExit({ ...result, capturedSnapshots: discoveredResults });
          return;
        }
        printAndExit(result);
        return;
      }
      printAndExit(discovered);
      return;
    }

    if (args.useMappings) {
      const mappings = await getPinterestPinMappings();
      targets = targets.concat(
        mappings
          .filter((entry) => entry?.pinUrl || entry?.pinId)
          .map((entry) => ({
            postId: entry.postId || null,
            pinUrl: entry.pinUrl || entry.pinId,
          })),
      );
    }

    const uniqueTargets = [];
    const seen = new Set();
    for (const target of targets) {
      const key = `${target.postId || ""}::${buildAnalyticsUrl(target.pinUrl)}`;
      if (!target.pinUrl || seen.has(key)) continue;
      seen.add(key);
      uniqueTargets.push(target);
    }

    if (uniqueTargets.length === 0) {
      console.log("No Pinterest analytics URLs provided.");
      return;
    }

    const results = [];
    for (const target of uniqueTargets) {
      const snapshot = await withPinterestPage(browserInstance, browser, (page) =>
        captureOne(page, target),
      );
      results.push(snapshot);
      if (args.save) {
        await appendPinterestMetricsSnapshot(snapshot);
      }
    }
    printAndExit(results);
  } finally {
    await browserInstance.close().catch(() => {});
  }
}

main().catch((error) => {
  console.error("Failed to capture Pinterest pin analytics:", error);
  process.exitCode = 1;
});
