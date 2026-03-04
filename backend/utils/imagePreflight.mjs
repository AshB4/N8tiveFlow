/** @format */

import fs from "fs";
import path from "path";

function readUInt16BE(buffer, offset) {
	return (buffer[offset] << 8) + buffer[offset + 1];
}

function parsePng(buffer) {
	// PNG IHDR: width @ bytes 16-19, height @ 20-23
	if (buffer.length < 24) return null;
	if (
		buffer[0] !== 0x89 ||
		buffer[1] !== 0x50 ||
		buffer[2] !== 0x4e ||
		buffer[3] !== 0x47
	) {
		return null;
	}
	return {
		width: buffer.readUInt32BE(16),
		height: buffer.readUInt32BE(20),
		format: "png",
	};
}

function parseGif(buffer) {
	if (buffer.length < 10) return null;
	const sig = buffer.slice(0, 6).toString("ascii");
	if (sig !== "GIF87a" && sig !== "GIF89a") return null;
	return {
		width: buffer.readUInt16LE(6),
		height: buffer.readUInt16LE(8),
		format: "gif",
	};
}

function parseJpeg(buffer) {
	if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) return null;
	let offset = 2;
	while (offset < buffer.length) {
		if (buffer[offset] !== 0xff) {
			offset += 1;
			continue;
		}
		const marker = buffer[offset + 1];
		offset += 2;
		// SOF0/SOF2 markers contain dimensions
		if (marker === 0xc0 || marker === 0xc2) {
			if (offset + 7 > buffer.length) return null;
			const segmentLength = readUInt16BE(buffer, offset);
			if (segmentLength < 7 || offset + segmentLength > buffer.length) return null;
			const height = readUInt16BE(buffer, offset + 3);
			const width = readUInt16BE(buffer, offset + 5);
			return { width, height, format: "jpeg" };
		}
		if (offset + 1 >= buffer.length) return null;
		const length = readUInt16BE(buffer, offset);
		if (length < 2) return null;
		offset += length;
	}
	return null;
}

export function getImageDimensions(filePath) {
	const buffer = fs.readFileSync(filePath);
	return parsePng(buffer) || parseGif(buffer) || parseJpeg(buffer);
}

export async function ensurePinterestImageReady(filePath, options = {}) {
	const minWidth = Number(options.minWidth || 1000);
	const autoResize = Boolean(options.autoResize);
	const targetWidth = Number(options.targetWidth || 1000);
	const targetHeight = Number(options.targetHeight || 1500);

	const dims = getImageDimensions(filePath);
	if (!dims) {
		return { path: filePath, changed: false, reason: "not_supported_image" };
	}
	if (dims.width >= minWidth) {
		return { path: filePath, changed: false, reason: "already_valid", dimensions: dims };
	}
	if (!autoResize) {
		throw new Error(
			`Pinterest requires image width >= ${minWidth}px. Current width: ${dims.width}px.`,
		);
	}

	let sharp;
	try {
		sharp = (await import("sharp")).default;
	} catch {
		throw new Error(
			`Image width is ${dims.width}px (<${minWidth}). Install "sharp" or upload a wider image.`,
		);
	}

	const parsed = path.parse(filePath);
	const outputPath = path.join(
		parsed.dir,
		`${parsed.name}_pinterest_${targetWidth}x${targetHeight}${parsed.ext || ".jpg"}`,
	);

	await sharp(filePath)
		.resize({
			width: targetWidth,
			height: targetHeight,
			fit: "contain",
			background: { r: 255, g: 255, b: 255, alpha: 1 },
		})
		.toFile(outputPath);

	return {
		path: outputPath,
		changed: true,
		reason: "resized",
		original: dims,
		target: { width: targetWidth, height: targetHeight },
	};
}

