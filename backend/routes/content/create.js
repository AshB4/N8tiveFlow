const { Prisma } = require("@prisma/client");
const { getPrismaClient } = require("../../utils/prisma");
const { validateContentPayload } = require("./validators");

const prisma = getPrismaClient();

module.exports = async function createContent(req, res) {
  const { data, errors } = validateContentPayload(req.body, { partial: false });

  if (errors.length > 0) {
    return res.status(400).json({ message: "Validation failed", errors });
  }

  const { assets = [], targets = [], ...contentData } = data;

  try {
    const created = await prisma.contentItem.create({
      data: {
        ...contentData,
        contentAssets:
          assets.length > 0
            ? {
                create: assets,
              }
            : undefined,
        platformTargets:
          targets.length > 0
            ? {
                create: targets,
              }
            : undefined,
      },
      include: {
        contentAssets: true,
        platformTargets: true,
        user: true,
      },
    });

    return res.status(201).json({ data: created });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
      return res.status(400).json({ message: "Related records not found" });
    }

    console.error("Failed to create content item", error);
    return res.status(500).json({ message: "Failed to create content item" });
  }
};
