/** @format */

import { useState, useEffect, useCallback } from "react";

export default function ImageUploader({
	image,
	setImage,
	altText,
	setAltText,
	selectedPlatforms = [],
}) {
	const [previewUrl, setPreviewUrl] = useState(null);
	const [isDragging, setIsDragging] = useState(false);

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

	const handleFileChange = async (event) => {
		const file = event.target.files?.[0];
		if (!file) {
			setImage?.(null);
			return;
		}
		try {
			const dataUrl = await readFileToDataUrl(file);
			setPreviewUrl(dataUrl);
			setImage?.(dataUrl);
		} catch (error) {
			console.error("Failed to read image file", error);
			setPreviewUrl(null);
			setImage?.(null);
		}
	};

	const handleDrop = async (event) => {
		event.preventDefault();
		event.stopPropagation();
		setIsDragging(false);
		const file = event.dataTransfer.files?.[0];
		if (!file) return;
		try {
			const dataUrl = await readFileToDataUrl(file);
			setPreviewUrl(dataUrl);
			setImage?.(dataUrl);
		} catch (error) {
			console.error("Failed to read dropped image", error);
			setPreviewUrl(null);
			setImage?.(null);
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
					accept="image/*"
					className="absolute inset-0 opacity-0 cursor-pointer"
					onChange={handleFileChange}
				/>
				<p className="text-sm text-teal-300 text-center pointer-events-none">
					Drag + drop an image here, or click to browse
				</p>
			</div>

			{previewUrl && (
				<div className="mt-3 space-y-2">
					<img
						src={previewUrl}
						alt="Selected preview"
						className="max-h-48 rounded border border-teal-600"
					/>
					<button
						type="button"
						onClick={handleClear}
						className="px-3 py-1 text-sm border border-red-500 text-red-400 rounded hover:bg-red-500 hover:text-black transition-colors"
					>
						Remove image
					</button>
				</div>
			)}
			<div className="mt-3">
				<label className="block text-sm font-medium mb-1">Alt Text</label>
				<textarea
					value={altText}
					onChange={(e) => setAltText?.(e.target.value)}
					className="w-full p-2 border rounded"
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
