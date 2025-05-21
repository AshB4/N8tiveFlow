/** @format */

const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");

async function uploadVideoToTikTok(videoPath, caption) {
	const browser = await chromium.launch({ headless: false }); // Use true after session is saved
	const context = await browser.newContext({
		storageState: "./auth/tiktok-auth.json", // persistent login
	});

	const page = await context.newPage();
	await page.goto("https://www.tiktok.com/upload", {
		waitUntil: "networkidle",
	});

	// Upload video
	const input = await page.waitForSelector('input[type="file"]');
	await input.setInputFiles(videoPath);

	// Add caption
	const captionBox = await page.waitForSelector(
		'[placeholder="Describe your video"]'
	);
	await captionBox.fill(caption);

	// Wait for processing
	await page.waitForTimeout(5000);

	// Click Post
	const postButton = await page.waitForSelector('button:has-text("Post")');
	await postButton.click();

	await page.waitForTimeout(3000);
	await browser.close();
}

// === MAIN RUNNER ===
async function run() {
	const raw = fs.readFileSync("./queue/videoQueue.json", "utf8");
	const posts = JSON.parse(raw);

	for (const post of posts) {
		if (post.platform === "tiktok") {
			const fullPath = path.resolve(post.videoPath);
			const caption = `${post.caption} ${post.hashtags?.join(" ") || ""}`;
			await uploadVideoToTikTok(fullPath, caption);
		}
	}
}

run();
