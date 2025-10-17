/** @format */

const DEFAULT_PLATFORMS = [
	"x",
	"facebook",
	"linkedin",
	"pinterest",
	"reddit",
	"tumblr",
	"onlyfans",
	"kofi",
	"discord",
	"devto",
	"hashnode",
	"producthunt",
	"amazon",
];

export default function PlatformSelector({
	selectedPlatforms = [],
	togglePlatform,
	platforms = DEFAULT_PLATFORMS,
}) {
	return (
		<div className="mb-4">
			<h2 className="font-semibold mb-2">Platforms</h2>
			<div className="grid grid-cols-2 md:grid-cols-3 gap-2">
				{platforms.map((platform) => {
					const id = `platform-${platform}`;
					return (
						<label
							key={platform}
							htmlFor={id}
							className={`flex items-center gap-2 border rounded px-2 py-1 cursor-pointer transition ${
								isSelected(selectedPlatforms, platform)
									? "border-blue-500 bg-blue-50"
									: "border-gray-300"
							}`}
						>
							<input
								type="checkbox"
								id={id}
								checked={selectedPlatforms.includes(platform)}
								onChange={() => togglePlatform?.(platform)}
								className="form-checkbox"
							/>
							<span className="capitalize">{platform}</span>
						</label>
					);
				})}
			</div>
		</div>
	);
}

function isSelected(selectedPlatforms, platform) {
	return Array.isArray(selectedPlatforms)
		? selectedPlatforms.includes(platform)
		: false;
}
