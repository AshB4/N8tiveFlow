/** @format */

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const loadBot = (modulePath) => {
        try {
                return require(modulePath);
        } catch (err) {
                if (err.code === "MODULE_NOT_FOUND") {
                        console.warn(`[⚠️] Bot module not found for ${modulePath}, skipping.`);
                        return null;
                }
                throw err;
        }
};

const redditBot = loadBot("./redditBot");
const pinterestBot = loadBot("./pinterestBot");
const tiktokUploader = loadBot("./tiktokUploader");

const ACTIVE_STATUSES = ["approved", "ready", "pending"];

const buildBotPayload = (target) => {
        const { contentItem, metadata = {} } = target;
        const assets = contentItem?.contentAssets ?? [];
        const imageAsset = assets.find((asset) => asset.type === "image");
        const videoAsset = assets.find((asset) => asset.type === "video");

        return {
                id: target.id,
                platform: target.platform,
                title: contentItem?.title,
                body: contentItem?.body,
                status: target.status,
                scheduledAt: target.scheduledAt,
                image: metadata.image || imageAsset?.url,
                altText: metadata.altText || imageAsset?.altText,
                videoPath: metadata.videoPath || videoAsset?.url,
                caption: metadata.caption || contentItem?.title,
                hashtags: metadata.hashtags || [],
        };
};

async function runQueue() {
        const now = new Date();
        const dueTargets = await prisma.platformTarget.findMany({
                where: {
                        scheduledAt: { lte: now },
                        status: { in: ACTIVE_STATUSES },
                },
                include: {
                        contentItem: {
                                include: { contentAssets: true },
                        },
                },
                orderBy: { scheduledAt: "asc" },
        });

        for (const target of dueTargets) {
                const payload = buildBotPayload(target);

                try {
                        if (payload.platform === "reddit" && redditBot) {
                                await redditBot(payload);
                        } else if (payload.platform === "pinterest" && pinterestBot) {
                                await pinterestBot(payload);
                        } else if (payload.platform === "tiktok" && tiktokUploader) {
                                const caption = `${payload.caption} ${payload.hashtags.join(" ")}`.trim();
                                const videoPath = payload.videoPath
                                        ? path.resolve(payload.videoPath)
                                        : undefined;
                                if (!videoPath) {
                                        throw new Error("Missing video path for TikTok upload");
                                }
                                await tiktokUploader(videoPath, caption);
                        } else {
                                console.log(
                                        `[ℹ️] No handler registered for ${payload.platform}, skipping target ${target.id}.`
                                );
                                continue;
                        }

                        await prisma.platformTarget.update({
                                where: { id: target.id },
                                data: { status: "posted" },
                        });

                        console.log(
                                `[✅] Posted to ${payload.platform} at ${new Date().toISOString()}`
                        );
                } catch (err) {
                        await prisma.platformTarget.update({
                                where: { id: target.id },
                                data: { status: "failed" },
                        });

                        console.error(`[❌] Failed to post to ${payload.platform}:`, err);
                }
        }
}

runQueue()
        .catch((err) => {
                console.error("Queue runner encountered an error", err);
        })
        .finally(async () => {
                await prisma.$disconnect();
        });
