const { Prisma } = require("@prisma/client");
const { getPrismaClient } = require("../../utils/prisma");
const { validateContentPayload } = require("./validators");

const prisma = getPrismaClient();

module.exports = async function updateContent(req, res) {
  const id = Number.parseInt(req.params.id, 10);

  if (Number.isNaN(id)) {
    return res.status(400).json({ message: "Content item id must be a number" });
  }

  const { data, errors } = validateContentPayload(req.body, { partial: true });

  if (errors.length > 0) {
    return res.status(400).json({ message: "Validation failed", errors });
  }

  const { assets, targets, ...contentData } = data;
  const hasScalarUpdates = Object.keys(contentData).length > 0;
  const hasAssetUpdates = assets !== undefined;
  const hasTargetUpdates = targets !== undefined;

  if (!hasScalarUpdates && !hasAssetUpdates && !hasTargetUpdates) {
    return res.status(400).json({ message: "At least one field must be provided" });
  }

  try {
    const updated = await prisma.contentItem.update({
      where: { id },
      data: {
        ...contentData,
        contentAssets: hasAssetUpdates
          ? {
              deleteMany: {},
              create: (assets || []).map((asset) => ({ ...asset })),
            }
          : undefined,
        platformTargets: hasTargetUpdates
          ? {
              deleteMany: {},
              create: (targets || []).map((target) => ({ ...target })),
            }
          : undefined,
      },
      include: {
        contentAssets: true,
        platformTargets: true,
        user: true,
      },
    });

    return res.json({ data: updated });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return res.status(404).json({ message: "Content item not found" });
    }

    console.error("Failed to update content item", error);
    return res.status(500).json({ message: "Failed to update content item" });
  }
};
