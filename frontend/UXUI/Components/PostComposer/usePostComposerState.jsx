/** @format */

import { useState, useEffect } from "react";
import seoVault from "../../../posts/seoVault.json";

const API_BASE = import.meta.env?.VITE_API_BASE || "http://localhost:3001";

const AVAILABLE_PLATFORMS = [
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

const usePostComposerState = (initialDraft = null) => {
	const hasPersistedId =
		initialDraft?.__hasRealId !== false && Boolean(initialDraft?.id);

	const [title, setTitle] = useState(initialDraft?.title || "");
	const [body, setBody] = useState(
		initialDraft?.body || initialDraft?.content || ""
	);
	const [image, setImage] = useState(initialDraft?.image || null);
	const [altText, setAltText] = useState(initialDraft?.altText || "");
	const [selectedPlatforms, setSelectedPlatforms] = useState(
		toArray(initialDraft?.platforms || initialDraft?.platform).map((p) =>
			String(p).toLowerCase()
		)
	);
	const [scheduledAt, setScheduledAt] = useState(
		toDateTimeLocal(initialDraft?.scheduledAt || initialDraft?.scheduled_at)
	);
	const [saveAsDraft, setSaveAsDraft] = useState(
		Boolean(initialDraft?.saveAsDraft || initialDraft?.status === "draft")
	);
	const [selectedProduct, setSelectedProduct] = useState("");

	const [useAutoHashtags, setUseAutoHashtags] = useState(
		!normalizeHashtags(initialDraft?.hashtags)
	);
	const [manualHashtags, setManualHashtags] = useState(
		normalizeHashtags(initialDraft?.hashtags)
	);

	const [useAutoPlatformText, setUseAutoPlatformText] = useState(
		!(initialDraft?.platformOverrides && Object.keys(initialDraft.platformOverrides).length > 0)
	);
	const [customText, setCustomText] = useState(
		initialDraft?.platformOverrides || {}
	);

	useEffect(() => {
		if (!selectedProduct) return;
		const seo = seoVault[selectedProduct];
		if (!seo) return;

		setTitle(seo.seo_human_pitch || "");
		setBody(seo.meta_description || "");
		setAltText(seo.alt_text_examples?.[0] || "");
		if (!useAutoHashtags && seo.hashtags?.All) {
			setManualHashtags(seo.hashtags.All.join(" "));
		}
	}, [selectedProduct, useAutoHashtags]);

	useEffect(() => {
		if (!initialDraft) return;
		setTitle(initialDraft.title || "");
		setBody(initialDraft.body || initialDraft.content || "");
		setImage(initialDraft.image || null);
		setAltText(initialDraft.altText || "");
		setSelectedPlatforms(
			toArray(initialDraft.platforms || initialDraft.platform).map((p) =>
				String(p).toLowerCase()
			)
		);
		setScheduledAt(
			toDateTimeLocal(initialDraft.scheduledAt || initialDraft.scheduled_at)
		);
		setSaveAsDraft(
			Boolean(initialDraft.saveAsDraft || initialDraft.status === "draft")
		);
		setUseAutoHashtags(!normalizeHashtags(initialDraft.hashtags));
		setManualHashtags(normalizeHashtags(initialDraft.hashtags));
		setUseAutoPlatformText(
			!(
				initialDraft.platformOverrides &&
				Object.keys(initialDraft.platformOverrides).length > 0
			)
		);
		setCustomText(initialDraft.platformOverrides || {});
	}, [initialDraft]);

	const togglePlatform = (platform) => {
		const key = String(platform).toLowerCase();
		setSelectedPlatforms((prev) =>
			prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key]
		);
	};

	const handleSubmit = async () => {
		const scheduledIso = scheduledAt
			? new Date(scheduledAt).toISOString()
			: null;

		const sharedPayload = {
			title,
			body,
			image,
			altText,
			platforms: selectedPlatforms,
			scheduledAt: scheduledIso,
			saveAsDraft,
			hashtags: useAutoHashtags ? null : manualHashtags,
			platformOverrides: useAutoPlatformText ? null : customText,
		};

		if (hasPersistedId) {
			const res = await fetch(`${API_BASE}/api/posts/${initialDraft.id}`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(sharedPayload),
			});
			if (!res.ok) {
				const errorText = await res.text();
				throw new Error(`Update failed: ${res.status} ${errorText}`);
			}
			return { mode: "update", data: await res.json() };
		}

		const { postToAllPlatforms } = await import(
			"../../scripts/postToAllPlatforms.js"
		);
		const results = await postToAllPlatforms(sharedPayload, selectedPlatforms);
		return { mode: "publish", data: results };
	};

	return {
		title,
		setTitle,
		body,
		setBody,
		image,
		setImage,
		altText,
		setAltText,
		selectedPlatforms,
		togglePlatform,
		scheduledAt,
		setScheduledAt,
		saveAsDraft,
		setSaveAsDraft,
		selectedProduct,
		setSelectedProduct,
		useAutoHashtags,
		setUseAutoHashtags,
		manualHashtags,
		setManualHashtags,
		useAutoPlatformText,
		setUseAutoPlatformText,
		customText,
		setCustomText,
		handleSubmit,
		seoVault,
		availablePlatforms: AVAILABLE_PLATFORMS,
		isEditing: hasPersistedId,
	};
};

export default usePostComposerState;
