/** @format */

import { useState, useEffect } from "react";

export default function ImageUploader({
	image,
	setImage,
	altText,
	setAltText,
	selectedPlatforms = [],
}) {
	const [previewUrl, setPreviewUrl] = useState(null);

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
			const reader = new FileReader();
			reader.onload = (event) => {
				setPreviewUrl(event.target?.result || null);
			};
			reader.readAsDataURL(image);
		}
	}, [image]);

	const handleFileChange = (event) => {
		const file = event.target.files?.[0];
		if (!file) {
			setImage?.(null);
			return;
		}
		setImage?.(file);
	};

	return (
		<div className="mb-4 border border-dashed border-gray-400 rounded p-4">
			<label className="block font-semibold mb-2">Upload Image</label>
			<input type="file" accept="image/*" onChange={handleFileChange} />
			{previewUrl && (
				<div className="mt-3">
					<img
						src={previewUrl}
						alt="Selected preview"
						className="max-h-48 rounded border"
					/>
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
