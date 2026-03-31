import pkg from "@prisma/client";

const { PrismaClient } = pkg;

let prisma;

export function getPrismaClient() {
	if (!prisma) {
		prisma = new PrismaClient();
	}
	return prisma;
}
