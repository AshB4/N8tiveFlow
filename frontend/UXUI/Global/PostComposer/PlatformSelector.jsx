/** @format */

const DEFAULT_PLATFORMS = [
	"x",
	"facebook",
	"linkedin",
	"pinterest",
	"substack",
	"reddit",
	"tumblr",
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

const getHealthStyle = (status) => {
	if (status === "healthy") {
		return "border-emerald-500/60 text-emerald-300";
	}
	if (status === "warning") {
		return "border-amber-500/60 text-amber-300";
	}
	if (status === "error") {
		return "border-red-500/60 text-red-300 opacity-60";
	}
	return "border-gray-600 text-gray-400";
};

export default function PlatformSelector({
	selectedTargets = [],
	toggleTarget,
	accountsByPlatform = {},
	platforms = DEFAULT_PLATFORMS,
	healthResults = [],
	onHealthIssue,
}) {
	const healthMap = new Map(
		(healthResults || []).map((item) => [
			makeKey(item.platform, item.accountId ?? null),
			item,
		]),
	);
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
					const defaultHealth = healthMap.get(makeKey(platform, null));

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
									} ${defaultHealth?.status === "error" ? "opacity-50" : ""}`}
									onClick={() => {
										if (defaultHealth?.status === "error") {
											onHealthIssue?.(defaultHealth);
											return;
										}
										toggleTarget?.(platform, null);
									}}
									title={defaultHealth?.detail || ""}
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
									const accountHealth = healthMap.get(
										makeKey(platform, account.id),
									);
									return (
										<label
											key={makeKey(platform, account.id)}
											className={`px-3 py-1 rounded border text-sm cursor-pointer transition flex items-center ${
												checked
													? "border-pink-500 bg-pink-500/20 text-pink-200 shadow-lg shadow-pink-500/50"
													: "border-gray-600 text-gray-300 hover:border-pink-400"
											} ${getHealthStyle(accountHealth?.status)}`}
											onClick={() => {
												if (accountHealth?.status === "error") {
													onHealthIssue?.(accountHealth);
													return;
												}
												toggleTarget?.(platform, account.id);
											}}
											title={accountHealth?.detail || ""}
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
