import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppTopNav from "../Components/AppTopNav";
import { useToast } from "@/Components/ui/use-toast";
import { productProfiles, getProductProfile } from "../utils/productProfiles";

const API_BASE = import.meta.env?.VITE_API_BASE || "http://localhost:3001";

const PLATFORM_OPTIONS = [
  "facebook",
  "instagram",
  "pinterest",
  "amazon",
  "devto",
  "linkedin",
  "x",
  "reddit",
  "threads",
];

const emptyDefaults = {
  productId: "",
  postIntent: "jab",
  campaignPhase: "evergreen",
  platforms: ["facebook", "instagram"],
  contentTags: "",
};

const DEFAULT_ROTATION_SETTINGS = {
  cadenceDays: 1,
  defaultTime: "10:00",
};

const isUnscheduledQueuePost = (post) => !(post?.scheduledAt || post?.scheduled_at);

function normalizeList(value) {
  if (Array.isArray(value)) {
    return [...new Set(value.map((item) => String(item || "").trim()).filter(Boolean))];
  }
  return [...new Set(String(value || "")
    .split(/[,\n]/)
    .map((item) => item.trim())
    .filter(Boolean))];
}

function parseJsonInput(raw) {
  const parsed = JSON.parse(raw);
  if (Array.isArray(parsed)) return parsed;
  if (Array.isArray(parsed?.posts)) return parsed.posts;
  if (Array.isArray(parsed?.items)) return parsed.items;
  throw new Error("JSON must be an array or include a posts/items array.");
}

