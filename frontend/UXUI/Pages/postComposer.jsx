/** @format */

import { useState, useEffect } from "react";
import { postToAllPlatforms } from "../scripts/postToAllPlatforms";
import usePostComposerState from "../Global/PostComposer/usePostComposerState";
import PlatformSelector from "../Global/PostComposer/PlatformSelector";
import ImageUploader from "../Global/PostComposer/ImageUploader";
import CustomPlatformText from "../Global/PostComposer/CustomPlatformText";
import SeoProductSelector from "../Global/PostComposer/SeoProductSelector";

export default function PostComposer() {
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
  } = usePostComposerState();

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Post Composer</h1>

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
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        onClick={handleSubmit}
      >
        Post It
      </button>
    </div>
  );
}
