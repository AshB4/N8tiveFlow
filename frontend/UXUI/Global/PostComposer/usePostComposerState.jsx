/** @format */

import { useState, useEffect } from "react";
import seoVault from "../../../posts/seoVault.json";

const availablePlatforms = [
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

const usePostComposerState = (incomingDraft = null) => {
	const isEditing = !!incomingDraft;
	const [title, setTitle] = useState(incomingDraft?.title || "");
	const [body, setBody] = useState(incomingDraft?.body || "");
	const [image, setImage] = useState(incomingDraft?.image || null);
	const [altText, setAltText] = useState(incomingDraft?.altText || "");
	const [selectedTargets, setSelectedTargets] = useState(incomingDraft?.targets || []);
	const [scheduledAt, setScheduledAt] = useState(incomingDraft?.scheduledAt || null);
	const [saveAsDraft, setSaveAsDraft] = useState(incomingDraft?.saveAsDraft || false);
	const [selectedProduct, setSelectedProduct] = useState(incomingDraft?.selectedProduct || "");
	const [useAutoHashtags, setUseAutoHashtags] = useState(incomingDraft?.useAutoHashtags ?? true);
	const [manualHashtags, setManualHashtags] = useState(incomingDraft?.manualHashtags || "");
	const [useAutoPlatformText, setUseAutoPlatformText] = useState(incomingDraft?.useAutoPlatformText ?? true);
	const [customText, setCustomText] = useState(incomingDraft?.customText || {});

	useEffect(() => {
		if (selectedProduct) {
			const seo = seoVault[selectedProduct];
			if (seo) {
				setTitle(seo.seo_human_pitch || "");
				setBody(seo.meta_description || "");
				setAltText(seo.alt_text_examples?.[0] || "");
				if (!useAutoHashtags && seo.hashtags?.All) {
					setManualHashtags(seo.hashtags.All.join(" "));
				}
			}
		}
	}, [selectedProduct, useAutoHashtags]);

	const toggleTarget = (platform, accountId = null) => {
		setSelectedTargets((prev) => {
			const exists = prev.some(
				(target) =>
					target.platform === platform &&
					(target.accountId ?? null) === (accountId ?? null),
			);
			if (exists) {
				return prev.filter(
					(target) =>
						!(target.platform === platform &&
							(target.accountId ?? null) === (accountId ?? null)),
				);
			} else {
				return [...prev, { platform, accountId }];
			}
		});
	};

	const handleSubmit = async () => {
		const postPayload = {
			title,
			body,
			image,
			scheduledAt,
			saveAsDraft,
			hashtags: useAutoHashtags ? null : manualHashtags,
			platformOverrides: useAutoPlatformText ? null : customText,
			altText,
		};

		const { postToAllPlatforms } = await import(
			"../../scripts/postToAllPlatforms.js"
		);
		const results = await postToAllPlatforms(postPayload, selectedTargets);
		console.log("Posted to:", results);
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
		selectedTargets,
		selectedPlatforms: selectedTargets.map(t => t.platform),
		toggleTarget,
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
		availablePlatforms,
		isEditing,
	};
};

export default usePostComposerState;
