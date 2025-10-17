/** @format */

const helperText = "Provide custom copy per platform or rely on the main body.";

export default function CustomPlatformText({
	useAutoPlatformText,
	setUseAutoPlatformText,
	selectedPlatforms = [],
	customText = {},
	setCustomText,
}) {
	const handleTextChange = (platform, value) => {
		if (!setCustomText) return;
		setCustomText((prev = {}) => ({
			...prev,
			[platform]: value,
		}));
	};

	return (
		<div className="mb-4">
			<label className="inline-flex items-center gap-2 mb-2">
				<input
					type="checkbox"
					checked={useAutoPlatformText}
					onChange={() => setUseAutoPlatformText?.(!useAutoPlatformText)}
				/>
				<span>Use main body text for all platforms</span>
			</label>
			<p className="text-xs text-gray-600 mb-2">{helperText}</p>
			{!useAutoPlatformText && selectedPlatforms.length > 0 && (
				<div className="space-y-3">
					{selectedPlatforms.map((platform) => (
						<div key={platform}>
							<label className="block text-sm font-semibold mb-1 capitalize">
								{platform}
							</label>
							<textarea
								value={customText[platform] || ""}
								onChange={(e) => handleTextChange(platform, e.target.value)}
								className="w-full p-2 border rounded"
								placeholder={`Custom text for ${platform}`}
								rows={3}
							/>
						</div>
					))}
				</div>
			)}
		</div>
	);
}
