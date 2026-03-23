/** @format */

import { useState, useEffect, useMemo } from "react";
import seoVault from "../../../posts/seoVault.json";
import { validatePostAgainstRules } from "../../utils/platformRules";
import { normalizePostStatus } from "../../utils/postStatus";
import { getProductProfile, productProfiles } from "../../utils/productProfiles";
import {
	mergeTargets,
	distributionTagsToTargets,
	normalizeTagList,
} from "../../utils/distributionTags";

const API_BASE = import.meta.env?.VITE_API_BASE || "http://localhost:3001";

const AVAILABLE_PLATFORMS = [
	"x",
	"facebook",
	"linkedin",
	"pinterest",
	"substack",
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

const DEFAULT_POST_INTENT = "jab";
const DEFAULT_CAMPAIGN_PHASE = "evergreen";

const toArray = (value) => {
	if (!value) return [];
	if (Array.isArray(value)) return value;
	return [value];
};

const toDateTimeLocal = (value) => {
	if (!value) return "";
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return "";
	const tzOffset = date.getTimezoneOffset() * 60000;
	return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
};

const normalizeHashtags = (value) => {
	if (!value) return "";
	if (Array.isArray(value)) return value.join(" ");
	return typeof value === "string" ? value : "";
};

const normalizeTargetEntry = (platform, accountId) => {
	if (!platform) return null;
	const normalizedPlatform = String(platform).toLowerCase();
	const normalizedAccount =
		accountId === undefined || accountId === null ? null : String(accountId);
	return {
		platform: normalizedPlatform,
		accountId: normalizedAccount,
	};
};

const sanitizeTargetsInput = (input, fallbackPlatforms = []) => {
	if (Array.isArray(input) && input.length) {
		return input
			.map((entry) => {
				if (!entry) return null;
				if (typeof entry === "string") {
					return normalizeTargetEntry(entry, null);
				}
				if (typeof entry === "object") {
					const platform =
						entry.platform ?? entry.name ?? entry.value ?? entry.id;
					const accountId =
						entry.accountId ?? entry.account ?? entry.account_id ?? entry.id;
					return normalizeTargetEntry(platform, accountId ?? null);
				}
				return null;
			})
			.filter(Boolean);
	}

	return (Array.isArray(fallbackPlatforms) ? fallbackPlatforms : toArray(fallbackPlatforms))
		.map((platform) => normalizeTargetEntry(platform, null))
		.filter(Boolean);
};

const usePostComposerState = (initialDraft = null) => {
	const hasPersistedId =
		initialDraft?.__hasRealId !== false && Boolean(initialDraft?.id);
	const initialStatus = normalizePostStatus(initialDraft?.status);
	const initialTargets = sanitizeTargetsInput(
		initialDraft?.targets,
		toArray(initialDraft?.platforms || initialDraft?.platform),
	);
	const [title, setTitle] = useState(initialDraft?.title || "");
	const [body, setBody] = useState(
		initialDraft?.body || initialDraft?.content || ""
	);
	const [image, setImage] = useState(initialDraft?.image || null);
	const [mediaPath, setMediaPath] = useState(initialDraft?.mediaPath || null);
	const [mediaType, setMediaType] = useState(initialDraft?.mediaType || null);
	const [altText, setAltText] = useState(initialDraft?.altText || "");
	const [manualTargets, setManualTargets] = useState(initialTargets);
	const [scheduledAt, setScheduledAt] = useState(
		toDateTimeLocal(initialDraft?.scheduledAt || initialDraft?.scheduled_at)
	);
	const [saveAsDraft, setSaveAsDraft] = useState(initialStatus !== "approved");
	const [approveForSchedule, setApproveForSchedule] = useState(
		initialStatus === "approved" || !initialDraft
	);
	const [selectedProduct, setSelectedProduct] = useState(
		initialDraft?.metadata?.productProfileId || ""
	);
	const [postIntent, setPostIntent] = useState(
		initialDraft?.metadata?.postIntent || DEFAULT_POST_INTENT
	);
	const [campaignPhase, setCampaignPhase] = useState(
		initialDraft?.metadata?.campaignPhase || DEFAULT_CAMPAIGN_PHASE
	);
	const [campaignAngle, setCampaignAngle] = useState(
		initialDraft?.metadata?.campaignAngle || ""
	);
	const [visualHook, setVisualHook] = useState(
		initialDraft?.metadata?.visualHook || ""
	);

	const [useAutoHashtags, setUseAutoHashtags] = useState(
		!normalizeHashtags(initialDraft?.hashtags)
	);
	const [manualHashtags, setManualHashtags] = useState(
		normalizeHashtags(initialDraft?.hashtags)
	);
	const [contentTags, setContentTags] = useState(
		normalizeTagList(initialDraft?.metadata?.contentTags || initialDraft?.tags || [])
			.join(", ")
	);
	const [distributionTags, setDistributionTags] = useState(
		normalizeTagList(initialDraft?.metadata?.distributionTags || []).join(", ")
	);

	const [useAutoPlatformText, setUseAutoPlatformText] = useState(
		!(initialDraft?.platformOverrides && Object.keys(initialDraft.platformOverrides).length > 0)
	);
	const [customText, setCustomText] = useState(
		initialDraft?.platformOverrides || {}
	);
	const [autoAffiliateAmazon, setAutoAffiliateAmazon] = useState(
		Boolean(
			initialDraft?.autoAffiliateAmazon ||
			initialDraft?.metadata?.autoAffiliateAmazon
		)
	);
	const [includeProductLink, setIncludeProductLink] = useState(
		Boolean(initialDraft?.metadata?.includeProductLink)
	);
	const [imageStatus, setImageStatus] = useState(
		initialDraft?.metadata?.imageStatus ||
			(initialDraft?.mediaPath || initialDraft?.image ? "attached" : "prompt-needed")
	);
	const [imageConcept, setImageConcept] = useState(
		initialDraft?.metadata?.imageConcept || ""
	);
	const [imagePrompt, setImagePrompt] = useState(
		initialDraft?.metadata?.imagePrompt || ""
	);
	const [aiProductName, setAiProductName] = useState(initialDraft?.title || "");
	const [aiProductType, setAiProductType] = useState("Automation Tool");
	const [aiAudience, setAiAudience] = useState("Indie creators and solo founders");
	const [aiProvider, setAiProvider] = useState("openai");
	const [aiSuggestions, setAiSuggestions] = useState(null);
	const [isGeneratingSeo, setIsGeneratingSeo] = useState(false);

	const selectedProductProfile = useMemo(
		() => getProductProfile(selectedProduct),
		[selectedProduct]
	);

	useEffect(() => {
		if (!selectedProductProfile) return;
		const seo = seoVault;
		if (!seo) return;

		if (!title) {
			setTitle(selectedProductProfile.label);
		}
		if (!body && seo.meta_description) {
			setBody(seo.meta_description || "");
		}
		if (!altText && seo.alt_text_examples?.[0]) {
			setAltText(seo.alt_text_examples?.[0] || "");
		}
		if (!useAutoHashtags && seo.hashtags?.All) {
			setManualHashtags(seo.hashtags.All.join(" "));
		}
		if (!aiProductName) {
			setAiProductName(selectedProductProfile.label);
		}
		setAiProductType(selectedProductProfile.productType);
		setAiAudience(selectedProductProfile.audience);
	}, [selectedProductProfile, useAutoHashtags]);

	useEffect(() => {
		if (!initialDraft) return;
		setTitle(initialDraft.title || "");
		setBody(initialDraft.body || initialDraft.content || "");
		setImage(initialDraft.image || null);
		setMediaPath(initialDraft.mediaPath || null);
		setMediaType(initialDraft.mediaType || null);
		setAltText(initialDraft.altText || "");
		setManualTargets(
			sanitizeTargetsInput(
				initialDraft.targets,
				toArray(initialDraft.platforms || initialDraft.platform)
			)
		);
		setScheduledAt(
			toDateTimeLocal(initialDraft.scheduledAt || initialDraft.scheduled_at)
		);
		const nextStatus = normalizePostStatus(initialDraft.status);
		setSaveAsDraft(nextStatus !== "approved");
		setApproveForSchedule(nextStatus === "approved");
		setUseAutoHashtags(!normalizeHashtags(initialDraft.hashtags));
		setManualHashtags(normalizeHashtags(initialDraft.hashtags));
		setContentTags(
			normalizeTagList(initialDraft.metadata?.contentTags || initialDraft.tags || []).join(", ")
		);
		setDistributionTags(
			normalizeTagList(initialDraft.metadata?.distributionTags || []).join(", ")
		);
		setUseAutoPlatformText(
			!(
				initialDraft.platformOverrides &&
				Object.keys(initialDraft.platformOverrides).length > 0
			)
		);
		setCustomText(initialDraft.platformOverrides || {});
		setAutoAffiliateAmazon(
			Boolean(
				initialDraft.autoAffiliateAmazon ||
				initialDraft.metadata?.autoAffiliateAmazon
			)
		);
		setIncludeProductLink(Boolean(initialDraft.metadata?.includeProductLink));
		setImageStatus(
			initialDraft.metadata?.imageStatus ||
				(initialDraft.mediaPath || initialDraft.image ? "attached" : "prompt-needed")
		);
		setImageConcept(initialDraft.metadata?.imageConcept || "");
		setImagePrompt(initialDraft.metadata?.imagePrompt || "");
		setAiProductName(initialDraft.title || "");
		setSelectedProduct(initialDraft.metadata?.productProfileId || "");
		setPostIntent(initialDraft.metadata?.postIntent || DEFAULT_POST_INTENT);
		setCampaignPhase(initialDraft.metadata?.campaignPhase || DEFAULT_CAMPAIGN_PHASE);
		setCampaignAngle(initialDraft.metadata?.campaignAngle || "");
		setVisualHook(initialDraft.metadata?.visualHook || "");
	}, [initialDraft]);

	const toggleTarget = (platform, accountId = null) => {
		const normalized = normalizeTargetEntry(platform, accountId);
		if (!normalized) return;
		setManualTargets((prev = []) => {
			const exists = prev.some(
				(target) =>
					target.platform === normalized.platform &&
					(target.accountId ?? null) === (normalized.accountId ?? null)
			);
			if (exists) {
				return prev.filter(
					(target) =>
						!(
							target.platform === normalized.platform &&
							(target.accountId ?? null) === (normalized.accountId ?? null)
						)
				);
			}
			return [...prev, normalized];
		});
	};

	const derivedTargets = useMemo(
		() => distributionTagsToTargets(distributionTags),
		[distributionTags]
	);

	const selectedTargets = useMemo(
		() => mergeTargets(manualTargets, derivedTargets),
		[manualTargets, derivedTargets]
	);

	const selectedPlatforms = useMemo(
		() => Array.from(new Set(selectedTargets.map((target) => target.platform))),
		[selectedTargets]
	);

	const handleSubmit = async (overrides = {}) => {
		if (selectedTargets.length === 0) {
			throw new Error("Select at least one platform or account target before posting");
		}
		const scheduledSource =
			overrides.scheduledAt !== undefined ? overrides.scheduledAt : scheduledAt;
		const scheduledIso = scheduledSource
			? new Date(scheduledSource).toISOString()
			: null;

		const platformViolations = validatePostAgainstRules({
			body,
			customText,
			useAutoPlatformText,
			targets: selectedTargets,
			mediaType,
			hasMedia: Boolean(mediaPath || image),
		});
		if (platformViolations.length > 0) {
			const error = new Error(platformViolations[0].message);
			error.violations = platformViolations;
			throw error;
		}

		const nextStatus =
			overrides.status ||
			(saveAsDraft || !approveForSchedule ? "draft" : "approved");
		const sharedPayload = {
			title,
			body,
			image,
			mediaPath,
			mediaType,
			altText,
			platforms: selectedPlatforms,
			targets: selectedTargets,
			scheduledAt: scheduledIso,
			status: nextStatus,
			hashtags: useAutoHashtags ? null : manualHashtags,
			platformOverrides: useAutoPlatformText ? null : customText,
			autoAffiliateAmazon,
			metadata: {
				...(initialDraft?.metadata || {}),
				autoAffiliateAmazon,
				includeProductLink,
				postIntent,
				campaignPhase,
				campaignAngle: campaignAngle.trim(),
				visualHook: visualHook.trim(),
				productProfileId: selectedProductProfile?.id || null,
				productProfileLabel: selectedProductProfile?.label || "",
				productCategory: selectedProductProfile?.category || "",
				productLinks: selectedProductProfile?.links || {},
				contentTags: normalizeTagList(contentTags),
				distributionTags: normalizeTagList(distributionTags),
				imageStatus,
				imageConcept: imageConcept.trim(),
				imagePrompt: imagePrompt.trim(),
				approvalSource:
					nextStatus === "approved" ? "composer" : "draft-review",
				requiresReview: nextStatus !== "approved",
			},
			tags: normalizeTagList(contentTags),
		};

		const url = hasPersistedId
			? `${API_BASE}/api/posts/${initialDraft.id}`
			: `${API_BASE}/api/posts`;
		const method = hasPersistedId ? "PUT" : "POST";
		const res = await fetch(url, {
			method,
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(sharedPayload),
		});
		if (!res.ok) {
			const errorText = await res.text();
			throw new Error(`${hasPersistedId ? "Update" : "Save"} failed: ${res.status} ${errorText}`);
		}
		return {
			mode: hasPersistedId ? "update" : "queue",
			data: await res.json(),
		};
	};

	const generateSeoSuggestions = async ({ dryRun = false } = {}) => {
		if (!aiProductName || !aiProductType || !aiAudience) {
			throw new Error("Fill in product name, type, and audience before generating suggestions");
		}
		setIsGeneratingSeo(true);
		try {
			const res = await fetch(`${API_BASE}/api/ai/seo-generate`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					productName: aiProductName,
					productType: selectedProductProfile?.productType || aiProductType,
					audience: selectedProductProfile?.audience || aiAudience,
					platformIds: selectedPlatforms,
					productProfileId: selectedProductProfile?.id || null,
					postIntent,
					campaignPhase,
					campaignAngle,
					visualHook,
					provider: aiProvider,
					dryRun,
				}),
			});
			if (!res.ok) {
				const errorText = await res.text();
				let detail = errorText;
				try {
					const parsed = JSON.parse(errorText);
					detail = parsed?.detail || parsed?.error || errorText;
				} catch {
					detail = errorText;
				}
				throw new Error(`SEO generation failed: ${res.status} ${detail}`);
			}
			const data = await res.json();
			setAiSuggestions(data);

			if (!dryRun && data.mode !== "dry-run") {
				setTitle(data.product_name || aiProductName);
				setBody(data.meta_description || body);
				setAltText(data.alt_text_examples?.[0] || "");
				if (data.post_intent) {
					setPostIntent(data.post_intent);
				}
				if (data.campaign_phase) {
					setCampaignPhase(data.campaign_phase);
				}
				if (data.campaign_angle) {
					setCampaignAngle(data.campaign_angle);
				}
				if (data.visual_hook) {
					setVisualHook(data.visual_hook);
				}
				setSaveAsDraft(true);
				setApproveForSchedule(false);
				if (Array.isArray(data.keywords) && data.keywords.length > 0) {
					setUseAutoHashtags(false);
					setManualHashtags(
						data.keywords
							.map((keyword) => `#${String(keyword).replace(/\s+/g, "")}`)
							.join(" "),
					);
				}
			}

			return data;
		} finally {
			setIsGeneratingSeo(false);
		}
	};

	return {
		title,
		setTitle,
		body,
		setBody,
		image,
		setImage,
		mediaPath,
		setMediaPath,
		mediaType,
		setMediaType,
		altText,
		setAltText,
		selectedTargets,
		selectedPlatforms,
		toggleTarget,
		contentTags,
		setContentTags,
		distributionTags,
		setDistributionTags,
		scheduledAt,
		setScheduledAt,
		saveAsDraft,
		setSaveAsDraft,
		approveForSchedule,
		setApproveForSchedule,
		selectedProduct,
		setSelectedProduct,
		postIntent,
		setPostIntent,
		campaignPhase,
		setCampaignPhase,
		campaignAngle,
		setCampaignAngle,
		visualHook,
		setVisualHook,
		selectedProductProfile,
		useAutoHashtags,
		setUseAutoHashtags,
		manualHashtags,
		setManualHashtags,
		useAutoPlatformText,
		setUseAutoPlatformText,
		customText,
		setCustomText,
		autoAffiliateAmazon,
		setAutoAffiliateAmazon,
		includeProductLink,
		setIncludeProductLink,
		imageStatus,
		setImageStatus,
		imageConcept,
		setImageConcept,
		imagePrompt,
		setImagePrompt,
		aiProductName,
		setAiProductName,
		aiProductType,
		setAiProductType,
		aiAudience,
		setAiAudience,
		aiProvider,
		setAiProvider,
		aiSuggestions,
		isGeneratingSeo,
		generateSeoSuggestions,
		handleSubmit,
		seoVault,
		productProfiles,
		availablePlatforms: AVAILABLE_PLATFORMS,
		isEditing: hasPersistedId,
	};
};

export default usePostComposerState;
