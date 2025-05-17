/** @format */

import chokidar from "chokidar";
import { readFile } from "fs/promises";
import { exec } from "child_process";
import { promisify } from "util";

const run = promisify(exec);
const QUEUE_PATH = "./config/queued.json";

// Load and parse the queue file
async function getQueuedPosts() {
	try {
		const data = await readFile(QUEUE_PATH, "utf-8");
		return JSON.parse(data);
	} catch (error) {
		console.error("Error reading queue:", error);
		return [];
	}
}

// Run the appropriate script for each post type
async function runScriptForPost(post) {
	const { type, id, data } = post;

	const scriptMap = {
		reddit: "post-to-reddit.sh",
		x: "post-to-x.sh",
		pinterest: "post-to-pinterest.sh",
		facebook: "post-to-facebook.sh",
		tumblr: "post-to-tumblr.sh",
		linkedin: "post-to-linkedin.sh",
		kofi: "post-to-kofi.sh",
		devto: "post-to-devto.sh",
		hashnode: "post-to-hashnode.sh",
		producthunt: "post-to-producthunt.sh",
		discord: "post-to-discord.sh",
		onlyfans: "post-to-onlyfans.sh",
		amazon: "post-to-amazon.sh",
	};

	const script = scriptMap[type];
	if (!script) {
		console.warn(`No script mapped for type: ${type}`);
		return;
	}

	try {
		const { stdout, stderr } = await run(
			`sh ./scripts/${script} '${JSON.stringify(data)}'`
		);
		console.log(`[${type.toUpperCase()}][ID:${id}]`, stdout || stderr);
	} catch (err) {
		console.error(`[${type.toUpperCase()}][ID:${id}] Script error:`, err);
	}
}

// Watch queue for changes and trigger execution
function watchQueue() {
	console.log("👀 Watching queue for updates...");
	chokidar.watch(QUEUE_PATH).on("change", async () => {
		const posts = await getQueuedPosts();
		for (const post of posts) {
			if (!post.sent) {
				await runScriptForPost(post);
				post.sent = true;
			}
		}
	});
}

watchQueue();
