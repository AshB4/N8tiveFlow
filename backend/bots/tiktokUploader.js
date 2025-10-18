/** @format */

const { chromium } = require("playwright");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const { PrismaClient } = require("@prisma/client");

let prisma;
const getPrisma = () => {
        if (!prisma) {
                prisma = new PrismaClient();
        }
        return prisma;
};

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

async function processTikTokTargets() {
        const now = new Date();
        const prismaClient = getPrisma();
        const targets = await prismaClient.platformTarget.findMany({
                where: {
                        platform: "tiktok",
                        scheduledAt: { lte: now },
                        status: { in: ["approved", "ready", "pending"] },
                },
                include: {
                        contentItem: { include: { contentAssets: true } },
                },
                orderBy: { scheduledAt: "asc" },
        });

        for (const target of targets) {
                const metadata = target.metadata || {};
                const videoAsset = target.contentItem?.contentAssets?.find(
                        (asset) => asset.type === "video"
                );

                const videoPath = metadata.videoPath || videoAsset?.url;
                if (!videoPath) {
                        console.warn(
                                `[⚠️] Skipping TikTok target ${target.id} due to missing video asset.`
                        );
                        continue;
                }

                const captionPieces = [
                        metadata.caption || target.contentItem?.title || "",
                        ...(metadata.hashtags || []),
                ].filter(Boolean);
                const caption = captionPieces.join(" ").trim();

                try {
                        await uploadVideoToTikTok(path.resolve(videoPath), caption);
                        await prismaClient.platformTarget.update({
                                where: { id: target.id },
                                data: { status: "posted" },
                        });
                        console.log(
                                `[✅] Posted TikTok target ${target.id} at ${new Date().toISOString()}`
                        );
                } catch (err) {
                        await prismaClient.platformTarget.update({
                                where: { id: target.id },
                                data: { status: "failed" },
                        });
                        console.error(`[❌] TikTok upload failed for target ${target.id}:`, err);
                }
        }
}

if (require.main === module) {
        processTikTokTargets()
                .catch((err) => {
                        console.error("Failed to process TikTok queue", err);
                })
                .finally(async () => {
                        if (prisma) {
                                await prisma.$disconnect();
                        }
                });
}

module.exports = uploadVideoToTikTok;
