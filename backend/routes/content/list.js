const { getPrismaClient } = require("../../utils/prisma");

const prisma = getPrismaClient();

module.exports = async function listContent(req, res) {
  const statusFilter =
    typeof req.query.status === "string" ? req.query.status.trim() : undefined;
  const platformFilterValue =
    typeof req.query.platform === "string" ? req.query.platform.trim() : undefined;

  const where = {};
  if (statusFilter) {
    where.status = statusFilter;
  }

  const platformFilter = platformFilterValue
    ? {
        some: {
          platform: platformFilterValue,
        },
      }
    : undefined;

  if (platformFilter) {
    where.platformTargets = platformFilter;
  }

  try {
    const items = await prisma.contentItem.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        contentAssets: true,
        platformTargets: platformFilter
          ? {
              where: { platform: platformFilterValue },
            }
          : true,
        user: true,
      },
    });

    const filteredItems = platformFilter
      ? items.filter((item) => item.platformTargets.length > 0)
      : items;

    return res.json({ data: filteredItems });
  } catch (error) {
    console.error("Failed to list content items", error);
    return res.status(500).json({ message: "Failed to list content items" });
  }
};
