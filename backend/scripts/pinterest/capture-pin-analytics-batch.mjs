import "dotenv/config";
import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import { getPinterestPinMappings, initLocalDb } from "../../utils/localDb.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SINGLE_CAPTURE_SCRIPT = path.join(__dirname, "capture-pin-analytics.mjs");

function parseArgs(argv = []) {
  let useMappings = false;
  let limit = 0;
  let timeoutMs = 150_000;
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--all-mappings") {
      useMappings = true;
    } else if (arg === "--limit" && argv[i + 1]) {
      limit = Number.parseInt(argv[++i], 10) || 0;
    } else if (arg === "--timeout-ms" && argv[i + 1]) {
      timeoutMs = Number.parseInt(argv[++i], 10) || 120_000;
    }
  }
  return { useMappings, limit, timeoutMs };
}

function collectTargets(mappings = [], limit = 0) {
  const unique = [];
  const seen = new Set();
  for (const mapping of mappings) {
    if (!mapping?.pinUrl && !mapping?.pinId) continue;
    const pinUrl = mapping.pinUrl || `https://www.pinterest.com/pin/${mapping.pinId}/`;
    const key = `${mapping.postId || ""}::${pinUrl}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push({
      postId: mapping.postId || null,
      pinUrl,
    });
  }
  return limit > 0 ? unique.slice(0, limit) : unique;
}

async function runSingleCapture({ postId, pinUrl }, timeoutMs) {
  return new Promise((resolve) => {
    const args = [SINGLE_CAPTURE_SCRIPT, "--url", pinUrl];
    if (postId) {
      args.push("--post-id", postId);
    }

    const child = spawn(process.execPath, args, {
      stdio: ["ignore", "pipe", "pipe"],
      env: process.env,
    });

    let stdout = "";
    let stderr = "";
    let settled = false;

    const finish = (result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      resolve(result);
    };

    const timeout = setTimeout(() => {
      child.kill("SIGTERM");
      finish({
        postId: postId || null,
        pinUrl,
        status: "timeout",
        timeoutMs,
        stdout: stdout.slice(-2000),
        stderr: stderr.slice(-2000),
      });
    }, timeoutMs);

    child.stdout.on("data", (chunk) => {
      stdout += String(chunk);
    });

    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });

    child.on("error", (error) => {
      finish({
        postId: postId || null,
        pinUrl,
        status: "spawn_failed",
        error: error.message,
      });
    });

    child.on("close", (code, signal) => {
      const trimmed = stdout.trim();
      if (code === 0 && trimmed) {
        try {
          const parsed = JSON.parse(trimmed);
          finish({
            postId: postId || null,
            pinUrl,
            status: "ok",
            code,
            signal,
            snapshot: Array.isArray(parsed) ? parsed[0] || null : parsed,
          });
          return;
        } catch {
          finish({
            postId: postId || null,
            pinUrl,
            status: "ok_non_json",
            code,
            signal,
            stdout: trimmed.slice(-4000),
          });
          return;
        }
      }
      finish({
        postId: postId || null,
        pinUrl,
        status: code === 0 ? "no_output" : "failed",
        code,
        signal,
        stdout: trimmed.slice(-2000),
        stderr: stderr.trim().slice(-2000),
      });
    });
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  await initLocalDb();

  if (!args.useMappings) {
    console.error("Batch runner currently supports only --all-mappings.");
    process.exit(1);
  }

  const mappings = await getPinterestPinMappings();
  const targets = collectTargets(mappings, args.limit);
  if (targets.length === 0) {
    console.log(JSON.stringify({ targets: 0, results: [] }, null, 2));
    return;
  }

  const results = [];
  for (const target of targets) {
    // One child process per pin keeps the capture path isolated and predictable.
    results.push(await runSingleCapture(target, args.timeoutMs));
  }

  console.log(
    JSON.stringify(
      {
        targets: targets.length,
        completed: results.filter((entry) => entry.status === "ok").length,
        results,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error("Failed to run Pinterest metrics batch:", error);
  process.exit(1);
});
