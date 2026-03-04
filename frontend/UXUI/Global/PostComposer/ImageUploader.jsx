/** @format */

import { useState, useEffect, useCallback } from "react";

export default function ImageUploader({
	image,
	setImage,
	mediaPath,
	setMediaPath,
	mediaType,
	setMediaType,
	altText,
	setAltText,
	selectedPlatforms = [],
}) {
	const API_BASE = import.meta.env?.VITE_API_BASE || "http://localhost:3001";
	const [previewUrl, setPreviewUrl] = useState(null);
	const [isDragging, setIsDragging] = useState(false);
	const [isUploading, setIsUploading] = useState(false);
	const [uploadError, setUploadError] = useState("");

	const readFileToDataUrl = useCallback(
		(file) =>
			new Promise((resolve, reject) => {
				const reader = new FileReader();
				reader.onload = (event) => resolve(event.target?.result || null);
				reader.onerror = reject;
				reader.readAsDataURL(file);
			}),
		[]
	);

	useEffect(() => {
		if (!image) {
			setPreviewUrl(null);
			return;
		}
		if (typeof image === "string") {
			setPreviewUrl(image);
			return;
		}
		if (image instanceof File) {
			readFileToDataUrl(image).then(setPreviewUrl).catch(() => {
				setPreviewUrl(null);
			});
		} else {
			setPreviewUrl(null);
		}
	}, [image, readFileToDataUrl]);

	const uploadFile = async (file) => {
		const dataUrl = await readFileToDataUrl(file);
		const response = await fetch(`${API_BASE}/api/media/upload`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				dataUrl,
				fileName: file.name || "upload",
			}),
		});
		if (!response.ok) {
			const text = await response.text();
			throw new Error(`Upload failed: ${response.status} ${text}`);
		}
		return response.json();
	};

	const inferPreview = (payload) => {
		const mediaUrl = payload?.mediaUrl || payload?.mediaPath || null;
		if (!mediaUrl) return null;
		if (/^https?:\/\//i.test(mediaUrl)) return mediaUrl;
		return `${API_BASE}${mediaUrl}`;
	};

	const handleFileChange = async (event) => {
		const file = event.target.files?.[0];
		if (!file) {
			setImage?.(null);
			setMediaPath?.(null);
			setMediaType?.(null);
			return;
		}
		try {
			setIsUploading(true);
			setUploadError("");
			const uploaded = await uploadFile(file);
			const mediaPreview = inferPreview(uploaded);
			setPreviewUrl(mediaPreview);
			setImage?.(mediaPreview);
			setMediaPath?.(uploaded.mediaPath || null);
			setMediaType?.(uploaded.mediaType || null);
		} catch (error) {
			console.error("Failed to read image file", error);
			setPreviewUrl(null);
			setImage?.(null);
			setMediaPath?.(null);
			setMediaType?.(null);
			setUploadError(error?.message || "Upload failed");
		} finally {
			setIsUploading(false);
		}
	};

	const handleDrop = async (event) => {
		event.preventDefault();
		event.stopPropagation();
		setIsDragging(false);
		const file = event.dataTransfer.files?.[0];
		if (!file) return;
		try {
			setIsUploading(true);
			setUploadError("");
			const uploaded = await uploadFile(file);
			const mediaPreview = inferPreview(uploaded);
			setPreviewUrl(mediaPreview);
			setImage?.(mediaPreview);
			setMediaPath?.(uploaded.mediaPath || null);
			setMediaType?.(uploaded.mediaType || null);
		} catch (error) {
			console.error("Failed to read dropped image", error);
			setPreviewUrl(null);
			setImage?.(null);
			setMediaPath?.(null);
			setMediaType?.(null);
			setUploadError(error?.message || "Upload failed");
		} finally {
			setIsUploading(false);
		}
	};

	const handleDragOver = (event) => {
		event.preventDefault();
		event.stopPropagation();
		if (!isDragging) setIsDragging(true);
	};

	const handleDragLeave = (event) => {
		event.preventDefault();
		event.stopPropagation();
		if (!event.currentTarget.contains(event.relatedTarget)) {
			setIsDragging(false);
		}
	};

	const handleClear = () => {
		setPreviewUrl(null);
		setImage?.(null);
		setMediaPath?.(null);
		setMediaType?.(null);
		setUploadError("");
	};

	return (
		<div className="mb-4 border border-dashed border-gray-400 rounded p-4 bg-black/60">
			<label className="block font-semibold mb-2">Upload Image</label>
			<div
				onDrop={handleDrop}
				onDragOver={handleDragOver}
				onDragLeave={handleDragLeave}
				className={`relative flex flex-col items-center justify-center border-2 border-dashed rounded-md p-6 transition-colors ${
					isDragging ? "border-pink-500 bg-pink-500/10" : "border-teal-500"
				}`}
			>
				<input
					type="file"
					accept="image/*,video/*"
					className="absolute inset-0 opacity-0 cursor-pointer"
					onChange={handleFileChange}
				/>
				<p className="text-sm text-teal-300 text-center pointer-events-none">
					Drag + drop image/GIF/video here, or click to browse
				</p>
			</div>

			{previewUrl && (
				<div className="mt-3 space-y-2">
					{mediaType === "video" ? (
						<video
							src={previewUrl}
							controls
							className="max-h-48 rounded border border-teal-600"
						/>
					) : (
						<img
							src={previewUrl}
							alt="Selected preview"
							className="max-h-48 rounded border border-teal-600"
						/>
					)}
					{mediaPath && (
						<p className="text-xs text-gray-400 break-all">Stored: {mediaPath}</p>
					)}
					<button
						type="button"
						onClick={handleClear}
						className="px-3 py-1 text-sm border border-red-500 text-red-400 rounded hover:bg-red-500 hover:text-black transition-colors"
					>
						Remove image
					</button>
				</div>
			)}
			{isUploading && (
				<p className="mt-2 text-xs text-teal-300">Uploading media...</p>
			)}
			{uploadError && (
				<p className="mt-2 text-xs text-red-400">{uploadError}</p>
			)}
			<div className="mt-3">
				<label className="block text-sm text-pink-300 uppercase tracking-[0.2em] mb-1">Alt Text</label>
				<textarea
					value={altText}
					onChange={(e) => setAltText?.(e.target.value)}
					className="w-full bg-black border border-teal-500 text-teal-200 p-3 rounded focus:outline-none focus:ring-2 focus:ring-pink-500"
					placeholder="Describe the image for accessibility"
				/>
			</div>
			{selectedPlatforms.length > 0 && (
				<p className="text-xs text-gray-600 mt-2">
					Selected platforms: {selectedPlatforms.join(", ")}
				</p>
			)}
		</div>
	);
}
