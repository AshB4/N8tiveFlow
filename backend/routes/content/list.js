import { getPrismaClient } from "../../utils/prisma.js";

const prisma = getPrismaClient();

function parseTargetMetadata(target) {
	if (!target || typeof target.metadata !== "string") return target;
	try {
		return { ...target, metadata: JSON.parse(target.metadata) };
	} catch {
		return target;
	}
}

export default async function listContent(req, res) {
	const statusFilter =
		typeof req.query.status === "string" ? req.query.status.trim() : undefined;
	const platformFilterValue =
		typeof req.query.platform === "string" ? req.query.platform.trim() : undefined;

	const where = {};
	if (statusFilter) where.status = statusFilter;

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
				platformTargets: platformFilter ? { where: { platform: platformFilterValue } } : true,
				user: true,
			},
		});

		const filteredItems = (platformFilter
			? items.filter((item) => item.platformTargets.length > 0)
			: items
		).map((item) => ({
			...item,
			platformTargets: Array.isArray(item.platformTargets)
				? item.platformTargets.map(parseTargetMetadata)
				: item.platformTargets,
		}));

		return res.json({ data: filteredItems });
	} catch (error) {
		console.error("Failed to list content items", error);
		return res.status(500).json({ message: "Failed to list content items" });
	}
}
