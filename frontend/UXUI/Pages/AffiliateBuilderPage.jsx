import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import AppTopNav from "../Components/AppTopNav";
import { useToast } from "@/Components/ui/use-toast";

const ANGLE_PRESETS = [
  "beginner",
  "problem",
  "aesthetic",
  "use case",
  "budget",
  "best",
];

const API_BASE = import.meta.env?.VITE_API_BASE || "http://localhost:3001";
const STORAGE_KEY = "postpunk-affiliate-builder-v1";

function makeId() {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function createEmptyRow(defaultBoard = "") {
  return {
    id: makeId(),
    keyword: "",
    angle: "",
    productLink: "",
    title: "",
    description: "",
    image: "",
    board: defaultBoard,
  };
}

function inferDescription(keyword, angle) {
  if (!keyword) return "";
  const angleText = angle ? `${angle} angle` : "search-first angle";
  return `Useful ${angleText} content for ${keyword}. Keep it practical, visual, and easy to click.`;
}

function buildTimesForCount(count) {
  const normalized = Math.max(1, Number(count || 1));
  if (normalized === 1) return ["10:00"];
  if (normalized === 2) return ["10:00", "16:00"];
  if (normalized === 3) return ["10:00", "14:00", "18:00"];
  if (normalized === 4) return ["09:00", "12:00", "15:00", "18:00"];
  if (normalized === 5) return ["08:00", "11:00", "13:00", "15:00", "18:00"];
  if (normalized === 6) return ["08:00", "10:00", "12:00", "14:00", "16:00", "18:00"];
  return Array.from({ length: normalized }, (_, index) => {
    const hour = 8 + index;
    return `${String(Math.min(hour, 22)).padStart(2, "0")}:00`;
  });
}

function addDays(dateString, amount) {
  const [year, month, day] = String(dateString).split("-").map(Number);
  const next = new Date(year, month - 1, day + amount, 12, 0, 0, 0);
  return next.toISOString().slice(0, 10);
}

function resolvePostsPerDay(dateString, defaultCount, overrides = []) {
  for (const rule of overrides) {
    if (!rule.startDate || !rule.endDate || !rule.postsPerDay) continue;
    if (dateString >= rule.startDate && dateString <= rule.endDate) {
      return Number(rule.postsPerDay) || defaultCount;
    }
  }
  return defaultCount;
}

function buildSchedulePlan(totalRows, startDate, defaultPostsPerDay, overrides = []) {
  const plan = [];
  let cursorDate = startDate;
  let rowIndex = 0;

  while (rowIndex < totalRows) {
    const postsPerDay = resolvePostsPerDay(cursorDate, defaultPostsPerDay, overrides);
    const slots = buildTimesForCount(postsPerDay);
    for (const time of slots) {
      if (rowIndex >= totalRows) break;
      plan.push(`${cursorDate}T${time}:00`);
      rowIndex += 1;
    }
    cursorDate = addDays(cursorDate, 1);
  }

  return plan;
}

function parseBulkJson(raw) {
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    throw new Error("JSON must be an array of affiliate rows.");
  }
  return parsed.map((entry) => ({
    id: makeId(),
    keyword: String(entry.keyword || "").trim(),
    angle: String(entry.angle || "").trim(),
    productLink: String(entry.productLink || entry.link || "").trim(),
    title: String(entry.title || entry.keyword || "").trim(),
    description: String(entry.description || "").trim(),
    image: String(entry.image || entry.mediaPath || "").trim(),
    board: String(entry.board || "").trim(),
  }));
}

function buildMixKey(row) {
  return (
    String(row.productLink || "").trim().toLowerCase() ||
    String(row.keyword || "").trim().toLowerCase() ||
    row.id
  );
}

function mixRows(rows) {
  const buckets = new Map();
  for (const row of rows) {
    const key = buildMixKey(row);
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(row);
  }

  const keys = [...buckets.keys()];
  const mixed = [];
  let added = true;

  while (added) {
    added = false;
    for (const key of keys) {
      const bucket = buckets.get(key);
      if (bucket?.length) {
        mixed.push(bucket.shift());
        added = true;
      }
    }
  }

  return mixed;
}

