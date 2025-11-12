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

const makeKey = (platform, accountId) =>
	`${platform}::${accountId ?? "default"}`;

const hasTarget = (targets, platform, accountId = null) =>
	targets.some(
		(target) =>
			target.platform === platform &&
			(target.accountId ?? null) === (accountId ?? null),
	);

const formatPlatformName = (platform) =>
	platform.charAt(0).toUpperCase() + platform.slice(1);

export default function PlatformSelector({
	selectedTargets = [],
	toggleTarget,
	accountsByPlatform = {},
	platforms = DEFAULT_PLATFORMS,
}) {
	const platformSet = Array.from(
		new Set([
			...platforms.map((platform) => platform.toLowerCase()),
			...Object.keys(accountsByPlatform || {}),
		]),
	).sort();

	return (
		<div className="mb-4">
			<h2 className="font-semibold mb-2">Platforms &amp; Accounts</h2>
			<div className="space-y-4">
				{platformSet.map((platform) => {
					const accounts = accountsByPlatform?.[platform] || [];
					const hasAccounts = accounts.length > 0;
					const defaultChecked = hasTarget(selectedTargets, platform, null);

					return (
						<div
							key={platform}
							className="border border-gray-700 rounded-lg p-3 bg-black/60"
						>
							<div className="flex items-center justify-between mb-2">
				<span className="text-lg font-semibold text-pink-300">
					{formatPlatformName(platform)}
				</span>
								{hasAccounts ? (
									<span className="text-xs text-teal-400">
										{accounts.length} linked account{accounts.length > 1 ? "s" : ""}
									</span>
								) : (
									<span className="text-xs text-gray-400">
										No linked accounts · uses platform default
									</span>
								)}
							</div>

							<div className="flex flex-wrap gap-2">
								<label
									key={makeKey(platform, null)}
									className={`px-3 py-1 rounded border text-sm cursor-pointer transition flex items-center ${
										defaultChecked
											? "border-teal-500 bg-teal-500/20 text-teal-200 shadow-lg shadow-teal-500/50"
											: "border-gray-600 text-gray-300 hover:border-teal-400"
									}`}
									onClick={() => toggleTarget?.(platform, null)}
								>
									<input
										type="checkbox"
										checked={defaultChecked}
										onChange={() => toggleTarget?.(platform, null)}
										className="hidden"
									/>
									{defaultChecked ? '✅ ' : ''}Post to {formatPlatformName(platform)}
								</label>

								{accounts.map((account) => {
									const checked = hasTarget(
										selectedTargets,
										platform,
										account.id,
									);
									return (
										<label
											key={makeKey(platform, account.id)}
											className={`px-3 py-1 rounded border text-sm cursor-pointer transition flex items-center ${
												checked
													? "border-pink-500 bg-pink-500/20 text-pink-200 shadow-lg shadow-pink-500/50"
													: "border-gray-600 text-gray-300 hover:border-pink-400"
											}`}
											onClick={() => toggleTarget?.(platform, account.id)}
										>
											<input
												type="checkbox"
												checked={checked}
												onChange={() => toggleTarget?.(platform, account.id)}
												className="hidden"
											/>
											{checked ? '✅ ' : ''}{account.label || account.id}
										</label>
									);
								})}
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
}
