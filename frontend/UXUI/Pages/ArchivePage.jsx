import { useEffect, useMemo, useState } from "react";
import AppTopNav from "../Components/AppTopNav";

const API_BASE = import.meta.env?.VITE_API_BASE || "http://localhost:3001";

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function normalizeTargets(entry) {
  if (!Array.isArray(entry?.targets) || entry.targets.length === 0) return "—";
  return entry.targets
    .map((target) => {
      if (typeof target === "string") return target;
      if (target?.accountId) return `${target.platform} (${target.accountId})`;
      return target?.platform || "unknown";
    })
    .join(", ");
}

export default function ArchivePage() {
  const [archive, setArchive] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    let ignore = false;
    async function loadArchive() {
      try {
        setLoading(true);
        const res = await fetch(`${API_BASE}/api/posts/archive`);
        if (!res.ok) throw new Error(`Archive HTTP ${res.status}`);
        const data = await res.json();
        if (!ignore) {
          setArchive(Array.isArray(data) ? data : []);
          setError("");
        }
      } catch (err) {
        console.error("Failed to load posted archive", err);
        if (!ignore) setError("Could not load the posted archive.");
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    loadArchive();
    return () => {
      ignore = true;
    };
  }, []);

  const filteredArchive = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return archive;
    return archive.filter((entry) => {
      const haystack = [
        entry?.title,
        entry?.productProfileId,
        entry?.metadata?.productProfileLabel,
        normalizeTargets(entry),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [archive, search]);

  return (
    <div className="min-h-screen bg-black text-teal-200 font-mono">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <AppTopNav />
        <header className="mb-8 border-b border-orange-500 pb-6">
          <p className="text-sm uppercase tracking-[0.3em] text-orange-500">posted archive</p>
          <h1 className="mt-2 text-4xl md:text-5xl text-orange-300 glitchy">Afterparty Ledger</h1>
          <p className="mt-3 max-w-3xl text-sm text-teal-400">
            Browse the posts that already went out so they do not just vanish from view once they
            leave the active queue.
          </p>
        </header>

        <section className="mb-6 rounded-lg border border-orange-500 bg-black/60 p-5 shadow-[0_0_20px_rgba(249,115,22,0.18)]">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-orange-400">Search The History</p>
              <p className="mt-2 text-sm text-teal-400">
                Filter by title, product, or target platform/account.
              </p>
            </div>
            <div className="w-full md:max-w-md">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search archive..."
                className="w-full rounded border border-teal-500 bg-black p-3 text-teal-200"
              />
            </div>
          </div>
        </section>

        {error ? (
          <div className="rounded border border-red-500 bg-red-950/20 px-4 py-3 text-red-300">
            {error}
          </div>
        ) : null}

        {loading ? (
          <p className="text-center text-teal-400">Loading archive...</p>
        ) : filteredArchive.length === 0 ? (
          <p className="text-center text-teal-500">No posted history found yet.</p>
        ) : (
          <div className="space-y-4">
            {filteredArchive.map((entry, index) => (
              <article
                key={`${entry?.id || entry?.title || "archive"}-${entry?.processedAt || index}`}
                className="rounded-lg border border-teal-600 bg-black/60 p-5 shadow-[0_0_18px_rgba(13,148,136,0.2)]"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-2">
                    <h2 className="text-xl text-pink-300">{entry?.title || "Untitled post"}</h2>
                    <p className="text-sm text-teal-400">
                      Posted: {formatDate(entry?.processedAt || entry?.createdAt)}
                    </p>
                    <p className="text-sm text-teal-400">Targets: {normalizeTargets(entry)}</p>
                    {entry?.metadata?.productProfileLabel || entry?.productProfileId ? (
                      <p className="text-sm text-teal-400">
                        Product: {entry?.metadata?.productProfileLabel || entry?.productProfileId}
                      </p>
                    ) : null}
                  </div>
                  <div className="rounded border border-orange-500 px-3 py-2 text-sm text-orange-200">
                    archived
                  </div>
                </div>

                {entry?.body ? (
                  <div className="mt-4 rounded border border-teal-800 bg-black/50 p-4 text-sm leading-6 text-teal-100 whitespace-pre-wrap">
                    {entry.body}
                  </div>
                ) : (
                  <div className="mt-4 rounded border border-amber-500/60 bg-amber-950/10 p-4 text-sm text-amber-200">
                    Full post body is not available for this older archive entry. New posted items
                    will save the full body going forward.
                  </div>
                )}

                {Array.isArray(entry?.results) && entry.results.length > 0 ? (
                  <div className="mt-4 rounded border border-pink-600 bg-black/50 p-4">
                    <p className="text-xs uppercase tracking-[0.3em] text-pink-400">Posting Results</p>
                    <ul className="mt-3 space-y-2 text-sm text-teal-300">
                      {entry.results.map((result, resultIndex) => (
                        <li key={`${result.platform || "result"}-${resultIndex}`}>
                          {result.platform || "platform"}: {result.status || "unknown"}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
