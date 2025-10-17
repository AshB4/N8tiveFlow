/** @format */

import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import usePostComposerState from "../Global/PostComposer/usePostComposerState";
import PlatformSelector from "../Global/PostComposer/PlatformSelector";
import ImageUploader from "../Global/PostComposer/ImageUploader";
import CustomPlatformText from "../Global/PostComposer/CustomPlatformText";
import SeoProductSelector from "../Global/PostComposer/SeoProductSelector";

export default function PostComposer() {
  const location = useLocation();
  const navigate = useNavigate();
  const incomingDraft = location.state?.draft || null;

  const {
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
    availablePlatforms,
    isEditing,
  } = usePostComposerState(incomingDraft);

  const [statusMessage, setStatusMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitLabel = isEditing ? "Update Post" : "Post It";

  const onSubmit = async () => {
    setIsSubmitting(true);
    setStatusMessage(isEditing ? "Updating draft..." : "Launching post...");
    try {
      const result = await handleSubmit();
      if (result.mode === "update") {
        setStatusMessage("Draft updated! Back to the calendar?");
        navigate("/", { replace: true });
      } else {
        setStatusMessage("Posted across the chosen platforms!");
      }
    } catch (error) {
      console.error(error);
      setStatusMessage(error.message || "Something glitched during submit.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <div className="flex items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold">Post Composer</h1>
        <div className="flex gap-3">
          <Link
            to="/"
            className="px-3 py-2 border border-pink-500 text-pink-400 rounded hover:bg-pink-500 hover:text-black transition-colors"
          >
            ⬅ Home
          </Link>
          <Link
            to="/lab"
            className="px-3 py-2 border border-teal-500 text-teal-300 rounded hover:bg-teal-500 hover:text-black transition-colors"
          >
            ⚗️ Lab
          </Link>
        </div>
      </div>

      <SeoProductSelector
        selectedProduct={selectedProduct}
        setSelectedProduct={setSelectedProduct}
        seoVault={seoVault}
      />

      <input
        type="text"
        placeholder="Title"
        className="w-full p-2 border mb-2"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />

      <textarea
        placeholder="Write your post here..."
        className="w-full p-2 border mb-2 min-h-[100px]"
        value={body}
        onChange={(e) => setBody(e.target.value)}
      />

      <ImageUploader
        image={image}
        setImage={setImage}
        altText={altText}
        setAltText={setAltText}
        selectedPlatforms={selectedPlatforms}
      />

      <PlatformSelector
        selectedPlatforms={selectedPlatforms}
        togglePlatform={togglePlatform}
        platforms={availablePlatforms}
      />

      <div className="mb-4">
        <label>
          <input
            type="checkbox"
            checked={useAutoHashtags}
            onChange={() => setUseAutoHashtags(!useAutoHashtags)}
            className="mr-2"
          />
          Auto-generate hashtags
        </label>
        {!useAutoHashtags && (
          <textarea
            placeholder="#hashtag1 #hashtag2"
            className="w-full p-2 border mt-2"
            value={manualHashtags}
            onChange={(e) => setManualHashtags(e.target.value)}
          />
        )}
      </div>

      <CustomPlatformText
        useAutoPlatformText={useAutoPlatformText}
        setUseAutoPlatformText={setUseAutoPlatformText}
        selectedPlatforms={selectedPlatforms}
        customText={customText}
        setCustomText={setCustomText}
      />

      <label className="block mb-4">
        Schedule Post:
        <input
          type="datetime-local"
          value={scheduledAt || ""}
          onChange={(e) => setScheduledAt(e.target.value)}
          className="block p-2 border"
        />
      </label>

      <label className="block mb-4">
        <input
          type="checkbox"
          checked={saveAsDraft}
          onChange={() => setSaveAsDraft(!saveAsDraft)}
          className="mr-2"
        />
        Save as Draft
      </label>

      <button
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        onClick={onSubmit}
        disabled={isSubmitting}
      >
        {isSubmitting ? "Working..." : submitLabel}
      </button>

      {statusMessage && (
        <p className="mt-3 text-sm text-gray-200 bg-gray-900 p-2 rounded">
          {statusMessage}
        </p>
      )}
    </div>
  );
}
