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
  "amazon"
];

const usePostComposerState = () => {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [image, setImage] = useState(null);
  const [altText, setAltText] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState([]);
  const [scheduledAt, setScheduledAt] = useState(null);
  const [saveAsDraft, setSaveAsDraft] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState("");

  const [useAutoHashtags, setUseAutoHashtags] = useState(true);
  const [manualHashtags, setManualHashtags] = useState("");

  const [useAutoPlatformText, setUseAutoPlatformText] = useState(true);
  const [customText, setCustomText] = useState({});

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
  }, [selectedProduct]);

  const togglePlatform = (platform) => {
    setSelectedPlatforms((prev) =>
      prev.includes(platform)
        ? prev.filter((p) => p !== platform)
        : [...prev, platform]
    );
  };

  const handleSubmit = async () => {
    const postPayload = {
      title,
      body,
      image,
      platforms: selectedPlatforms,
      scheduledAt,
      saveAsDraft,
      hashtags: useAutoHashtags ? null : manualHashtags,
      platformOverrides: useAutoPlatformText ? null : customText,
      altText
    };

    const { postToAllPlatforms } = await import("../../scripts/postToAllPlatforms.js");
    const results = await postToAllPlatforms(postPayload, selectedPlatforms);
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
    availablePlatforms
  };
};

export default usePostComposerState;
