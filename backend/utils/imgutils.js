/** @format */

const sharp = require("sharp");
const fs = require("fs");

async function resizeImageForPlatform(imagePath, platform) {
	const maxWidth = {
		X: 1024,
		Pinterest: 1000,
		Default: 1200,
	};

	const output = `resized/${platform}-${Date.now()}.jpg`;

	const width = maxWidth[platform] || maxWidth.Default;

	await sharp(imagePath).resize({ width }).toFile(output);

	return output;
}
