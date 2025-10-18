/**
 * Seed script for initializing the SQLite database with sample content.
 */

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const seedContent = async (user) => {
  const contentDefinitions = [
    {
      title: "Cron Ritual Hacks",
      body: "Did you know CRON can summon demons at 3AM?",
      status: "approved",
      scheduledAt: new Date("2025-05-25T10:00:00Z"),
      assets: [
        {
          type: "image",
          url: "./queue/ritual.jpg",
          altText: "Terminal showing cron expression",
        },
      ],
      targets: [
        {
          platform: "linkedin",
          status: "approved",
          scheduledAt: new Date("2025-05-25T10:00:00Z"),
          metadata: {
            image: "ritual.jpg",
            altText: "Terminal showing cron expression",
            headline: "Cron Ritual Hacks",
          },
        },
        {
          platform: "twitter",
          status: "approved",
          scheduledAt: new Date("2025-05-25T10:00:00Z"),
          metadata: {
            headline: "Cron Ritual Hacks",
          },
        },
      ],
    },
    {
      title: "Cron Ritual Hacks (LinkedIn reshare)",
      status: "approved",
      scheduledAt: new Date("2025-05-09T10:00:00Z"),
      assets: [],
      targets: [
        {
          platform: "linkedin",
          status: "approved",
          scheduledAt: new Date("2025-05-09T10:00:00Z"),
        },
      ],
    },
    {
      title: "Install Video",
      status: "approved",
      scheduledAt: new Date("2025-05-10T12:00:00Z"),
      assets: [],
      targets: [
        {
          platform: "youtube",
          status: "approved",
          scheduledAt: new Date("2025-05-10T12:00:00Z"),
        },
      ],
    },
    {
      title: "System Reboot?",
      status: "approved",
      scheduledAt: new Date("2025-05-08T22:00:00Z"),
      assets: [],
      targets: [
        {
          platform: "twitter",
          status: "approved",
          scheduledAt: new Date("2025-05-08T22:00:00Z"),
        },
      ],
    },
    {
      title: "Dev Confession",
      status: "approved",
      scheduledAt: new Date("2025-05-11T11:00:00Z"),
      assets: [],
      targets: [
        {
          platform: "instagram",
          status: "approved",
          scheduledAt: new Date("2025-05-11T11:00:00Z"),
        },
      ],
    },
    {
      title: "BTS Debug",
      status: "approved",
      scheduledAt: new Date("2025-05-24T15:00:00Z"),
      assets: [],
      targets: [
        {
          platform: "dev.to",
          status: "approved",
          scheduledAt: new Date("2025-05-24T15:00:00Z"),
        },
      ],
    },
    {
      title: "Amara Quote Upload",
      status: "approved",
      body: "The pattern suits you.",
      scheduledAt: new Date("2025-05-15T09:00:00Z"),
      assets: [
        {
          type: "video",
          url: "./queue/amara-quote1.mp4",
        },
      ],
      targets: [
        {
          platform: "tiktok",
          status: "approved",
          scheduledAt: new Date("2025-05-15T09:00:00Z"),
          metadata: {
            caption: "The pattern suits you.",
            hashtags: ["#DarkFeminine", "#AIbot", "#AmaraNyx", "#exampleVideo"],
            videoPath: "./queue/amara-quote1.mp4",
          },
        },
      ],
    },
  ];

  for (const definition of contentDefinitions) {
    await prisma.contentItem.create({
      data: {
        title: definition.title,
        body: definition.body ?? null,
        status: definition.status,
        scheduledAt: definition.scheduledAt,
        user: user ? { connect: { id: user.id } } : undefined,
        contentAssets: {
          create: definition.assets.map((asset) => ({
            type: asset.type,
            url: asset.url,
            altText: asset.altText ?? null,
          })),
        },
        platformTargets: {
          create: definition.targets.map((target) => ({
            platform: target.platform,
            status: target.status,
            scheduledAt: target.scheduledAt,
            metadata: target.metadata ?? null,
          })),
        },
      },
    });
  }
};

async function main() {
  await prisma.platformTarget.deleteMany();
  await prisma.contentAsset.deleteMany();
  await prisma.contentItem.deleteMany();
  await prisma.user.deleteMany();

  const user = await prisma.user.create({
    data: {
      email: "creator@n8tiveflow.local",
      name: "N8tiveFlow Creator",
      role: "creator",
    },
  });

  await seedContent(user);
}

main()
  .catch((err) => {
    console.error("Seed failed", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

