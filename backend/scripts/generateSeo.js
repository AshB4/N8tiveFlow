/** @format */

import { writeFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { generateSeoPayload, getDryRunPayload } from "../utils/seoGeneration.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function parseArgs(argv) {
  const args = {
    productName: "",
    productType: "",
    audience: "",
    provider: "",
    model: "",
    dryRun: false,
    out: "",
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--product-name") args.productName = argv[i + 1] || "";
    if (arg === "--product-type") args.productType = argv[i + 1] || "";
    if (arg === "--audience") args.audience = argv[i + 1] || "";
    if (arg === "--provider") args.provider = argv[i + 1] || "";
    if (arg === "--model") args.model = argv[i + 1] || "";
    if (arg === "--out") args.out = argv[i + 1] || "";
    if (arg === "--dry-run") args.dryRun = true;
  }

  return args;
}

function validateInput(args) {
  if (!args.productName || !args.productType || !args.audience) {
    throw new Error(
      "Usage: node scripts/generateSeo.js --product-name \"...\" --product-type \"...\" --audience \"...\" [--provider ollama|openai] [--model ...] [--dry-run] [--out path]",
    );
  }
}

async function maybeWriteOutput(result, outPath) {
  if (!outPath) return;
  const absolutePath = path.isAbsolute(outPath)
    ? outPath
    : path.join(__dirname, "..", outPath);
  await writeFile(absolutePath, `${JSON.stringify(result, null, 2)}\n`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  validateInput(args);

  const input = {
    productName: args.productName,
    productType: args.productType,
    audience: args.audience,
  };

  const options = {
    provider: args.provider || undefined,
    model: args.model || undefined,
  };

  const result = args.dryRun
    ? getDryRunPayload(input, options)
    : await generateSeoPayload(input, options);

  await maybeWriteOutput(result, args.out);
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
