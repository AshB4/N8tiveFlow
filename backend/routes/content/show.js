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

export default async function showContent(req, res) {
	const id = Number.parseInt(req.params.id, 10);
	if (Number.isNaN(id)) {
		return res.status(400).json({ message: "Content item id must be a number" });
	}

	try {
		const contentItem = await prisma.contentItem.findUnique({
			where: { id },
			include: {
				contentAssets: true,
				platformTargets: true,
				user: true,
			},
		});

		if (!contentItem) {
			return res.status(404).json({ message: "Content item not found" });
		}

		return res.json({
			data: {
				...contentItem,
				platformTargets: Array.isArray(contentItem.platformTargets)
					? contentItem.platformTargets.map(parseTargetMetadata)
					: contentItem.platformTargets,
			},
		});
	} catch (error) {
		console.error("Failed to load content item", error);
		return res.status(500).json({ message: "Failed to load content item" });
	}
}
