/** @format */

import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useToast } from "@/Components/ui/use-toast";
import usePostComposerState from "../Components/PostComposer/usePostComposerState";
import PlatformSelector from "../Global/PostComposer/PlatformSelector";
import ImageUploader from "../Global/PostComposer/ImageUploader";
import CustomPlatformText from "../Global/PostComposer/CustomPlatformText";
import SeoProductSelector from "../Global/PostComposer/SeoProductSelector";

const API_BASE = import.meta.env?.VITE_API_BASE || "http://localhost:3001";

export default function PostComposer() {
  const location = useLocation();
  const navigate = useNavigate();
  const incomingDraft = location.state?.draft || null;
  const { toast } = useToast();

  const {
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
    autoAffiliateAmazon,
    setAutoAffiliateAmazon,
    handleSubmit,
    seoVault,
    availablePlatforms,
    isEditing,
  } = usePostComposerState(incomingDraft);

  const [statusMessage, setStatusMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [accountsByPlatform, setAccountsByPlatform] = useState({});
  const [accountsError, setAccountsError] = useState("");

  useEffect(() => {
    let ignore = false;
    async function loadAccounts() {
      try {
        const res = await fetch(`${API_BASE}/api/accounts`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (ignore) return;
        const grouped = data.reduce((acc, account) => {
          const platform = String(account.platform || "").toLowerCase();
          if (!platform) return acc;
          if (!acc[platform]) acc[platform] = [];
          acc[platform].push({
            id: account.id,
            label: account.label,
            metadata: account.metadata || {},
          });
          return acc;
        }, {});
        setAccountsByPlatform(grouped);
      } catch (error) {
        console.error("Failed to load accounts", error);
        if (!ignore) setAccountsError("Could not load linked accounts.");
      }
    }
    loadAccounts();
    return () => {
      ignore = true;
    };
  }, []);

  const submitLabel = isEditing ? "Update Post" : "Post It Now";

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
      if (error?.violations?.length) {
        toast({
          title: "Content needs a trim",
          description: error.violations[0].message,
        });
      } else {
        toast({
          title: "Submit failed",
          description: error.message || "Unexpected error while posting.",
        });
      }
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
        className="w-full p-2 bg-black text-green-400 border border-gray-600 mb-2 focus:border-green-400 focus:shadow-lg focus:shadow-green-500/50"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />

      <textarea
        placeholder="Write your post here..."
        className="w-full p-2 bg-black text-green-400 border border-gray-600 mb-2 min-h-[100px] focus:border-green-400 focus:shadow-lg focus:shadow-green-500/50"
        value={body}
        onChange={(e) => setBody(e.target.value)}
      />

      <ImageUploader
        image={image}
        setImage={setImage}
        mediaPath={mediaPath}
        setMediaPath={setMediaPath}
        mediaType={mediaType}
        setMediaType={setMediaType}
        altText={altText}
        setAltText={setAltText}
        selectedPlatforms={selectedPlatforms}
      />

      <PlatformSelector
        selectedTargets={selectedTargets}
        toggleTarget={toggleTarget}
        accountsByPlatform={accountsByPlatform}
        platforms={availablePlatforms}
      />
      {accountsError && (
        <p className="text-xs text-red-400 mb-3">{accountsError}</p>
      )}

      <div className="mb-4">
        <label className="text-green-400">
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
            className="w-full p-2 bg-black text-green-400 border border-gray-600 mt-2 focus:border-green-400 focus:shadow-lg focus:shadow-green-500/50"
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

        <label className="block mb-4 text-green-400">
          Schedule Post:
          <input
            type="datetime-local"
            value={scheduledAt || ""}
            onChange={(e) => setScheduledAt(e.target.value)}
            className="block p-2 bg-gray-800 text-green-400 border border-lime-400 focus:border-lime-400 focus:shadow-lg focus:shadow-lime-500/50"
          />
      </label>

      <label className="block mb-4 text-green-400">
        <input
          type="checkbox"
          checked={saveAsDraft}
          onChange={() => setSaveAsDraft(!saveAsDraft)}
          className="mr-2"
        />
        Save as Draft
      </label>

      <label className="block mb-4 text-green-400">
        <input
          type="checkbox"
          checked={autoAffiliateAmazon}
          onChange={() => setAutoAffiliateAmazon(!autoAffiliateAmazon)}
          className="mr-2"
        />
        Auto-tag Amazon links with my partner tag
      </label>

      <button
        className="bg-black text-green-400 border border-green-400 px-4 py-2 rounded hover:bg-green-400 hover:text-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:shadow-lg focus:shadow-green-500/50"
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