function parseLooseBlocks(raw) {
  const chunks = String(raw || "")
    .split(/\n(?=#\s*Post\b|Title:|Hook:|\*\*Hook\*\*)/i)
    .map((chunk) => chunk.trim())
    .filter(Boolean);

  return chunks
    .map((chunk) => {
      const lines = chunk.split("\n");
      const fields = {};
      let currentField = null;

      const commitLine = (line) => {
        const trimmed = line.trim();
        if (!trimmed || /^#\s*Post\b/i.test(trimmed) || /^---+$/.test(trimmed)) return;

        const strongMatch = trimmed.match(/^\*\*(.+?)\*\*$/);
        if (strongMatch) {
          currentField = strongMatch[1].toLowerCase();
          if (!fields[currentField]) fields[currentField] = [];
          return;
        }

        const keyValueMatch = trimmed.match(/^([A-Za-z][A-Za-z\s/_-]+):\s*(.*)$/);
        if (keyValueMatch) {
          currentField = keyValueMatch[1].trim().toLowerCase();
          if (!fields[currentField]) fields[currentField] = [];
          if (keyValueMatch[2]) fields[currentField].push(keyValueMatch[2].trim());
          return;
        }

        if (!currentField) currentField = "body";
        if (!fields[currentField]) fields[currentField] = [];
        fields[currentField].push(line);
      };

      lines.forEach(commitLine);

      const hook = (fields.hook || fields.title || []).join("\n").trim();
      const body = (fields.body || fields.caption || []).join("\n").trim();
      const cta = (fields.cta || []).join("\n").trim();
      const imageIdea = (fields["image idea"] || fields["image prompt"] || fields.visual || []).join("\n").trim();
      const title = hook || (fields.title || []).join("\n").trim();

      if (!title && !body) return null;

      return {
        title,
        body,
        cta,
        imageIdea,
        hashtags: (fields.hashtags || []).join(" ").trim(),
        platforms: (fields.platforms || []).join(",").trim(),
        postIntent: (fields["post intent"] || []).join(" ").trim(),
        campaignPhase: (fields["campaign phase"] || []).join(" ").trim(),
        campaignAngle: (fields["campaign angle"] || []).join(" ").trim(),
        visualHook: (fields["visual hook"] || []).join(" ").trim(),
        product: (fields.product || []).join(" ").trim(),
      };
    })
    .filter(Boolean);
}

function parseBatchInput(raw) {
  const trimmed = String(raw || "").trim();
  if (!trimmed) return [];
  if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
    return parseJsonInput(trimmed);
  }
  return parseLooseBlocks(trimmed);
}

function buildPostPayload(entry, defaults) {
  const productId = entry.productId || defaults.productId || "";
  const productProfile = getProductProfile(productId);
  const platforms = normalizeList(entry.platforms || defaults.platforms);
  const contentTags = normalizeList([defaults.contentTags, entry.contentTags].filter(Boolean).join(","));
  const hashtags = normalizeList(entry.hashtags).map((tag) => (tag.startsWith("#") ? tag : `#${tag}`));
  const distributionTags = platforms.map((platform) => `post:${platform}`);
  const title = String(entry.title || entry.hook || "").trim();
  const bodyParts = [
    entry.hook && entry.hook !== title ? String(entry.hook).trim() : "",
    entry.body ? String(entry.body).trim() : "",
    entry.cta ? String(entry.cta).trim() : "",
  ].filter(Boolean);

  return {
    title,
    body: bodyParts.join("\n\n") || title,
    platforms,
    status: "draft",
    hashtags,
    metadata: {
      productProfileId: productId || null,
      productProfileLabel: productProfile?.label || entry.product || "",
      productLinks: productProfile?.links || {},
      postIntent: entry.postIntent || defaults.postIntent,
      campaignPhase: entry.campaignPhase || defaults.campaignPhase,
      campaignAngle: entry.campaignAngle || "",
      visualHook: entry.visualHook || "",
      imageConcept: entry.imageIdea || "",
      imagePrompt: entry.imagePrompt || "",
      contentTags,
      distributionTags,
    },
    tags: contentTags,
  };
}

function addDaysToDateOnly(dateValue, daysToAdd) {
  if (!dateValue) return "";
  const [year, month, day] = dateValue.split("-").map(Number);
  const next = new Date(year, month - 1, day + daysToAdd, 12, 0, 0, 0);
  return next.toISOString().slice(0, 10);
}

function interleavePostsByProduct(selectedPosts = [], productOrder = []) {
  const buckets = new Map();
  for (const post of selectedPosts) {
    const key =
      post?.metadata?.productProfileId ||
      post?.metadata?.productProfileLabel ||
      post?.title ||
      post?.id;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(post);
  }

  for (const bucket of buckets.values()) {
    bucket.sort((a, b) => {
      const left = new Date(a.createdAt || a.scheduledAt || 0).getTime();
      const right = new Date(b.createdAt || b.scheduledAt || 0).getTime();
      return left - right;
    });
  }

  const preferredOrder = Array.isArray(productOrder) ? productOrder : [];
  const orderedKeys = [
    ...preferredOrder.filter((key) => buckets.has(key)),
    ...[...buckets.keys()].filter((key) => !preferredOrder.includes(key)).sort(),
  ];
  const mixed = [];
  let added = true;

  while (added) {
    added = false;
    for (const key of orderedKeys) {
      const bucket = buckets.get(key);
      if (bucket?.length) {
        mixed.push(bucket.shift());
        added = true;
      }
    }
  }

  return mixed;
}

export default function BatchPage() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [rawInput, setRawInput] = useState("");
  const [aiResponseText, setAiResponseText] = useState("");
  const [defaults, setDefaults] = useState(emptyDefaults);
  const [parsedPosts, setParsedPosts] = useState([]);
  const [selectedIndexes, setSelectedIndexes] = useState([]);
  const [completedIndexes, setCompletedIndexes] = useState([]);
  const [completedMatches, setCompletedMatches] = useState({});
  const [existingIndexes, setExistingIndexes] = useState([]);
  const [existingMatches, setExistingMatches] = useState({});
  const [lastSaveSummary, setLastSaveSummary] = useState(null);
  const [rotationSettings, setRotationSettings] = useState(DEFAULT_ROTATION_SETTINGS);
  const [parseError, setParseError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isBatchUpdating, setIsBatchUpdating] = useState(false);

  const savedBatchIndexes = useMemo(
    () =>
      completedIndexes.filter((index) => {
        const post = completedMatches[index];
        return post?.id;
      }),
    [completedIndexes, completedMatches],
  );

  useEffect(() => {
    let ignore = false;
    async function loadRotationSettings() {
      try {
        const res = await fetch(`${API_BASE}/api/settings/rotation`);
        if (!res.ok) return;
        const data = await res.json();
        if (!ignore) {
          setRotationSettings({
            ...DEFAULT_ROTATION_SETTINGS,
            ...(data || {}),
          });
        }
      } catch {
        // Keep sane defaults if settings are unavailable.
      }
    }
    loadRotationSettings();
    return () => {
      ignore = true;
    };
  }, []);

  const previewPosts = useMemo(
    () => parsedPosts.map((entry) => buildPostPayload(entry, defaults)),
    [parsedPosts, defaults],
  );

  const togglePlatform = (platform) => {
    setDefaults((current) => ({
      ...current,
      platforms: current.platforms.includes(platform)
        ? current.platforms.filter((item) => item !== platform)
        : [...current.platforms, platform],
    }));
  };

  const toggleSelected = (index) => {
    setSelectedIndexes((current) =>
      current.includes(index) ? current.filter((item) => item !== index) : [...current, index],
    );
  };

  const parseInput = () => {
    try {
      const items = parseBatchInput(rawInput);
      if (items.length === 0) throw new Error("No posts found in the pasted batch.");
      setParsedPosts(items);
      setSelectedIndexes(items.map((_, index) => index));
      setCompletedIndexes([]);
      setCompletedMatches({});
      setExistingIndexes([]);
      setExistingMatches({});
      setLastSaveSummary(null);
      setParseError("");
      toast({
        title: "Batch parsed",
        description: `${items.length} draft candidates are ready for review.`,
      });
    } catch (error) {
      setParseError(error.message);
      toast({
        title: "Could not parse batch",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const moveAiResponseToBatchInput = () => {
    if (!aiResponseText.trim()) {
      toast({
        title: "No AI response yet",
        description: "Paste or generate the multi-post AI output here first.",
        variant: "destructive",
      });
      return;
    }
    setRawInput(aiResponseText);
    toast({
      title: "AI response staged",
      description: "The AI output was copied into the batch input box. Parse it when you're ready.",
    });
  };

  const saveSelected = async () => {
    const indexes = [...selectedIndexes].sort((a, b) => a - b);
    if (indexes.length === 0) {
      toast({
        title: "No posts selected",
        description: "Pick at least one parsed post before saving.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const results = [];
      for (const index of indexes) {
        const payload = previewPosts[index];
        const res = await fetch(`${API_BASE}/api/posts`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json().catch(() => ({}));
        results.push({ ok: res.ok, status: res.status, data, title: payload.title });
      }

      const saved = results.filter((result) => result.ok);
      const failed = results.filter((result) => !result.ok);
      const savedIndexes = results
        .map((result, resultIndex) => ({ ok: result.ok, index: indexes[resultIndex] }))
        .filter((entry) => entry.ok)
        .map((entry) => entry.index);
      const duplicateIndexes = results
        .map((result, resultIndex) => ({
          duplicate: result.status === 409,
          index: indexes[resultIndex],
          detail: result.data?.detail || "",
        }))
        .filter((entry) => entry.duplicate)
        .map((entry) => ({ index: entry.index, detail: entry.detail }));

      if (savedIndexes.length > 0) {
        const matches = {};
        savedIndexes.forEach((index) => {
          const resultIndex = indexes.indexOf(index);
          matches[index] = results[resultIndex]?.data || null;
        });
        setCompletedMatches((current) => ({ ...current, ...matches }));
        setCompletedIndexes((current) => [...new Set([...current, ...savedIndexes])]);
      }
      if (duplicateIndexes.length > 0) {
        const postsRes = await fetch(`${API_BASE}/api/posts`);
        const postsData = postsRes.ok ? await postsRes.json() : [];
        const matches = {};
        for (const entry of duplicateIndexes) {
          const duplicateIdMatch = String(entry.detail || "").match(/Matches existing post\s+(.+)$/i);
          const duplicateId = duplicateIdMatch?.[1]?.trim();
          const existingPost = Array.isArray(postsData)
            ? postsData.find((post) => post.id === duplicateId)
            : null;
          matches[entry.index] = existingPost || null;
        }
        setExistingMatches((current) => ({ ...current, ...matches }));
        setExistingIndexes((current) => [
          ...new Set([...current, ...duplicateIndexes.map((entry) => entry.index)]),
        ]);
      }
      if (savedIndexes.length > 0 || duplicateIndexes.length > 0) {
        const consumed = new Set([...savedIndexes, ...duplicateIndexes.map((entry) => entry.index)]);
        setSelectedIndexes((current) => current.filter((index) => !consumed.has(index)));
      }

      if (saved.length > 0) {
        toast({
          title: "Batch saved",
          description: `${saved.length} posts were added to the queue. Done and dusted.`,
        });
      }
      if (duplicateIndexes.length > 0) {
        toast({
          title: "Already in queue",
          description: `${duplicateIndexes.length} posts matched existing queue entries and were marked as already there.`,
        });
      }
      if (failed.length > 0) {
        const hardFailures = failed.filter((result) => result.status !== 409);
        if (hardFailures.length === 0) {
          setLastSaveSummary({
            savedCount: saved.length,
            duplicateCount: duplicateIndexes.length,
            unscheduledCount: savedIndexes.filter((index) => {
              const savedEntry = results[indexes.indexOf(index)]?.data || {};
              return !(savedEntry.scheduledAt || savedEntry.scheduled_at);
            }).length,
          });
          return;
        }
        toast({
          title: "Some posts failed",
          description:
            hardFailures[0]?.data?.detail ||
            hardFailures[0]?.data?.error ||
            `${hardFailures.length} entries were not saved.`,
          variant: "destructive",
        });
      }
      setLastSaveSummary({
        savedCount: saved.length,
        duplicateCount: duplicateIndexes.length,
        unscheduledCount: savedIndexes.filter((index) => {
          const savedEntry = results[indexes.indexOf(index)]?.data || {};
          return !(savedEntry.scheduledAt || savedEntry.scheduled_at);
        }).length,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const removeParsedPost = (index) => {
    setParsedPosts((current) => current.filter((_, itemIndex) => itemIndex !== index));
    setSelectedIndexes((current) =>
      current
        .filter((item) => item !== index)
        .map((item) => (item > index ? item - 1 : item)),
    );
    setExistingIndexes((current) =>
      current
        .filter((item) => item !== index)
        .map((item) => (item > index ? item - 1 : item)),
    );
    setExistingMatches((current) => {
      const next = {};
      for (const [key, value] of Object.entries(current)) {
        const numericKey = Number(key);
        if (numericKey === index) continue;
        next[numericKey > index ? numericKey - 1 : numericKey] = value;
      }
      return next;
    });
    setCompletedMatches((current) => {
      const next = {};
      for (const [key, value] of Object.entries(current)) {
        const numericKey = Number(key);
        if (numericKey === index) continue;
        next[numericKey > index ? numericKey - 1 : numericKey] = value;
      }
      return next;
    });
    setCompletedIndexes((current) =>
      current
        .filter((item) => item !== index)
        .map((item) => (item > index ? item - 1 : item)),
    );
  };

  const clearParsedPosts = () => {
    setParsedPosts([]);
    setSelectedIndexes([]);
    setCompletedIndexes([]);
    setCompletedMatches({});
    setExistingIndexes([]);
    setExistingMatches({});
    setLastSaveSummary(null);
  };

  const updateSavedBatchPosts = async (buildPayload) => {
    if (savedBatchIndexes.length === 0) {
      toast({
        title: "Nothing to update",
        description: "Save some batch posts first, then update them from here.",
        variant: "destructive",
      });
      return;
    }

    setIsBatchUpdating(true);
    try {
      const updates = await Promise.all(
        savedBatchIndexes.map(async (index) => {
          const post = completedMatches[index];
          const payload = buildPayload(post, index);
          const res = await fetch(`${API_BASE}/api/posts/${post.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data?.detail || data?.error || `HTTP ${res.status}`);
          }
          return { index, data: await res.json() };
        }),
      );

      const nextMatches = {};
      updates.forEach(({ index, data }) => {
        nextMatches[index] = data;
      });
      setCompletedMatches((current) => ({ ...current, ...nextMatches }));

      const unscheduledCount = savedBatchIndexes.filter((index) => {
        const updated = nextMatches[index] || completedMatches[index] || {};
        return !(updated.scheduledAt || updated.scheduled_at);
      }).length;
      setLastSaveSummary((current) =>
        current
          ? {
              ...current,
              unscheduledCount,
            }
          : current,
      );
    } catch (error) {
      toast({
        title: "Batch update failed",
        description: error.message || "Could not update the saved batch.",
        variant: "destructive",
      });
    } finally {
      setIsBatchUpdating(false);
    }
  };

  const formatScheduled = (value) => {
    if (!value) return "unscheduled";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString();
  };

  const openCalendarForDate = (value) => {
    if (!value) return;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return;
    navigate("/", {
      state: {
        focusDate: date.toISOString().slice(0, 10),
      },
    });
  };

  const openLibrary = () => {
    navigate("/lib");
  };

  const approveSavedBatch = async () => {
    await updateSavedBatchPosts(() => ({ status: "approved" }));
    toast({
      title: "Saved batch approved",
      description: "Those saved queue entries are now approved.",
    });
  };

  const continueSavedBatchAfterLastScheduled = async () => {
    const postsRes = await fetch(`${API_BASE}/api/posts`);
    const postsData = postsRes.ok ? await postsRes.json() : [];
    const latestOverallScheduled =
      [...(Array.isArray(postsData) ? postsData : [])]
        .map((post) => post.scheduledAt || post.scheduled_at)
        .filter(Boolean)
        .sort()
        .at(-1) || null;

    const cadence = Math.max(1, Number(rotationSettings.cadenceDays || 1));
    const baseStart = latestOverallScheduled
      ? addDaysToDateOnly(new Date(latestOverallScheduled).toISOString().slice(0, 10), cadence)
      : new Date().toISOString().slice(0, 10);
    const baseTime = latestOverallScheduled
      ? new Date(latestOverallScheduled).toISOString().slice(11, 16)
      : rotationSettings.defaultTime || "10:00";

    const orderedIndexes = [...savedBatchIndexes].sort((a, b) => a - b);
    await updateSavedBatchPosts((post, index) => {
      const sequenceIndex = orderedIndexes.indexOf(index);
      return {
        status: "approved",
        scheduledAt: new Date(
          `${addDaysToDateOnly(baseStart, sequenceIndex * cadence)}T${baseTime}:00`,
        ).toISOString(),
      };
    });

    toast({
      title: "Batch scheduled",
      description: latestOverallScheduled
        ? "Saved posts were chained after the last scheduled date."
        : "Saved posts were scheduled starting from today.",
    });
  };

  const mixSavedBatchIntoRotation = async () => {
    if (savedBatchIndexes.length === 0) {
      toast({
        title: "Nothing saved yet",
        description: "Save this batch first, then mix it into the future rotation.",
        variant: "destructive",
      });
      return;
    }

    setIsBatchUpdating(true);
    try {
      const postsRes = await fetch(`${API_BASE}/api/posts`);
      if (!postsRes.ok) {
        throw new Error(`Failed to load queue posts: ${postsRes.status}`);
      }
      const postsData = await postsRes.json();
      const queuePosts = Array.isArray(postsData) ? postsData : [];
      const latestOverallScheduled =
        [...queuePosts]
          .map((post) => post.scheduledAt || post.scheduled_at)
          .filter(Boolean)
          .sort()
          .at(-1) || null;

      const unscheduledPosts = queuePosts
        .filter((post) => isUnscheduledQueuePost(post))
        .sort((a, b) => {
          const left = new Date(a.createdAt || a.updatedAt || 0).getTime();
          const right = new Date(b.createdAt || b.updatedAt || 0).getTime();
          return left - right;
        });

      if (unscheduledPosts.length === 0) {
        toast({
          title: "Nothing to mix",
          description: "There are no unscheduled queue posts waiting for rotation slots.",
        });
        return;
      }

      const cadence = Math.max(1, Number(rotationSettings.cadenceDays || 1));
      const baseStart = latestOverallScheduled
        ? addDaysToDateOnly(new Date(latestOverallScheduled).toISOString().slice(0, 10), cadence)
        : new Date().toISOString().slice(0, 10);
      const baseTime = latestOverallScheduled
        ? new Date(latestOverallScheduled).toISOString().slice(11, 16)
        : rotationSettings.defaultTime || "10:00";

      const mixedPosts = interleavePostsByProduct(
        unscheduledPosts,
        rotationSettings.activeProductIds,
      );

      const updates = await Promise.all(
        mixedPosts.map(async (post, index) => {
          const scheduledAt = new Date(
            `${addDaysToDateOnly(baseStart, index * cadence)}T${baseTime}:00`,
          ).toISOString();
          const res = await fetch(`${API_BASE}/api/posts/${post.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              scheduledAt,
              status: "approved",
            }),
          });
          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data?.detail || data?.error || `HTTP ${res.status}`);
          }
          return await res.json();
        }),
      );

      const updateMap = new Map(updates.map((post) => [post.id, post]));
      const nextMatches = {};
      Object.entries(completedMatches).forEach(([index, post]) => {
        nextMatches[index] = updateMap.get(post?.id) || post;
      });
      setCompletedMatches((current) => ({ ...current, ...nextMatches }));
      setLastSaveSummary((current) =>
        current
          ? {
              ...current,
              unscheduledCount: 0,
            }
          : current,
      );
      toast({
        title: "Mixed into rotation",
        description: `${updates.length} unscheduled posts were spread across future days.`,
      });
    } catch (error) {
      toast({
        title: "Mix into rotation failed",
        description: error.message || "Could not remix unscheduled posts into future slots.",
        variant: "destructive",
      });
    } finally {
      setIsBatchUpdating(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-teal-200 font-mono">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <AppTopNav />
        <header className="mb-8 border-b border-fuchsia-500 pb-6">
          <p className="text-sm uppercase tracking-[0.3em] text-fuchsia-500">batch forge</p>
          <h1 className="mt-2 text-4xl md:text-5xl text-fuchsia-300 glitchy">Batch Generator / Import</h1>
          <p className="mt-3 max-w-3xl text-sm text-teal-400">
            This is the bridge between your external GPT workflow and PostPunk. Paste structured output,
            preview it as separate drafts, then feed selected posts into the queue without doing them one at a time.
          </p>
        </header>

        <section className="mb-6 rounded-lg border border-fuchsia-500 bg-black/60 p-5 shadow-[0_0_20px_rgba(217,70,239,0.16)]">
          <p className="text-sm uppercase tracking-[0.3em] text-fuchsia-400">Checklist</p>
          <ul className="mt-4 space-y-2 text-sm text-teal-300">
            <li>1. Pick the default product, platforms, intent, and phase for this batch.</li>
            <li>2. Paste either a JSON array or your `# Post / Hook / Body / CTA / Image Idea` format.</li>
            <li>3. Parse the batch and inspect the preview cards before saving.</li>
            <li>4. Save only the posts you want in the queue, then either append them or mix them into the future rotation.</li>
          </ul>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1fr_0.95fr]">
          <div className="rounded-lg border border-teal-600 bg-black/60 p-5">
            <p className="text-sm uppercase tracking-[0.3em] text-teal-400">Batch Defaults</p>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="text-sm text-fuchsia-300">Default Product</span>
                <select
                  value={defaults.productId}
                  onChange={(e) => setDefaults((current) => ({ ...current, productId: e.target.value }))}
                  className="mt-2 w-full rounded border border-teal-500 bg-black p-3 text-teal-200"
                >
                  <option value="">-- Choose One --</option>
                  {productProfiles.map((profile) => (
                    <option key={profile.id} value={profile.id}>
                      {profile.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-sm text-fuchsia-300">Default Post Intent</span>
                <select
                  value={defaults.postIntent}
                  onChange={(e) => setDefaults((current) => ({ ...current, postIntent: e.target.value }))}
                  className="mt-2 w-full rounded border border-teal-500 bg-black p-3 text-teal-200"
                >
                  <option value="jab">Jab</option>
                  <option value="punch">Punch</option>
                  <option value="soft-sell">Soft Sell</option>
                  <option value="educational">Educational</option>
                  <option value="story">Story</option>
                  <option value="launch">Launch</option>
                  <option value="reminder">Reminder</option>
                </select>
              </label>
              <label className="block">
                <span className="text-sm text-fuchsia-300">Default Campaign Phase</span>
                <select
                  value={defaults.campaignPhase}
                  onChange={(e) => setDefaults((current) => ({ ...current, campaignPhase: e.target.value }))}
                  className="mt-2 w-full rounded border border-teal-500 bg-black p-3 text-teal-200"
                >
                  <option value="teaser">Teaser</option>
                  <option value="launch">Launch</option>
                  <option value="follow_up">Follow-up</option>
                  <option value="evergreen">Evergreen</option>
                </select>
              </label>
              <label className="block">
                <span className="text-sm text-fuchsia-300">Default Content Tags</span>
                <input
                  type="text"
                  value={defaults.contentTags}
                  onChange={(e) => setDefaults((current) => ({ ...current, contentTags: e.target.value }))}
                  className="mt-2 w-full rounded border border-teal-500 bg-black p-3 text-teal-200"
                  placeholder="goblin, printable, self-care"
                />
              </label>
            </div>
            <div className="mt-4">
              <p className="text-sm text-fuchsia-300">Default Platforms</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {PLATFORM_OPTIONS.map((platform) => {
                  const active = defaults.platforms.includes(platform);
                  return (
                    <button
                      key={platform}
                      type="button"
                      onClick={() => togglePlatform(platform)}
                      className={`rounded border px-3 py-2 text-sm transition-colors ${
                        active
                          ? "border-fuchsia-500 bg-fuchsia-500 text-black"
                          : "border-teal-500 text-teal-200 hover:bg-teal-500 hover:text-black"
                      }`}
                    >
                      {platform}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-cyan-500 bg-black/60 p-5">
            <p className="text-sm uppercase tracking-[0.3em] text-cyan-400">Accepted Formats</p>
            <div className="mt-4 space-y-4 text-sm text-teal-300">
              <div>
                <p className="text-fuchsia-300">Loose post blocks</p>
                <pre className="mt-2 overflow-auto whitespace-pre-wrap rounded border border-teal-800 bg-black/40 p-3 text-xs">
{`# Post 1
**Hook**
Weird affirmations work better for me than polished ones.

**Body**
Not everybody wants healing language...

**CTA**
Grab the printable pack here.

**Image Idea**
Goblin affirmation page on a messy cozy desk.`}
                </pre>
              </div>
              <div>
                <p className="text-fuchsia-300">JSON array</p>
                <pre className="mt-2 overflow-auto whitespace-pre-wrap rounded border border-teal-800 bg-black/40 p-3 text-xs">
{`[
  {
    "title": "Goblin self-care still counts",
    "body": "Self-care doesn't have to look polished...",
    "platforms": ["facebook", "instagram"],
    "campaignPhase": "evergreen"
  }
]`}
                </pre>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-lg border border-lime-500 bg-black/60 p-5">
          <div className="mb-6 rounded-lg border border-cyan-500 bg-black/40 p-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.3em] text-cyan-400">AI Response Staging</p>
                <p className="mt-2 text-sm text-teal-400">
                  This is where a multi-post AI answer should land. Paste the raw GPT output here first,
                  then move it into the parser when it looks right.
                </p>
              </div>
              <button
                type="button"
                onClick={moveAiResponseToBatchInput}
                className="rounded border border-cyan-500 px-4 py-2 text-cyan-200 hover:bg-cyan-500 hover:text-black"
              >
                Use As Batch Input
              </button>
            </div>
            <textarea
              value={aiResponseText}
              onChange={(e) => setAiResponseText(e.target.value)}
              className="mt-4 min-h-[220px] w-full rounded border border-cyan-500 bg-black p-4 text-sm text-teal-200"
              placeholder="Paste the AI's multi-post response here so it has a visible landing zone on /batch..."
            />
          </div>
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-lime-400">Paste Batch</p>
              <p className="mt-2 text-sm text-teal-400">
                This is the parser input. Use your marketing bot or the AI staging box above, then turn that batch into queue-ready drafts.
              </p>
            </div>
            <button
              type="button"
              onClick={parseInput}
              className="rounded border border-lime-500 px-4 py-2 text-lime-200 hover:bg-lime-500 hover:text-black"
            >
              Parse Batch
            </button>
          </div>
          <textarea
            value={rawInput}
            onChange={(e) => setRawInput(e.target.value)}
            className="mt-4 min-h-[320px] w-full rounded border border-teal-500 bg-black p-4 text-sm text-teal-200"
            placeholder="Paste your GPT output here..."
          />
          {parseError ? <p className="mt-3 text-sm text-red-400">{parseError}</p> : null}
        </section>

        <section className="mt-6 rounded-lg border border-orange-500 bg-black/60 p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-orange-400">Preview</p>
              <p className="mt-2 text-sm text-teal-400">
                Review the parsed drafts before they hit the queue. Save only the ones you want.
              </p>
            </div>
            <button
              type="button"
              onClick={saveSelected}
              disabled={isSaving || selectedIndexes.length === 0}
              className="rounded border border-orange-500 px-4 py-2 text-orange-200 hover:bg-orange-500 hover:text-black disabled:opacity-50"
            >
              {isSaving ? "Saving..." : `Add ${selectedIndexes.length} Selected To Queue`}
            </button>
          </div>
          <div className="mt-3 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setSelectedIndexes(previewPosts.map((_, index) => index).filter((index) => !completedIndexes.includes(index)))}
              className="rounded border border-teal-500 px-3 py-2 text-teal-200 hover:bg-teal-500 hover:text-black"
            >
              Select All Active
            </button>
            <button
              type="button"
              onClick={() => setSelectedIndexes([])}
              className="rounded border border-gray-600 px-3 py-2 text-gray-300 hover:bg-gray-700"
            >
              Deselect All
            </button>
            <button
              type="button"
              onClick={clearParsedPosts}
              className="rounded border border-red-500 px-3 py-2 text-red-200 hover:bg-red-500 hover:text-white"
            >
              Clear Parsed
            </button>
          </div>
          <p className="mt-3 text-sm text-teal-400">
            Drafts saved here will not appear on the calendar until they have a real scheduled date and are approved.
            If a card already shows a scheduled time, you can jump straight to the calendar from that card.
          </p>
          {lastSaveSummary ? (
            <div className="mt-4 rounded border border-lime-500 bg-lime-950/10 p-4">
              <p className="text-sm uppercase tracking-[0.3em] text-lime-400">Next Step</p>
              <p className="mt-2 text-sm text-teal-200">
                {lastSaveSummary.savedCount} saved, {lastSaveSummary.duplicateCount} already in queue.
                {lastSaveSummary.unscheduledCount > 0
                  ? ` ${lastSaveSummary.unscheduledCount} still need scheduling.`
                  : " Everything saved here already has a date."}
              </p>
              <div className="mt-3 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={approveSavedBatch}
                  disabled={isBatchUpdating || lastSaveSummary.savedCount === 0}
                  className="rounded border border-lime-500 px-3 py-2 text-lime-200 hover:bg-lime-500 hover:text-black disabled:opacity-50"
                >
                  Approve Saved Batch
                </button>
                <button
                  type="button"
                  onClick={continueSavedBatchAfterLastScheduled}
                  disabled={isBatchUpdating || lastSaveSummary.savedCount === 0}
                  className="rounded border border-cyan-500 px-3 py-2 text-cyan-200 hover:bg-cyan-500 hover:text-black disabled:opacity-50"
                >
                  Continue After Last Scheduled
                </button>
                <button
                  type="button"
                  onClick={mixSavedBatchIntoRotation}
                  disabled={isBatchUpdating || lastSaveSummary.savedCount === 0}
                  className="rounded border border-fuchsia-500 px-3 py-2 text-fuchsia-200 hover:bg-fuchsia-500 hover:text-black disabled:opacity-50"
                >
                  Mix Into Rotation
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/")}
                  className="rounded border border-pink-500 px-3 py-2 text-pink-200 hover:bg-pink-500 hover:text-black"
                >
                  Back To Calendar
                </button>
              </div>
            </div>
          ) : null}

          {previewPosts.length === 0 ? (
            <p className="mt-4 text-sm text-teal-500">No parsed posts yet.</p>
          ) : (
            <div className="mt-4 space-y-4">
              {previewPosts.map((post, index) => (
                <article
                  key={`${post.title}-${index}`}
                  className={`rounded border p-4 ${
                    completedIndexes.includes(index)
                      ? "border-lime-500 bg-lime-950/10"
                      : existingIndexes.includes(index)
                      ? "border-cyan-500 bg-cyan-950/10"
                      : "border-teal-700 bg-black/50"
                  }`}
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        {completedIndexes.includes(index) ? (
                          <span className="rounded border border-lime-500 px-2 py-1 text-xs uppercase tracking-[0.2em] text-lime-300">
                            Done
                          </span>
                        ) : existingIndexes.includes(index) ? (
                          <span className="rounded border border-cyan-500 px-2 py-1 text-xs uppercase tracking-[0.2em] text-cyan-300">
                            Already There
                          </span>
                        ) : (
                          <input
                            type="checkbox"
                            checked={selectedIndexes.includes(index)}
                            onChange={() => toggleSelected(index)}
                          />
                        )}
                        <h2 className="text-xl text-pink-300">{post.title || "Untitled draft"}</h2>
                      </div>
                      <p className="mt-2 text-xs text-teal-500">
                        Product: {post.metadata.productProfileLabel || "none"} · Intent: {post.metadata.postIntent} · Phase: {post.metadata.campaignPhase}
                      </p>
                      <p className="mt-1 text-xs text-teal-500">
                        Platforms: {post.platforms.join(", ") || "—"}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {completedIndexes.includes(index) ? (
                        <div className="rounded border border-lime-500 px-3 py-2 text-sm text-lime-200">
                          Done and dusted
                        </div>
                      ) : existingIndexes.includes(index) ? (
                        <div className="rounded border border-cyan-500 px-3 py-2 text-sm text-cyan-200">
                          Already in queue
                        </div>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => removeParsedPost(index)}
                        className="rounded border border-red-500 px-3 py-2 text-red-200 hover:bg-red-500 hover:text-white"
                      >
                        X Remove
                      </button>
                    </div>
                  </div>
                  <div className="mt-4 whitespace-pre-wrap rounded border border-teal-800 bg-black/40 p-3 text-sm text-teal-100">
                    {post.body}
                  </div>
                  {post.metadata.imageConcept ? (
                    <p className="mt-3 text-sm text-teal-300">
                      <span className="text-orange-300">Image idea:</span> {post.metadata.imageConcept}
                    </p>
                  ) : null}
                  {existingIndexes.includes(index) ? (
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      <p className="text-sm text-cyan-300">
                        <span className="text-cyan-400">
                          {(existingMatches[index]?.scheduledAt || existingMatches[index]?.scheduled_at)
                            ? "Scheduled:"
                            : "Already in queue:"}
                        </span>{" "}
                        {(existingMatches[index]?.scheduledAt || existingMatches[index]?.scheduled_at)
                          ? formatScheduled(existingMatches[index]?.scheduledAt || existingMatches[index]?.scheduled_at)
                          : "Not scheduled yet"}
                      </p>
                      {(existingMatches[index]?.scheduledAt || existingMatches[index]?.scheduled_at) ? (
                        <button
                          type="button"
                          onClick={() =>
                            openCalendarForDate(
                              existingMatches[index]?.scheduledAt ||
                                existingMatches[index]?.scheduled_at,
                            )
                          }
                          className="rounded border border-pink-500 px-3 py-2 text-pink-200 hover:bg-pink-500 hover:text-black"
                        >
                          View On Calendar
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={mixSavedBatchIntoRotation}
                          className="rounded border border-lime-500 px-3 py-2 text-lime-200 hover:bg-lime-500 hover:text-black"
                        >
                          Mix Into Rotation
                        </button>
                      )}
                    </div>
                  ) : null}
                  {completedIndexes.includes(index) ? (
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      <p className="text-sm text-lime-300">
                        <span className="text-lime-400">
                          {(completedMatches[index]?.scheduledAt || completedMatches[index]?.scheduled_at)
                            ? "Scheduled:"
                            : "Saved to queue:"}
                        </span>{" "}
                        {(completedMatches[index]?.scheduledAt || completedMatches[index]?.scheduled_at)
                          ? formatScheduled(completedMatches[index]?.scheduledAt || completedMatches[index]?.scheduled_at)
                          : "Not scheduled yet"}
                      </p>
                      {(completedMatches[index]?.scheduledAt || completedMatches[index]?.scheduled_at) ? (
                        <button
                          type="button"
                          onClick={() =>
                            openCalendarForDate(
                              completedMatches[index]?.scheduledAt ||
                                completedMatches[index]?.scheduled_at,
                            )
                          }
                          className="rounded border border-pink-500 px-3 py-2 text-pink-200 hover:bg-pink-500 hover:text-black"
                        >
                          View On Calendar
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={mixSavedBatchIntoRotation}
                          className="rounded border border-fuchsia-500 px-3 py-2 text-fuchsia-200 hover:bg-fuchsia-500 hover:text-black"
                        >
                          Mix Into Rotation
                        </button>
                      )}
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
