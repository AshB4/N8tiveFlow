import { useEffect, useMemo, useState } from "react";
import AppTopNav from "../Components/AppTopNav";
import { useToast } from "@/Components/ui/use-toast";
import { productProfiles } from "../utils/productProfiles";

const API_BASE = import.meta.env?.VITE_API_BASE || "http://localhost:3001";

const emptyCustomProduct = {
  id: "",
  label: "",
  link: "",
  category: "",
  notes: "",
  lifecycleStatus: "live",
};

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

function moveItem(list, index, direction) {
  const target = index + direction;
  if (target < 0 || target >= list.length) return list;
  const next = [...list];
  const [item] = next.splice(index, 1);
  next.splice(target, 0, item);
  return next;
}

function isCustomProduct(settings, productId) {
  return (settings?.customProducts || []).some((entry) => entry.id === productId);
}

export default function SetupPage() {
  const { toast } = useToast();
  const builtInProducts = useMemo(
    () =>
      productProfiles.map((profile) => ({
        id: profile.id,
        label: profile.label,
        category: profile.category,
        lifecycleStatus: profile.lifecycleStatus,
        link: profile?.links?.primary || profile?.links?.gumroad || profile?.links?.amazon || "",
        notes: Array.isArray(profile.notes) ? profile.notes.join(" ") : "",
      })),
    [],
  );
  const [settings, setSettings] = useState(null);
  const [customForm, setCustomForm] = useState(emptyCustomProduct);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadSettings() {
      try {
        setLoading(true);
        const res = await fetch(`${API_BASE}/api/settings/rotation`);
        if (!res.ok) throw new Error(`Failed to load settings: ${res.status}`);
        const data = await res.json();
        setSettings(data);
      } catch (error) {
        toast({
          title: "Could not load setup",
          description: error.message,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    }

    loadSettings();
  }, [toast]);

  const allProducts = useMemo(() => {
    const customProducts = Array.isArray(settings?.customProducts) ? settings.customProducts : [];
    return [...builtInProducts, ...customProducts];
  }, [builtInProducts, settings?.customProducts]);

  const orderedProducts = useMemo(() => {
    if (!settings) return [];
    const lookup = new Map(allProducts.map((product) => [product.id, product]));
    const ordered = [];
    for (const productId of settings.activeProductIds || []) {
      if (lookup.has(productId)) ordered.push(lookup.get(productId));
    }
    for (const product of allProducts) {
      if (!(settings.activeProductIds || []).includes(product.id)) {
        ordered.push(product);
      }
    }
    return ordered;
  }, [allProducts, settings]);

  const updateSettings = (updater) => {
    setSettings((current) => {
      if (!current) return current;
      return typeof updater === "function" ? updater(current) : { ...current, ...updater };
    });
  };

  const toggleActiveProduct = (productId) => {
    updateSettings((current) => {
      const active = new Set(current.activeProductIds || []);
      if (active.has(productId)) {
        active.delete(productId);
      } else {
        active.add(productId);
      }
      const orderedIds = orderedProducts
        .map((product) => product.id)
        .filter((id) => active.has(id));
      return { ...current, activeProductIds: orderedIds };
    });
  };

  const moveProduct = (productId, direction) => {
    updateSettings((current) => {
      const activeIds = current.activeProductIds || [];
      const index = activeIds.indexOf(productId);
      if (index === -1) return current;
      return { ...current, activeProductIds: moveItem(activeIds, index, direction) };
    });
  };

  const handleAddCustomProduct = () => {
    if (!customForm.label.trim()) {
      toast({
        title: "Missing label",
        description: "Give the product a name before adding it to the rotation pool.",
        variant: "destructive",
      });
      return;
    }

    const nextId = customForm.id?.trim() || slugify(customForm.label);
    const idExists =
      (settings.customProducts || []).some((product) => product.id === nextId) ||
      builtInProducts.some((product) => product.id === nextId);
    if (idExists) {
      toast({
        title: "Duplicate product id",
        description: "That id already exists. Change the label or type a different slug.",
        variant: "destructive",
      });
      return;
    }

    updateSettings((current) => {
      const customProducts = Array.isArray(current.customProducts) ? [...current.customProducts] : [];
      const nextProduct = {
        ...customForm,
        id: nextId,
        label: customForm.label.trim(),
        link: customForm.link.trim(),
        category: customForm.category.trim(),
        notes: customForm.notes.trim(),
      };
      return {
        ...current,
        customProducts: [...customProducts, nextProduct],
        activeProductIds: [...(current.activeProductIds || []), nextProduct.id],
      };
    });
    setCustomForm(emptyCustomProduct);
    toast({
      title: "Custom product added",
      description: "It is now part of the rotation setup and can be scheduled later.",
    });
  };

  const removeCustomProduct = (productId) => {
    const product = (settings?.customProducts || []).find((entry) => entry.id === productId);
    const confirmed = window.confirm(
      `Delete ${product?.label || "this custom product"} from setup? This removes it from the rotation list too.`,
    );
    if (!confirmed) return;

    updateSettings((current) => ({
      ...current,
      customProducts: (current.customProducts || []).filter((product) => product.id !== productId),
      activeProductIds: (current.activeProductIds || []).filter((id) => id !== productId),
    }));
  };

  const saveSettings = async () => {
    try {
      setSaving(true);
      const res = await fetch(`${API_BASE}/api/settings/rotation`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (!res.ok) throw new Error(`Failed to save settings: ${res.status}`);
      const saved = await res.json();
      setSettings(saved);
      toast({
        title: "Rotation saved",
        description: "Library scheduling will now use this product order and cadence.",
      });
    } catch (error) {
      toast({
        title: "Save failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading || !settings) {
    return (
      <div className="min-h-screen bg-black text-teal-300 font-mono">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <AppTopNav />
          <p className="text-center text-teal-400">Loading setup...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-teal-300 font-mono">
      <div className="max-w-6xl mx-auto px-6 py-12">
        <AppTopNav />
        <header className="mb-8 border-b border-lime-500 pb-6">
          <p className="text-sm uppercase tracking-[0.3em] text-lime-500">setup</p>
          <h1 className="mt-2 text-4xl md:text-5xl text-lime-300 glitchy">Rotation Rituals</h1>
          <p className="mt-3 max-w-3xl text-sm text-teal-400">
            This is the control panel for your one-post-a-day rotation. Set the default cadence,
            choose which products are live in the mix, and add future products before they have full
            content batches.
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-lg border border-lime-500 bg-black/60 p-5 shadow-[0_0_20px_rgba(132,204,22,0.16)]">
            <p className="text-sm uppercase tracking-[0.3em] text-lime-500">Scheduler Defaults</p>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="text-sm uppercase tracking-[0.2em] text-lime-300">Days Between Posts</span>
                <input
                  type="number"
                  min="1"
                  value={settings.cadenceDays}
                  onChange={(e) =>
                    updateSettings({ cadenceDays: Math.max(1, Number.parseInt(e.target.value, 10) || 1) })
                  }
                  className="mt-2 w-full rounded border border-teal-500 bg-black p-3 text-teal-200"
                />
              </label>
              <label className="block">
                <span className="text-sm uppercase tracking-[0.2em] text-lime-300">Default Time</span>
                <input
                  type="time"
                  value={settings.defaultTime}
                  onChange={(e) => updateSettings({ defaultTime: e.target.value })}
                  className="mt-2 w-full rounded border border-teal-500 bg-black p-3 text-teal-200"
                />
              </label>
              <label className="block">
                <span className="text-sm uppercase tracking-[0.2em] text-lime-300">Max Posts Per Day</span>
                <input
                  type="number"
                  min="1"
                  max="5"
                  value={settings.maxPostsPerDay}
                  onChange={(e) =>
                    updateSettings({ maxPostsPerDay: Math.max(1, Number.parseInt(e.target.value, 10) || 1) })
                  }
                  className="mt-2 w-full rounded border border-teal-500 bg-black p-3 text-teal-200"
                />
              </label>
              <label className="block">
                <span className="text-sm uppercase tracking-[0.2em] text-lime-300">Creator Post Frequency (days)</span>
                <input
                  type="number"
                  min="7"
                  value={settings.creatorPostFrequencyDays}
                  onChange={(e) =>
                    updateSettings({
                      creatorPostFrequencyDays: Math.max(7, Number.parseInt(e.target.value, 10) || 30),
                    })
                  }
                  className="mt-2 w-full rounded border border-teal-500 bg-black p-3 text-teal-200"
                />
              </label>
            </div>
            <div className="mt-4 flex flex-wrap gap-6 text-sm text-teal-300">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={settings.mixProducts}
                  onChange={() => updateSettings({ mixProducts: !settings.mixProducts })}
                />
                Mix products across days by default
              </label>
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={settings.approveOnSchedule}
                  onChange={() => updateSettings({ approveOnSchedule: !settings.approveOnSchedule })}
                />
                Approve automatically when bulk scheduled
              </label>
            </div>
          </section>

          <section className="rounded-lg border border-pink-600 bg-black/60 p-5 shadow-[0_0_20px_rgba(236,72,153,0.14)]">
            <p className="text-sm uppercase tracking-[0.3em] text-pink-500">Why This Exists</p>
            <div className="mt-4 space-y-3 text-sm text-teal-300">
              <p>You said you are lazy enough to want one post per day. This page locks that in.</p>
              <p>Write or import one product batch at a time. The library scheduler will still remix them across days using the order saved here.</p>
              <p>When you release more products, add them here first so they are part of the rotation plan before you build their content pile.</p>
            </div>
          </section>
        </div>

        <section className="mt-6 rounded-lg border border-teal-500 bg-black/60 p-5 shadow-[0_0_20px_rgba(13,148,136,0.2)]">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-teal-400">Rotation Order</p>
              <h2 className="mt-1 text-2xl text-teal-200">Active products in the day-by-day mix</h2>
              <p className="mt-2 text-sm text-teal-400">
                The library scheduler uses this order first, then round-robins across selected posts.
              </p>
            </div>
            <p className="text-sm text-lime-300">{(settings.activeProductIds || []).length} active products</p>
          </div>

          <div className="mt-5 space-y-3">
            {orderedProducts.map((product) => {
              const active = (settings.activeProductIds || []).includes(product.id);
              const activeIndex = (settings.activeProductIds || []).indexOf(product.id);
              const isCustom = isCustomProduct(settings, product.id);
              return (
                <div
                  key={product.id}
                  className={`rounded border p-4 ${active ? "border-lime-500 bg-lime-950/10" : "border-gray-700 bg-black/40"}`}
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg text-teal-200">{product.label}</h3>
                        <span className="rounded border border-pink-500 px-2 py-0.5 text-xs uppercase tracking-[0.2em] text-pink-300">
                          {product.lifecycleStatus || "live"}
                        </span>
                        {product.category ? (
                          <span className="rounded border border-teal-500 px-2 py-0.5 text-xs text-teal-300">
                            {product.category}
                          </span>
                        ) : null}
                      </div>
                      {product.link ? (
                        <p className="mt-2 break-all text-xs text-cyan-300">{product.link}</p>
                      ) : null}
                      {product.notes ? <p className="mt-2 text-sm text-teal-400">{product.notes}</p> : null}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {active ? (
                        <button
                          type="button"
                          onClick={() => toggleActiveProduct(product.id)}
                          className="rounded border border-lime-500 px-3 py-2 text-lime-200 transition-colors hover:bg-lime-500 hover:text-black"
                        >
                          In Rotation
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => toggleActiveProduct(product.id)}
                          className="rounded border border-cyan-500 px-3 py-2 text-cyan-200 transition-colors hover:bg-cyan-500 hover:text-black"
                        >
                          Add To Rotation
                        </button>
                      )}
                      {active ? (
                        <>
                          <button
                            type="button"
                            onClick={() => moveProduct(product.id, -1)}
                            disabled={activeIndex <= 0}
                            className="rounded border border-teal-500 px-3 py-2 text-teal-200 hover:bg-teal-500 hover:text-black disabled:opacity-40"
                          >
                            Move Up
                          </button>
                          <button
                            type="button"
                            onClick={() => moveProduct(product.id, 1)}
                            disabled={activeIndex === -1 || activeIndex >= (settings.activeProductIds || []).length - 1}
                            className="rounded border border-teal-500 px-3 py-2 text-teal-200 hover:bg-teal-500 hover:text-black disabled:opacity-40"
                          >
                            Move Down
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleActiveProduct(product.id)}
                            className="rounded border border-gray-600 px-3 py-2 text-gray-300 hover:bg-gray-700"
                          >
                            Keep Off Rotation
                          </button>
                        </>
                      ) : null}
                      {isCustom ? (
                        <button
                          type="button"
                          onClick={() => removeCustomProduct(product.id)}
                          className="rounded border border-red-500 px-3 py-2 text-red-200 hover:bg-red-500 hover:text-white"
                          title="Delete custom product"
                        >
                          X Delete
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="mt-6 rounded-lg border border-cyan-500 bg-black/60 p-5 shadow-[0_0_20px_rgba(34,211,238,0.14)]">
          <p className="text-sm uppercase tracking-[0.3em] text-cyan-400">Add Future Product</p>
          <p className="mt-2 text-sm text-teal-400">
            Use this for products that are not wired into the hardcoded profile list yet. It saves the
            rotation placeholder now so future scheduling doesn’t need a code edit first.
          </p>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="text-sm uppercase tracking-[0.2em] text-cyan-300">Label</span>
              <input
                type="text"
                value={customForm.label}
                onChange={(e) => setCustomForm((current) => ({ ...current, label: e.target.value }))}
                className="mt-2 w-full rounded border border-teal-500 bg-black p-3 text-teal-200"
                placeholder="New product name"
              />
            </label>
            <label className="block">
              <span className="text-sm uppercase tracking-[0.2em] text-cyan-300">Slug / ID</span>
              <input
                type="text"
                value={customForm.id}
                onChange={(e) => setCustomForm((current) => ({ ...current, id: slugify(e.target.value) }))}
                className="mt-2 w-full rounded border border-teal-500 bg-black p-3 text-teal-200"
                placeholder="optional-custom-id"
              />
            </label>
            <label className="block">
              <span className="text-sm uppercase tracking-[0.2em] text-cyan-300">Primary Link</span>
              <input
                type="text"
                value={customForm.link}
                onChange={(e) => setCustomForm((current) => ({ ...current, link: e.target.value }))}
                className="mt-2 w-full rounded border border-teal-500 bg-black p-3 text-teal-200"
                placeholder="https://..."
              />
            </label>
            <label className="block">
              <span className="text-sm uppercase tracking-[0.2em] text-cyan-300">Category</span>
              <input
                type="text"
                value={customForm.category}
                onChange={(e) => setCustomForm((current) => ({ ...current, category: e.target.value }))}
                className="mt-2 w-full rounded border border-teal-500 bg-black p-3 text-teal-200"
                placeholder="Digital products / Physical products / etc"
              />
            </label>
          </div>

          <label className="mt-4 block">
            <span className="text-sm uppercase tracking-[0.2em] text-cyan-300">Notes</span>
            <textarea
              value={customForm.notes}
              onChange={(e) => setCustomForm((current) => ({ ...current, notes: e.target.value }))}
              rows={3}
              className="mt-2 w-full rounded border border-teal-500 bg-black p-3 text-teal-200"
              placeholder="Quick reminder about voice, audience, or where it sells."
            />
          </label>

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleAddCustomProduct}
              className="rounded border border-cyan-500 px-4 py-2 text-cyan-200 hover:bg-cyan-500 hover:text-black"
            >
              Add Product To Rotation
            </button>
            <button
              type="button"
              onClick={() => setCustomForm(emptyCustomProduct)}
              className="rounded border border-gray-600 px-4 py-2 text-gray-300 hover:bg-gray-700"
            >
              Clear Form
            </button>
          </div>
        </section>

        <div className="mt-8 flex justify-end">
          <button
            type="button"
            onClick={saveSettings}
            disabled={saving}
            className="rounded border border-lime-500 bg-lime-500 px-5 py-3 text-black transition-colors hover:bg-lime-400 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Rotation Setup"}
          </button>
        </div>
      </div>
    </div>
  );
}
