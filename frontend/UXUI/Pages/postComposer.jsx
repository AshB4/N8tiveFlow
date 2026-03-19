/** @format */

import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useToast } from "@/Components/ui/use-toast";
import usePostComposerState from "../Components/PostComposer/usePostComposerState";
import AppTopNav from "../Components/AppTopNav";
import PlatformSelector from "../Global/PostComposer/PlatformSelector";
import ImageUploader from "../Global/PostComposer/ImageUploader";
import CustomPlatformText from "../Global/PostComposer/CustomPlatformText";
import SeoProductSelector from "../Global/PostComposer/SeoProductSelector";
import { getPlatformProfile } from "../utils/platformProfiles";

const API_BASE = import.meta.env?.VITE_API_BASE || "http://localhost:3001";
const DEFAULT_ROTATION_SETTINGS = {
  cadenceDays: 1,
  defaultTime: "10:00",
};

function addDaysToDateOnly(dateValue, daysToAdd) {
  if (!dateValue) return "";
  const [year, month, day] = dateValue.split("-").map(Number);
  const next = new Date(year, month - 1, day + daysToAdd, 12, 0, 0, 0);
  return next.toISOString().slice(0, 10);
}

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
    availablePlatforms,
    isEditing,
  } = usePostComposerState(incomingDraft);

  const [statusMessage, setStatusMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAutoScheduling, setIsAutoScheduling] = useState(false);
  const [accountsByPlatform, setAccountsByPlatform] = useState({});
  const [accountsError, setAccountsError] = useState("");
  const [platformHealth, setPlatformHealth] = useState([]);
  const [platformHealthError, setPlatformHealthError] = useState("");
  const hasAiContext = Boolean(
    selectedProduct ||
    aiProductName?.trim() ||
    title?.trim()
  );
  const displayedAiTitle = aiSuggestions?.product_name || aiProductName || title || "";
  const displayedAiBody = aiSuggestions?.meta_description || "";
  const displayedAiAltText = aiSuggestions?.alt_text_examples?.[0] || "";
  const displayedAiHashtags = Array.isArray(aiSuggestions?.keywords)
    ? aiSuggestions.keywords.map((keyword) => `#${String(keyword).replace(/\s+/g, "")}`).join(" ")
    : "";
  const displayedAiIntent = aiSuggestions?.post_intent || postIntent || "";
  const displayedCampaignPhase = aiSuggestions?.campaign_phase || campaignPhase || "";
  const displayedCampaignAngle = aiSuggestions?.campaign_angle || campaignAngle || "";
  const displayedVisualHook = aiSuggestions?.visual_hook || visualHook || "";
  const displayedAiImageConcept = aiSuggestions?.image_concept || "";
  const displayedAiImagePrompt = aiSuggestions?.image_prompt || "";
  const displayedAiHook = aiSuggestions?.hook_options?.[0] || "";

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

  const submitLabel = saveAsDraft
    ? isEditing
      ? "Update Draft"
      : "Save Draft"
    : approveForSchedule
    ? isEditing
      ? "Update + Approve"
      : "Save + Approve"
    : isEditing
    ? "Update Queue Entry"
    : "Save to Queue";

  const onSubmit = async () => {
    setIsSubmitting(true);
    setStatusMessage(isEditing ? "Saving queue changes..." : "Saving to queue...");
    try {
      const result = await handleSubmit();
      if (result.mode === "update") {
        setStatusMessage(
          result.data?.status === "approved"
            ? "Queue entry updated and approved for scheduling."
            : "Draft updated in the queue."
        );
      } else {
        setStatusMessage(
          result.data?.status === "approved"
            ? "Saved and approved. The worker can publish it on schedule."
            : "Saved to the queue as a draft."
        );
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

  const onApproveAndScheduleNextOpenDay = async () => {
    setIsAutoScheduling(true);
    setStatusMessage("Finding the next open day and scheduling this post...");
    try {
      const [settingsRes, postsRes] = await Promise.all([
        fetch(`${API_BASE}/api/settings/rotation`),
        fetch(`${API_BASE}/api/posts`),
      ]);

      const settingsData = settingsRes.ok ? await settingsRes.json() : {};
      const postsData = postsRes.ok ? await postsRes.json() : [];
      const rotationSettings = {
        ...DEFAULT_ROTATION_SETTINGS,
        ...(settingsData || {}),
      };
      const cadence = Math.max(1, Number(rotationSettings.cadenceDays || 1));
      const defaultTime = String(rotationSettings.defaultTime || "10:00");
      const latestScheduledAt =
        [...(Array.isArray(postsData) ? postsData : [])]
          .map((post) => post.scheduledAt || post.scheduled_at)
          .filter(Boolean)
          .sort()
          .at(-1) || null;

      let nextScheduledAt;
      if (latestScheduledAt) {
        const latest = new Date(latestScheduledAt);
        const nextDate = addDaysToDateOnly(latest.toISOString().slice(0, 10), cadence);
        nextScheduledAt = new Date(`${nextDate}T${defaultTime}:00`);
      } else {
        const now = new Date();
        const today = now.toISOString().slice(0, 10);
        const candidate = new Date(`${today}T${defaultTime}:00`);
        nextScheduledAt =
          candidate.getTime() > now.getTime()
            ? candidate
            : new Date(`${addDaysToDateOnly(today, cadence)}T${defaultTime}:00`);
      }

      const result = await handleSubmit({
        status: "approved",
        scheduledAt: nextScheduledAt.toISOString(),
      });
      setSaveAsDraft(false);
      setApproveForSchedule(true);
      setScheduledAt(nextScheduledAt.toISOString().slice(0, 16));
      setStatusMessage(
        `Scheduled for ${nextScheduledAt.toLocaleString()}. Added to the calendar-ready queue.`,
      );
      toast({
        title: "Scheduled, darling",
        description:
          result?.data?.title
            ? `${result.data.title} is set for ${nextScheduledAt.toLocaleString()}.`
            : `Post scheduled for ${nextScheduledAt.toLocaleString()}.`,
      });
    } catch (error) {
      console.error(error);
      setStatusMessage(error.message || "Could not auto-schedule this post.");
      toast({
        title: "Auto schedule failed",
        description: error.message || "Unexpected error while scheduling the next open day.",
        variant: "destructive",
      });
    } finally {
      setIsAutoScheduling(false);
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

  const applyAiTitle = () => {
    if (displayedAiTitle) setTitle(displayedAiTitle);
  };

  const applyAiBody = () => {
    const nextBody = displayedAiBody || displayedAiHook;
    if (nextBody) setBody(nextBody);
  };

  const applyAiHashtags = () => {
    if (!displayedAiHashtags) return;
    setUseAutoHashtags(false);
    setManualHashtags(displayedAiHashtags);
  };

  const applyAiAltText = () => {
    if (displayedAiAltText) setAltText(displayedAiAltText);
  };

  const applyAiImagePlan = () => {
    if (displayedAiImageConcept) setImageConcept(displayedAiImageConcept);
    if (displayedAiImagePrompt) setImagePrompt(displayedAiImagePrompt);
  };

  const applyAllAi = () => {
    applyAiTitle();
    applyAiBody();
    applyAiHashtags();
    applyAiAltText();
    applyAiImagePlan();
    if (displayedAiIntent) setPostIntent(displayedAiIntent);
    if (displayedCampaignPhase) setCampaignPhase(displayedCampaignPhase);
    if (displayedCampaignAngle) setCampaignAngle(displayedCampaignAngle);
    if (displayedVisualHook) setVisualHook(displayedVisualHook);
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
      <AppTopNav />
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
        productProfiles={productProfiles}
      />

      {selectedProductProfile && (
        <section className="mb-6 rounded border border-amber-600 bg-black/60 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-amber-400">
                Product Profile
              </p>
              <h2 className="text-xl text-pink-300 mt-1">{selectedProductProfile.label}</h2>
            </div>
            <span className="rounded-full border border-amber-500 px-3 py-1 text-xs text-amber-200">
              {selectedProductProfile.category}
            </span>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2 text-sm">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-teal-500 mb-1">Audience</p>
              <p className="text-teal-200">{selectedProductProfile.audience}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-teal-500 mb-1">Primary Goal</p>
              <p className="text-teal-200">{selectedProductProfile.primaryGoal}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-teal-500 mb-1">Voice</p>
              <p className="text-teal-200">{selectedProductProfile.brandVoice}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-teal-500 mb-1">Best Channels</p>
              <p className="text-teal-200">{selectedProductProfile.promotionChannels.join(", ")}</p>
            </div>
          </div>

          {selectedProductProfile.notes?.length > 0 && (
            <div className="mt-4">
              <p className="text-xs uppercase tracking-[0.3em] text-teal-500 mb-2">Product Notes</p>
              <ul className="space-y-1 text-teal-300 text-sm">
                {selectedProductProfile.notes.map((note) => (
                  <li key={note}>• {note}</li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      <section className="mb-6 rounded border border-cyan-700 bg-black/60 p-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <h2 className="text-lg font-semibold text-cyan-300">Post Intent</h2>
            <p className="text-sm text-teal-400">
              Choose whether this is a value post, a direct sell, a story, or a softer reminder.
            </p>
            <select
              className="mt-3 min-w-[220px] rounded border border-cyan-500 bg-black p-2 text-cyan-200"
              value={postIntent}
              onChange={(e) => setPostIntent(e.target.value)}
            >
              <option value="jab">Jab</option>
              <option value="punch">Punch</option>
              <option value="soft-sell">Soft Sell</option>
              <option value="educational">Educational</option>
              <option value="story">Story</option>
              <option value="launch">Launch</option>
              <option value="reminder">Reminder</option>
            </select>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-cyan-300">Campaign Phase</h2>
            <p className="text-sm text-teal-400">
              Tell the system whether this is a teaser, launch push, follow-up, or evergreen discovery post.
            </p>
            <select
              className="mt-3 min-w-[220px] rounded border border-cyan-500 bg-black p-2 text-cyan-200"
              value={campaignPhase}
              onChange={(e) => setCampaignPhase(e.target.value)}
            >
              <option value="teaser">Teaser</option>
              <option value="launch">Launch</option>
              <option value="follow_up">Follow-up</option>
              <option value="evergreen">Evergreen</option>
            </select>
          </div>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium text-cyan-300">Campaign Angle</span>
            <input
              className="mt-2 w-full rounded border border-cyan-500 bg-black p-2 text-cyan-100"
              value={campaignAngle}
              onChange={(e) => setCampaignAngle(e.target.value)}
              placeholder="Specific framing for this phase"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-cyan-300">Visual Hook</span>
            <input
              className="mt-2 w-full rounded border border-cyan-500 bg-black p-2 text-cyan-100"
              value={visualHook}
              onChange={(e) => setVisualHook(e.target.value)}
              placeholder="Short visual sentence for thumbnails or pins"
            />
          </label>
        </div>
      </section>

      <section className="mb-6 rounded border border-green-700 bg-black/60 p-4">
        <h2 className="mb-3 text-lg font-semibold text-pink-400">Draft</h2>
        <input
          type="text"
          placeholder="Title"
          className="w-full p-2 bg-black text-green-400 border border-gray-600 mb-2 focus:border-green-400 focus:shadow-lg focus:shadow-green-500/50"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <textarea
          placeholder="Write your post here..."
          className="w-full p-2 bg-black text-green-400 border border-gray-600 min-h-[100px] focus:border-green-400 focus:shadow-lg focus:shadow-green-500/50"
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
      </section>

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
          <label className="block">
            <span className="mb-2 block text-xs uppercase tracking-[0.3em] text-teal-400">
              AI Provider
            </span>
            <select
              className="w-full rounded border border-teal-500 bg-black p-2 text-green-300"
              value={aiProvider}
              onChange={(e) => setAiProvider(e.target.value)}
            >
              <option value="ollama">Ollama</option>
              <option value="openai">OpenAI</option>
            </select>
          </label>
          <div className="flex gap-3">
            <button
              type="button"
              className="bg-black text-green-400 border border-green-400 px-4 py-2 rounded hover:bg-green-400 hover:text-black transition-colors disabled:opacity-50"
              onClick={() => onGenerateSeo(false)}
              disabled={isGeneratingSeo || !hasAiContext}
            >
              {isGeneratingSeo ? "Generating..." : "Generate Suggestions"}
            </button>
            <button
              type="button"
              className="bg-black text-teal-300 border border-teal-500 px-4 py-2 rounded hover:bg-teal-500 hover:text-black transition-colors disabled:opacity-50"
              onClick={() => onGenerateSeo(true)}
              disabled={isGeneratingSeo || !hasAiContext}
            >
              Dry Run
            </button>
          </div>
        </div>

        <div className="mt-3 text-xs text-teal-400">
          Current provider: <span className="text-pink-300">{aiProvider}</span>. Generate Suggestions fills the response tray below. Dry Run only shows the prompt preview.
        </div>
        {!hasAiContext && (
          <div className="mt-3 rounded border border-dashed border-teal-700 bg-black/40 p-4 text-sm text-teal-300">
            Pick a product profile or type a title idea first. Once you give the AI something to work from,
            suggestions and prompt previews will show up here.
          </div>
        )}

        {aiSuggestions && (
          <div className="mt-4 rounded border border-pink-700 bg-zinc-950/80 p-4 text-sm text-teal-200">
            {"mode" in aiSuggestions ? (
              <div className="space-y-3">
                <p className="text-pink-300 text-xs uppercase tracking-[0.3em]">Prompt Preview</p>
                <pre className="overflow-auto whitespace-pre-wrap">{aiSuggestions.prompt}</pre>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <p className="text-pink-300 text-xs uppercase tracking-[0.3em]">AI Results</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={applyAllAi}
                      className="rounded border border-lime-500 px-3 py-2 text-xs text-lime-200 hover:bg-lime-500 hover:text-black"
                    >
                      Use All
                    </button>
                    <button
                      type="button"
                      onClick={applyAiTitle}
                      className="rounded border border-teal-500 px-3 py-2 text-xs text-teal-200 hover:bg-teal-500 hover:text-black"
                    >
                      Use Title
                    </button>
                    <button
                      type="button"
                      onClick={applyAiBody}
                      className="rounded border border-teal-500 px-3 py-2 text-xs text-teal-200 hover:bg-teal-500 hover:text-black"
                    >
                      Use Body
                    </button>
                    <button
                      type="button"
                      onClick={applyAiHashtags}
                      className="rounded border border-teal-500 px-3 py-2 text-xs text-teal-200 hover:bg-teal-500 hover:text-black"
                    >
                      Use Hashtags
                    </button>
                    <button
                      type="button"
                      onClick={applyAiAltText}
                      className="rounded border border-teal-500 px-3 py-2 text-xs text-teal-200 hover:bg-teal-500 hover:text-black"
                    >
                      Use Alt Text
                    </button>
                    <button
                      type="button"
                      onClick={applyAiImagePlan}
                      className="rounded border border-teal-500 px-3 py-2 text-xs text-teal-200 hover:bg-teal-500 hover:text-black"
                    >
                      Use Image Plan
                    </button>
                  </div>
                  <p className="mt-2"><span className="text-pink-300">Suggested intent:</span> {displayedAiIntent || "—"}</p>
                  <p className="mt-2"><span className="text-pink-300">Campaign phase:</span> {displayedCampaignPhase || "—"}</p>
                  <p className="mt-2"><span className="text-pink-300">Campaign angle:</span> {displayedCampaignAngle || "—"}</p>
                  <p className="mt-2"><span className="text-pink-300">Visual hook:</span> {displayedVisualHook || "—"}</p>
                  <p className="mt-2"><span className="text-pink-300">Suggested title:</span> {displayedAiTitle || "—"}</p>
                  <p className="mt-2"><span className="text-pink-300">Suggested body:</span></p>
                  <div className="mt-1 whitespace-pre-wrap rounded border border-teal-800 bg-black/40 p-3">
                    {displayedAiBody || "—"}
                  </div>
                  <p className="mt-2"><span className="text-pink-300">Suggested hashtags:</span> {displayedAiHashtags || "—"}</p>
                  <p className="mt-2"><span className="text-pink-300">Suggested alt text:</span> {displayedAiAltText || "—"}</p>
                  <p className="mt-2"><span className="text-pink-300">Image concept:</span> {displayedAiImageConcept || "—"}</p>
                  <p className="mt-2"><span className="text-pink-300">Image prompt:</span> {displayedAiImagePrompt || "—"}</p>
                </div>

                <div className="rounded border border-amber-700 bg-black/40 p-3">
                  <p className="text-amber-300 text-xs uppercase tracking-[0.3em]">Applied To Form</p>
                  <p className="mt-2 text-teal-200">
                    Use the buttons above to pull pieces into the draft. This keeps single-post AI visible on `/compose` instead of feeling like it disappeared.
                  </p>
                </div>

                <div className="space-y-2">
                  <p><span className="text-pink-300">Keywords:</span> {aiSuggestions.keywords?.join(", ") || "—"}</p>
                  <p><span className="text-pink-300">Meta:</span> {aiSuggestions.meta_description || "—"}</p>
                  <p><span className="text-pink-300">Pitch:</span> {aiSuggestions.seo_human_pitch || "—"}</p>
                  <p><span className="text-pink-300">Search queries:</span> {aiSuggestions.desperate_search_queries?.join(" | ") || "—"}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </section>

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

      <section className="mb-6 rounded border border-amber-600 bg-black/60 p-4">
        <h2 className="text-lg font-semibold text-pink-400 mb-3">Image Plan</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <label className="block">
            <span className="text-sm text-teal-300">Image status</span>
            <select
              value={imageStatus}
              onChange={(e) => setImageStatus(e.target.value)}
              className="mt-2 w-full p-2 bg-black text-green-400 border border-gray-600"
            >
              <option value="attached">Attached</option>
              <option value="prompt-needed">Prompt Needed</option>
              <option value="optional">Optional</option>
            </select>
          </label>
          <label className="block md:col-span-2">
            <span className="text-sm text-teal-300">Image concept</span>
            <input
              type="text"
              value={imageConcept}
              onChange={(e) => setImageConcept(e.target.value)}
              placeholder="Glitchy dashboard, cozy spooky coloring page, bee-themed playful cover..."
              className="mt-2 w-full p-2 bg-black text-green-400 border border-gray-600"
            />
          </label>
        </div>
        <label className="block mt-4">
          <span className="text-sm text-teal-300">Image prompt</span>
          <textarea
            value={imagePrompt}
            onChange={(e) => setImagePrompt(e.target.value)}
            placeholder="Generator-ready prompt for the image you want to make on posting day"
            className="mt-2 w-full p-2 bg-black text-green-400 border border-gray-600 min-h-[110px]"
          />
        </label>
        <p className="mt-2 text-xs text-teal-500">
          Use this when nothing is auto yet: save the concept or prompt now, then generate or attach the image on posting day.
        </p>
      </section>

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

      <section className="mb-6 rounded border border-teal-700 bg-black/60 p-4">
        <h2 className="text-lg font-semibold text-pink-400 mb-3">Tags</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="text-sm text-teal-300">Content tags</span>
            <textarea
              value={contentTags}
              onChange={(e) => setContentTags(e.target.value)}
              placeholder="goblin, burnout, self-care, kawaii, founders"
              className="mt-2 w-full p-2 bg-black text-green-400 border border-gray-600 min-h-[90px]"
            />
            <p className="mt-1 text-xs text-teal-500">
              Topic and campaign meaning. These help organize and describe the post.
            </p>
          </label>

          <label className="block">
            <span className="text-sm text-teal-300">Distribution tags</span>
            <textarea
              value={distributionTags}
              onChange={(e) => setDistributionTags(e.target.value)}
              placeholder="post:facebook, post:pinterest, post:instagram"
              className="mt-2 w-full p-2 bg-black text-green-400 border border-gray-600 min-h-[90px]"
            />
            <p className="mt-1 text-xs text-teal-500">
              Use tags like <code>post:facebook</code>. These auto-fill routing targets.
            </p>
          </label>
        </div>
      </section>

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
          onChange={() => {
            const nextValue = !saveAsDraft;
            setSaveAsDraft(nextValue);
            if (nextValue) {
              setApproveForSchedule(false);
            }
          }}
          className="mr-2"
        />
        Keep as draft
      </label>

      <label className="block mb-4 text-green-400">
        <input
          type="checkbox"
          checked={approveForSchedule}
          disabled={saveAsDraft}
          onChange={() => setApproveForSchedule(!approveForSchedule)}
          className="mr-2"
        />
        Approve for scheduled posting
      </label>
      <p className="mb-4 text-xs text-teal-400">
        If you wrote it yourself, leave approval on. AI-generated copy defaults back to draft until you approve it.
      </p>

      <label className="block mb-4 text-green-400">
        <input
          type="checkbox"
          checked={includeProductLink}
          onChange={() => setIncludeProductLink(!includeProductLink)}
          className="mr-2"
        />
        Include product link in outgoing copy
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
        disabled={isSubmitting || isAutoScheduling}
      >
        {isSubmitting ? "Working..." : submitLabel}
      </button>
      <button
        className="ml-3 bg-black text-cyan-200 border border-cyan-500 px-4 py-2 rounded hover:bg-cyan-500 hover:text-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        onClick={onApproveAndScheduleNextOpenDay}
        disabled={isSubmitting || isAutoScheduling}
      >
        {isAutoScheduling ? "Scheduling..." : "Approve + Schedule Next Open Day"}
      </button>

      {statusMessage && (
        <p className="mt-3 text-sm text-gray-200 bg-gray-900 p-2 rounded">
          {statusMessage}
        </p>
      )}
    </div>
  );
}
