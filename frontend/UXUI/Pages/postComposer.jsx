/** @format */

import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useToast } from "@/Components/ui/use-toast";
import usePostComposerState from "../Components/PostComposer/usePostComposerState";
import PlatformSelector from "../Global/PostComposer/PlatformSelector";
import ImageUploader from "../Global/PostComposer/ImageUploader";
import CustomPlatformText from "../Global/PostComposer/CustomPlatformText";
import SeoProductSelector from "../Global/PostComposer/SeoProductSelector";
import { getPlatformProfile } from "../utils/platformProfiles";

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
    availablePlatforms,
    isEditing,
  } = usePostComposerState(incomingDraft);

  const [statusMessage, setStatusMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [accountsByPlatform, setAccountsByPlatform] = useState({});
  const [accountsError, setAccountsError] = useState("");
  const [platformHealth, setPlatformHealth] = useState([]);
  const [platformHealthError, setPlatformHealthError] = useState("");

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

  useEffect(() => {
    let ignore = false;
    async function loadPlatformHealth() {
      try {
        const res = await fetch(`${API_BASE}/api/platform-health`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!ignore) {
          setPlatformHealth(Array.isArray(data.results) ? data.results : []);
        }
      } catch (error) {
        console.error("Failed to load platform health", error);
        if (!ignore) {
          setPlatformHealthError("Could not load live platform health.");
        }
      }
    }
    loadPlatformHealth();
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

  const onGenerateSeo = async (dryRun = false) => {
    setStatusMessage(dryRun ? "Previewing AI prompt..." : "Generating SEO suggestions...");
    try {
      const result = await generateSeoSuggestions({ dryRun });
      if (result.mode === "dry-run") {
        setStatusMessage("Dry-run complete. Prompt preview loaded below.");
      } else {
        setStatusMessage("SEO suggestions generated and applied to the form.");
      }
    } catch (error) {
      setStatusMessage(error.message || "SEO generation failed.");
      toast({
        title: "SEO generation failed",
        description: error.message || "Unexpected error while generating suggestions.",
        variant: "destructive",
      });
    }
  };

  const handleHealthIssue = (health) => {
    toast({
      title: `${health.label || health.platform} unavailable`,
      description: `${health.summary}${health.errorCode ? ` · code ${health.errorCode}` : ""}${health.errorSubcode ? `/${health.errorSubcode}` : ""} — ${health.detail}`,
      variant: "destructive",
    });
  };

  const activeProfiles = selectedPlatforms
    .map((platform) => getPlatformProfile(platform))
    .filter(Boolean);

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

      <section className="mb-6 rounded border border-teal-700 bg-black/60 p-4">
        <h2 className="mb-3 text-lg font-semibold text-pink-400">AI SEO Suggestions</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <input
            type="text"
            placeholder="Product or post name"
            className="w-full p-2 bg-black text-green-400 border border-gray-600"
            value={aiProductName}
            onChange={(e) => setAiProductName(e.target.value)}
          />
          <input
            type="text"
            placeholder="Product type"
            className="w-full p-2 bg-black text-green-400 border border-gray-600"
            value={aiProductType}
            onChange={(e) => setAiProductType(e.target.value)}
          />
          <input
            type="text"
            placeholder="Audience"
            className="w-full p-2 bg-black text-green-400 border border-gray-600 md:col-span-2"
            value={aiAudience}
            onChange={(e) => setAiAudience(e.target.value)}
          />
          <select
            className="w-full p-2 bg-black text-green-400 border border-gray-600"
            value={aiProvider}
            onChange={(e) => setAiProvider(e.target.value)}
          >
            <option value="ollama">Ollama</option>
            <option value="openai">OpenAI</option>
          </select>
          <div className="flex gap-3">
            <button
              type="button"
              className="bg-black text-green-400 border border-green-400 px-4 py-2 rounded hover:bg-green-400 hover:text-black transition-colors disabled:opacity-50"
              onClick={() => onGenerateSeo(false)}
              disabled={isGeneratingSeo}
            >
              {isGeneratingSeo ? "Generating..." : "Generate Suggestions"}
            </button>
            <button
              type="button"
              className="bg-black text-teal-300 border border-teal-500 px-4 py-2 rounded hover:bg-teal-500 hover:text-black transition-colors disabled:opacity-50"
              onClick={() => onGenerateSeo(true)}
              disabled={isGeneratingSeo}
            >
              Dry Run
            </button>
          </div>
        </div>

        {aiSuggestions && (
          <div className="mt-4 rounded border border-pink-700 bg-zinc-950/80 p-4 text-sm text-teal-200">
            {"mode" in aiSuggestions ? (
              <pre className="overflow-auto whitespace-pre-wrap">{aiSuggestions.prompt}</pre>
            ) : (
              <div className="space-y-2">
                <p><span className="text-pink-300">Keywords:</span> {aiSuggestions.keywords?.join(", ") || "—"}</p>
                <p><span className="text-pink-300">Meta:</span> {aiSuggestions.meta_description || "—"}</p>
                <p><span className="text-pink-300">Pitch:</span> {aiSuggestions.seo_human_pitch || "—"}</p>
                <p><span className="text-pink-300">Search queries:</span> {aiSuggestions.desperate_search_queries?.join(" | ") || "—"}</p>
              </div>
            )}
          </div>
        )}
      </section>

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
        healthResults={platformHealth}
        onHealthIssue={handleHealthIssue}
      />
      {accountsError && (
        <p className="text-xs text-red-400 mb-3">{accountsError}</p>
      )}
      {platformHealthError && (
        <p className="text-xs text-red-400 mb-3">{platformHealthError}</p>
      )}

      <section className="mb-6 rounded border border-pink-700 bg-black/60 p-4">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-lg font-semibold text-pink-400">Platform Writing Guidance</h2>
            <p className="text-sm text-teal-400">
              Use this to match platform expectations before posting or generating AI variants.
            </p>
          </div>
        </div>

        {activeProfiles.length === 0 ? (
          <p className="text-sm text-teal-300">
            Select one or more platforms to load tone, structure, CTA, and audience guidance here.
          </p>
        ) : (
          <div className="space-y-4">
            {activeProfiles.map((profile) => (
              <div
                key={profile.id}
                className="rounded border border-teal-700 bg-zinc-950/80 p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                  <h3 className="text-lg text-pink-300">{profile.label}</h3>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full border border-teal-700 px-2 py-1 text-teal-300">
                      links: {profile.linkTolerance}
                    </span>
                    <span className="rounded-full border border-teal-700 px-2 py-1 text-teal-300">
                      humor: {profile.humorTolerance}
                    </span>
                    <span className="rounded-full border border-teal-700 px-2 py-1 text-teal-300">
                      emoji: {profile.emojiTolerance}
                    </span>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2 text-sm">
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-teal-500 mb-1">Audience</p>
                      <p className="text-teal-200">{profile.audienceExpectation}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-teal-500 mb-1">Voice</p>
                      <p className="text-teal-200">{profile.voice}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-teal-500 mb-1">CTA Style</p>
                      <p className="text-teal-200">{profile.ctaStyle}</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-teal-500 mb-1">Best Formats</p>
                      <p className="text-teal-200">{profile.bestFormats.join(", ")}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-teal-500 mb-1">Avoid</p>
                      <p className="text-red-300">{profile.avoid.join(", ")}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-2 text-sm">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-teal-500 mb-2">Structure Rules</p>
                    <ul className="space-y-1 text-teal-200">
                      {profile.structureRules.map((rule) => (
                        <li key={rule}>• {rule}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-teal-500 mb-2">Good Openers</p>
                    <ul className="space-y-1 text-teal-200">
                      {profile.openerPatterns.map((pattern) => (
                        <li key={pattern}>• {pattern}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {profile.notes?.length > 0 && (
                  <div className="mt-4">
                    <p className="text-xs uppercase tracking-[0.3em] text-teal-500 mb-2">Notes</p>
                    <ul className="space-y-1 text-teal-300 text-sm">
                      {profile.notes.map((note) => (
                        <li key={note}>• {note}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

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