export default function AffiliateBuilderPage() {
  const { toast } = useToast();
  const [batchLabel, setBatchLabel] = useState("Amazon affiliate batch");
  const [defaultBoard, setDefaultBoard] = useState("");
  const [rows, setRows] = useState([createEmptyRow("")]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [defaultPostsPerDay, setDefaultPostsPerDay] = useState(3);
  const [scheduleOverrides, setScheduleOverrides] = useState([
    { id: makeId(), label: "Sale window", startDate: "", endDate: "", postsPerDay: 6 },
  ]);
  const [isQueueing, setIsQueueing] = useState(false);
  const [bulkJson, setBulkJson] = useState("");

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (saved.batchLabel) setBatchLabel(saved.batchLabel);
      if (saved.defaultBoard !== undefined) setDefaultBoard(saved.defaultBoard);
      if (Array.isArray(saved.rows) && saved.rows.length) setRows(saved.rows);
      if (saved.startDate) setStartDate(saved.startDate);
      if (saved.defaultPostsPerDay) setDefaultPostsPerDay(saved.defaultPostsPerDay);
      if (Array.isArray(saved.scheduleOverrides) && saved.scheduleOverrides.length) {
        setScheduleOverrides(saved.scheduleOverrides);
      }
      if (Array.isArray(saved.selectedIds)) setSelectedIds(saved.selectedIds);
    } catch {
      // ignore bad local state
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        batchLabel,
        defaultBoard,
        rows,
        selectedIds,
        startDate,
        defaultPostsPerDay,
        scheduleOverrides,
      }),
    );
  }, [batchLabel, defaultBoard, rows, selectedIds, startDate, defaultPostsPerDay, scheduleOverrides]);

  const readyRows = useMemo(
    () => rows.filter((row) => row.title && row.description && row.productLink),
    [rows],
  );

  const exportableRows = useMemo(
    () =>
      readyRows.filter((row) => selectedIds.length === 0 || selectedIds.includes(row.id)),
    [readyRows, selectedIds],
  );

  const schedulePreview = useMemo(
    () => buildSchedulePlan(exportableRows.length, startDate, defaultPostsPerDay, scheduleOverrides),
    [exportableRows.length, startDate, defaultPostsPerDay, scheduleOverrides],
  );

  const updateRow = (id, field, value) => {
    setRows((current) =>
      current.map((row) => {
        if (row.id !== id) return row;
        const next = { ...row, [field]: value };
        if (field === "keyword" && !row.title) next.title = value;
        if ((field === "keyword" || field === "angle") && !row.description) {
          next.description = inferDescription(
            field === "keyword" ? value : next.keyword,
            field === "angle" ? value : next.angle,
          );
        }
        if (field === "board" && !value && defaultBoard) next.board = defaultBoard;
        return next;
      }),
    );
  };

  const addRow = () => {
    setRows((current) => [...current, createEmptyRow(defaultBoard)]);
  };

  const duplicateRow = (id) => {
    setRows((current) => {
      const row = current.find((item) => item.id === id);
      if (!row) return current;
      const duplicate = { ...row, id: makeId() };
      return [...current, duplicate];
    });
  };

  const removeRow = (id) => {
    setRows((current) => (current.length === 1 ? current : current.filter((row) => row.id !== id)));
    setSelectedIds((current) => current.filter((item) => item !== id));
  };

  const applyAnglePreset = (id, angle) => {
    setRows((current) =>
      current.map((row) => {
        if (row.id !== id) return row;
        return {
          ...row,
          angle,
          title: row.keyword || row.title,
          description: inferDescription(row.keyword, angle),
          board: row.board || defaultBoard,
        };
      }),
    );
  };

  const expandAngles = (id) => {
    setRows((current) => {
      const row = current.find((item) => item.id === id);
      if (!row) return current;
      const existingAngles = new Set(
        current
          .filter(
            (item) =>
              item.keyword.trim().toLowerCase() === row.keyword.trim().toLowerCase() &&
              item.productLink.trim() === row.productLink.trim(),
          )
          .map((item) => item.angle.trim().toLowerCase()),
      );
      const additions = ANGLE_PRESETS.filter((angle) => !existingAngles.has(angle)).map((angle) => ({
        ...row,
        id: makeId(),
        angle,
        title: row.keyword || row.title,
        description: inferDescription(row.keyword, angle),
        board: row.board || defaultBoard,
      }));
      return [...current, ...additions];
    });
  };

  const toggleSelected = (id) => {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  };

  const selectAllReady = () => {
    setSelectedIds(readyRows.map((row) => row.id));
  };

  const clearSelection = () => {
    setSelectedIds([]);
  };

  const updateOverride = (id, field, value) => {
    setScheduleOverrides((current) =>
      current.map((rule) => (rule.id === id ? { ...rule, [field]: value } : rule)),
    );
  };

  const addOverride = () => {
    setScheduleOverrides((current) => [
      ...current,
      { id: makeId(), label: "Override", startDate: "", endDate: "", postsPerDay: 6 },
    ]);
  };

  const removeOverride = (id) => {
    setScheduleOverrides((current) => current.filter((rule) => rule.id !== id));
  };

  const importBulkRows = () => {
    try {
      const imported = parseBulkJson(bulkJson);
      if (!imported.length) {
        toast({
          title: "No rows found",
          description: "The JSON parsed, but it did not include any affiliate rows.",
          variant: "destructive",
        });
        return;
      }

      setRows((current) => [
        ...current,
        ...imported.map((row) => ({
          ...row,
          board: row.board || defaultBoard,
          description: row.description || inferDescription(row.keyword, row.angle),
        })),
      ]);
      setBulkJson("");
      toast({
        title: "Bulk rows imported",
        description: `${imported.length} affiliate rows were added to the builder.`,
      });
    } catch (error) {
      toast({
        title: "Import failed",
        description: error.message || "Could not parse the GPT JSON block.",
        variant: "destructive",
      });
    }
  };

  const queueRows = async () => {
    if (!exportableRows.length) {
      toast({
        title: "No ready rows",
        description: "Select ready rows with title, description, and product link before queueing.",
        variant: "destructive",
      });
      return;
    }

    setIsQueueing(true);
    try {
      const mixedRows = mixRows(exportableRows);
      const schedule = buildSchedulePlan(
        mixedRows.length,
        startDate,
        defaultPostsPerDay,
        scheduleOverrides,
      );

      for (let index = 0; index < mixedRows.length; index += 1) {
        const row = mixedRows[index];
        const scheduledAt = schedule[index] || null;
        const payload = {
          title: row.title,
          body: row.description,
          mediaPath: row.image || null,
          mediaType: row.image ? "image" : null,
          platforms: ["pinterest"],
          targets: ["pinterest"],
          scheduledAt,
          status: "approved",
          metadata: {
            contentMode: "affiliate",
            batchLabel,
            keyword: row.keyword,
            angle: row.angle,
            pinterestBoard: row.board || defaultBoard || "",
            productLinks: {
              primary: row.productLink,
              amazon: row.productLink,
            },
            includeProductLink: true,
            contentTags: ["affiliate", "amazon"],
            distributionTags: ["post:pinterest"],
          },
          tags: ["affiliate", "amazon", row.angle].filter(Boolean),
        };

        const res = await fetch(`${API_BASE}/api/posts`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const detail = await res.text();
          throw new Error(`Queue failed on "${row.title}": ${res.status} ${detail}`);
        }
      }

      toast({
        title: "Affiliate rows queued",
        description: `${mixedRows.length} Pinterest affiliate posts were added to the queue in mixed order.`,
      });
    } catch (error) {
      toast({
        title: "Queue failed",
        description: error.message || "Could not queue affiliate rows.",
        variant: "destructive",
      });
    } finally {
      setIsQueueing(false);
    }
  };

  return (
    <div className="min-h-screen bg-black font-mono text-orange-100">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <AppTopNav />

        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-orange-300/80">Affiliate Builder</p>
            <h1 className="mt-2 text-4xl font-black tracking-tight text-orange-100">
              Amazon Batch Builder
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-orange-100/80">
              Build affiliate rows in bulk, then post them one by one through the existing
              Pinterest lane. This is an angle multiplier, not a dashboard.
            </p>
          </div>
          <Link
            to="/affiliate"
            className="inline-flex items-center rounded-full border border-orange-400/60 bg-orange-500/10 px-4 py-2 text-sm font-bold text-orange-100 transition hover:bg-orange-400 hover:text-black"
          >
            Back to Affiliate Rules
          </Link>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-3xl border border-orange-500/40 bg-gradient-to-br from-orange-950/70 via-black to-red-950/40 p-6 shadow-[0_0_30px_rgba(249,115,22,0.15)]">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="text-xs uppercase tracking-[0.3em] text-orange-300">Batch label</span>
                <input
                  value={batchLabel}
                  onChange={(e) => setBatchLabel(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-orange-400/40 bg-black/40 px-4 py-3 text-sm text-orange-100 outline-none focus:border-orange-300"
                />
              </label>
              <label className="block">
                <span className="text-xs uppercase tracking-[0.3em] text-orange-300">Default board</span>
                <input
                  value={defaultBoard}
                  onChange={(e) => setDefaultBoard(e.target.value)}
                  placeholder="Coloring pages"
                  className="mt-2 w-full rounded-xl border border-orange-400/40 bg-black/40 px-4 py-3 text-sm text-orange-100 outline-none focus:border-orange-300"
                />
              </label>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="text-xs uppercase tracking-[0.3em] text-orange-300">Start date</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-orange-400/40 bg-black/40 px-4 py-3 text-sm text-orange-100 outline-none focus:border-orange-300"
                />
              </label>
              <label className="block">
                <span className="text-xs uppercase tracking-[0.3em] text-orange-300">Default posts/day</span>
                <input
                  type="number"
                  min="1"
                  max="12"
                  value={defaultPostsPerDay}
                  onChange={(e) => setDefaultPostsPerDay(Number(e.target.value || 1))}
                  className="mt-2 w-full rounded-xl border border-orange-400/40 bg-black/40 px-4 py-3 text-sm text-orange-100 outline-none focus:border-orange-300"
                />
              </label>
            </div>

            <div className="mt-4 rounded-2xl border border-orange-400/30 bg-black/25 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs uppercase tracking-[0.3em] text-orange-300">Cadence overrides</p>
                <button
                  onClick={addOverride}
                  className="rounded-full border border-orange-400/50 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-orange-200 hover:bg-orange-400 hover:text-black"
                >
                  Add override
                </button>
              </div>
              <div className="mt-4 space-y-3">
                {scheduleOverrides.map((rule) => (
                  <div key={rule.id} className="grid gap-3 md:grid-cols-4">
                    <input
                      value={rule.label}
                      onChange={(e) => updateOverride(rule.id, "label", e.target.value)}
                      placeholder="Sale window"
                      className="rounded-xl border border-orange-400/30 bg-black/40 px-3 py-2 text-sm text-orange-100 outline-none focus:border-orange-300"
                    />
                    <input
                      type="date"
                      value={rule.startDate}
                      onChange={(e) => updateOverride(rule.id, "startDate", e.target.value)}
                      className="rounded-xl border border-orange-400/30 bg-black/40 px-3 py-2 text-sm text-orange-100 outline-none focus:border-orange-300"
                    />
                    <input
                      type="date"
                      value={rule.endDate}
                      onChange={(e) => updateOverride(rule.id, "endDate", e.target.value)}
                      className="rounded-xl border border-orange-400/30 bg-black/40 px-3 py-2 text-sm text-orange-100 outline-none focus:border-orange-300"
                    />
                    <div className="flex gap-2">
                      <input
                        type="number"
                        min="1"
                        max="12"
                        value={rule.postsPerDay}
                        onChange={(e) => updateOverride(rule.id, "postsPerDay", Number(e.target.value || 1))}
                        className="w-full rounded-xl border border-orange-400/30 bg-black/40 px-3 py-2 text-sm text-orange-100 outline-none focus:border-orange-300"
                      />
                      <button
                        onClick={() => removeOverride(rule.id)}
                        className="rounded-xl border border-red-400/40 px-3 py-2 text-xs font-bold uppercase tracking-[0.2em] text-red-200 hover:bg-red-400 hover:text-black"
                      >
                        X
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-orange-400/30 bg-black/25 p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-orange-300">Bulk GPT import</p>
              <p className="mt-2 text-sm text-orange-100/80">
                Paste a JSON array of affiliate rows here. The builder will turn them into editable rows.
              </p>
              <textarea
                value={bulkJson}
                onChange={(e) => setBulkJson(e.target.value)}
                rows={10}
                placeholder={`[\n  {\n    "keyword": "cozy desk lighting for night work setup",\n    "angle": "problem",\n    "productLink": "https://www.amazon.com/...",\n    "title": "Cozy desk lighting for night work setup",\n    "description": "Desk lighting ideas that feel warm and easy on your eyes for late-night work.",\n    "image": "desk_lamp_01.jpg",\n    "board": "Cozy Desk Setup"\n  }\n]`}
                className="mt-3 w-full rounded-2xl border border-orange-400/30 bg-black/40 px-4 py-3 text-sm text-orange-100 outline-none focus:border-orange-300"
              />
              <div className="mt-3">
                <button
                  onClick={importBulkRows}
                  className="rounded-full border border-orange-400/60 bg-orange-500/10 px-4 py-2 text-sm font-bold text-orange-100 transition hover:bg-orange-400 hover:text-black"
                >
                  Import JSON rows
                </button>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                onClick={addRow}
                className="rounded-full border border-orange-400/60 bg-orange-500/10 px-4 py-2 text-sm font-bold text-orange-100 transition hover:bg-orange-400 hover:text-black"
              >
                Add row
              </button>
              <button
                onClick={() => setRows([createEmptyRow(defaultBoard)])}
                className="rounded-full border border-red-400/60 bg-red-500/10 px-4 py-2 text-sm font-bold text-red-100 transition hover:bg-red-400 hover:text-black"
              >
                Reset builder
              </button>
              <button
                onClick={selectAllReady}
                className="rounded-full border border-cyan-400/60 bg-cyan-500/10 px-4 py-2 text-sm font-bold text-cyan-100 transition hover:bg-cyan-400 hover:text-black"
              >
                Select ready
              </button>
              <button
                onClick={clearSelection}
                className="rounded-full border border-stone-400/60 bg-stone-500/10 px-4 py-2 text-sm font-bold text-stone-100 transition hover:bg-stone-300 hover:text-black"
              >
                Clear selection
              </button>
              <button
                onClick={queueRows}
                disabled={isQueueing}
                className="rounded-full border border-lime-400/60 bg-lime-500/10 px-4 py-2 text-sm font-bold text-lime-100 transition hover:bg-lime-400 hover:text-black disabled:opacity-50"
              >
                {isQueueing ? "Queueing..." : "Queue ready rows"}
              </button>
            </div>

            <div className="mt-6 space-y-4">
              {rows.map((row, index) => (
                <article
                  key={row.id}
                  className="rounded-2xl border border-orange-400/30 bg-black/30 p-4"
                >
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(row.id)}
                        onChange={() => toggleSelected(row.id)}
                        className="h-4 w-4 rounded border-orange-400/50 bg-black/40 text-orange-400"
                      />
                      <p className="text-sm font-bold uppercase tracking-[0.25em] text-orange-200">
                        Row {index + 1}
                      </p>
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => duplicateRow(row.id)}
                        className="rounded-full border border-cyan-400/50 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-cyan-200 hover:bg-cyan-400 hover:text-black"
                      >
                        Duplicate
                      </button>
                      <button
                        onClick={() => expandAngles(row.id)}
                        className="rounded-full border border-lime-400/50 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-lime-200 hover:bg-lime-400 hover:text-black"
                      >
                        Expand angles
                      </button>
                      <button
                        onClick={() => removeRow(row.id)}
                        className="rounded-full border border-red-400/50 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-red-200 hover:bg-red-400 hover:text-black"
                      >
                        Remove
                      </button>
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="block">
                      <span className="text-xs uppercase tracking-[0.25em] text-orange-300">Keyword</span>
                      <input
                        value={row.keyword}
                        onChange={(e) => updateRow(row.id, "keyword", e.target.value)}
                        placeholder="cozy desk lighting for night work setup"
                        className="mt-2 w-full rounded-xl border border-orange-400/30 bg-black/40 px-3 py-2 text-sm text-orange-100 outline-none focus:border-orange-300"
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs uppercase tracking-[0.25em] text-orange-300">Angle</span>
                      <input
                        value={row.angle}
                        onChange={(e) => updateRow(row.id, "angle", e.target.value)}
                        placeholder="beginner"
                        className="mt-2 w-full rounded-xl border border-orange-400/30 bg-black/40 px-3 py-2 text-sm text-orange-100 outline-none focus:border-orange-300"
                      />
                    </label>
                    <label className="block md:col-span-2">
                      <span className="text-xs uppercase tracking-[0.25em] text-orange-300">Product link</span>
                      <input
                        value={row.productLink}
                        onChange={(e) => updateRow(row.id, "productLink", e.target.value)}
                        placeholder="https://www.amazon.com/..."
                        className="mt-2 w-full rounded-xl border border-orange-400/30 bg-black/40 px-3 py-2 text-sm text-orange-100 outline-none focus:border-orange-300"
                      />
                    </label>
                    <label className="block md:col-span-2">
                      <span className="text-xs uppercase tracking-[0.25em] text-orange-300">Title</span>
                      <input
                        value={row.title}
                        onChange={(e) => updateRow(row.id, "title", e.target.value)}
                        placeholder="cozy desk lighting for night work setup"
                        className="mt-2 w-full rounded-xl border border-orange-400/30 bg-black/40 px-3 py-2 text-sm text-orange-100 outline-none focus:border-orange-300"
                      />
                    </label>
                    <label className="block md:col-span-2">
                      <span className="text-xs uppercase tracking-[0.25em] text-orange-300">Description</span>
                      <textarea
                        value={row.description}
                        onChange={(e) => updateRow(row.id, "description", e.target.value)}
                        rows={3}
                        className="mt-2 w-full rounded-xl border border-orange-400/30 bg-black/40 px-3 py-2 text-sm text-orange-100 outline-none focus:border-orange-300"
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs uppercase tracking-[0.25em] text-orange-300">Image</span>
                      <input
                        value={row.image}
                        onChange={(e) => updateRow(row.id, "image", e.target.value)}
                        placeholder="desk_lamp_01.jpg"
                        className="mt-2 w-full rounded-xl border border-orange-400/30 bg-black/40 px-3 py-2 text-sm text-orange-100 outline-none focus:border-orange-300"
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs uppercase tracking-[0.25em] text-orange-300">Board</span>
                      <input
                        value={row.board}
                        onChange={(e) => updateRow(row.id, "board", e.target.value)}
                        placeholder={defaultBoard || "Affiliate Finds"}
                        className="mt-2 w-full rounded-xl border border-orange-400/30 bg-black/40 px-3 py-2 text-sm text-orange-100 outline-none focus:border-orange-300"
                      />
                    </label>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {ANGLE_PRESETS.map((preset) => (
                      <button
                        key={preset}
                        onClick={() => applyAnglePreset(row.id, preset)}
                        className="rounded-full border border-orange-400/40 px-3 py-1 text-xs uppercase tracking-[0.2em] text-orange-200 hover:bg-orange-400 hover:text-black"
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </section>

          <aside className="space-y-6">
            <section className="rounded-3xl border border-cyan-500/40 bg-cyan-950/15 p-6 text-cyan-100 shadow-[0_0_24px_rgba(34,211,238,0.12)]">
              <p className="text-xs uppercase tracking-[0.35em] text-cyan-300">Builder rules</p>
              <ul className="mt-4 space-y-3 text-sm leading-7">
                <li>- Each row is one Pinterest-ready affiliate post.</li>
                <li>- Keep the internal shape minimal: keyword, angle, product link, title, description, image, board.</li>
                <li>- Expand one product across angles instead of adding random unrelated products.</li>
                <li>- Use this builder for volume, then post rows one by one through the existing Pinterest lane.</li>
                <li>- Default cadence is 3/day unless an override window says otherwise.</li>
                <li>- Builder state autosaves locally so you can come back without losing the batch.</li>
                <li>- Queueing mixes rows by product/link so one product does not clump on consecutive slots.</li>
              </ul>
            </section>

            <section className="rounded-3xl border border-fuchsia-500/40 bg-fuchsia-950/15 p-6 text-fuchsia-100 shadow-[0_0_24px_rgba(217,70,239,0.12)]">
              <p className="text-xs uppercase tracking-[0.35em] text-fuchsia-300">Queue summary</p>
              <p className="mt-2 text-sm text-fuchsia-100/80">
                This builder is focused on getting affiliate rows into PostPunk, not paid bulk export.
              </p>
              <p className="mt-4 text-sm text-fuchsia-100/80">
                Selected ready rows: {exportableRows.length} / {readyRows.length} ready / {rows.length} total in <span className="font-bold">{batchLabel}</span>
              </p>
              <div className="mt-4 rounded-2xl border border-fuchsia-400/30 bg-black/25 p-4 text-sm leading-7">
                <p className="font-bold text-fuchsia-200">Schedule preview</p>
                <div className="mt-2 max-h-40 overflow-auto space-y-1 text-xs text-fuchsia-100/85">
                  {schedulePreview.length === 0 ? (
                    <p>No rows ready yet.</p>
                  ) : (
                    schedulePreview.slice(0, 24).map((slot, index) => (
                      <p key={`${slot}-${index}`}>{index + 1}. {slot}</p>
                    ))
                  )}
                </div>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
