import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { getPseoPageBySlug, pseoPages } from "../../posts/pseoPages";

const CANONICAL_BASE =
  import.meta.env?.VITE_PUBLIC_SITE_URL || "http://localhost:5173";

function ensureMeta(selector, attributes) {
  let element = document.head.querySelector(selector);
  if (!element) {
    element = document.createElement("meta");
    document.head.appendChild(element);
  }
  Object.entries(attributes).forEach(([key, value]) => {
    element.setAttribute(key, value);
  });
}

function ensureCanonical(href) {
  let element = document.head.querySelector('link[rel="canonical"]');
  if (!element) {
    element = document.createElement("link");
    element.setAttribute("rel", "canonical");
    document.head.appendChild(element);
  }
  element.setAttribute("href", href);
}

export default function SeoPages() {
  const { slug } = useParams();
  const page = slug ? getPseoPageBySlug(slug) : null;

  useEffect(() => {
    if (!page) {
      document.title = "pSEO Library | PostPunk";
      return;
    }

    const canonicalUrl = `${CANONICAL_BASE}/pseo/${page.slug}`;
    const keywordText = Array.isArray(page.keywords) ? page.keywords.join(", ") : "";

    document.title = `${page.title} | PostPunk`;
    ensureCanonical(canonicalUrl);
    ensureMeta('meta[name="description"]', {
      name: "description",
      content: page.description,
    });
    ensureMeta('meta[name="keywords"]', {
      name: "keywords",
      content: keywordText,
    });
    ensureMeta('meta[property="og:title"]', {
      property: "og:title",
      content: page.title,
    });
    ensureMeta('meta[property="og:description"]', {
      property: "og:description",
      content: page.description,
    });
    ensureMeta('meta[property="og:url"]', {
      property: "og:url",
      content: canonicalUrl,
    });
    ensureMeta('meta[property="og:type"]', {
      property: "og:type",
      content: "article",
    });
    ensureMeta('meta[name="twitter:card"]', {
      name: "twitter:card",
      content: "summary_large_image",
    });
    ensureMeta('meta[name="twitter:title"]', {
      name: "twitter:title",
      content: page.title,
    });
    ensureMeta('meta[name="twitter:description"]', {
      name: "twitter:description",
      content: page.description,
    });
  }, [page]);

  if (!page) {
    return (
      <div className="min-h-screen bg-black text-teal-200 px-6 py-12 font-mono">
        <div className="mx-auto max-w-5xl">
          <p className="text-sm uppercase tracking-[0.3em] text-pink-500 mb-3">
            pseo library
          </p>
          <h1 className="text-4xl md:text-5xl text-pink-400 glitchy mb-4">
            Programmatic SEO Pages
          </h1>
          <p className="text-teal-300 max-w-2xl mb-10">
            Browse the current content cluster. Each page is backed by a stable slug
            and a lightweight structured content entry.
          </p>

          <div className="grid gap-4 md:grid-cols-2">
            {pseoPages.map((entry) => (
              <Link
                key={entry.slug}
                to={`/pseo/${entry.slug}`}
                className="rounded-xl border border-teal-700 bg-black/60 p-5 transition-colors hover:border-pink-500"
              >
                <p className="text-xs uppercase tracking-[0.3em] text-teal-500 mb-2">
                  {entry.audience}
                </p>
                <h2 className="text-xl text-pink-300 mb-2">{entry.title}</h2>
                <p className="text-sm text-teal-300">{entry.description}</p>
              </Link>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-teal-200 px-6 py-12 font-mono">
      <article className="mx-auto max-w-4xl">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-pink-700 pb-6">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-pink-500 mb-2">
              pseo article
            </p>
            <h1 className="text-4xl md:text-5xl text-pink-400 glitchy">
              {page.title}
            </h1>
          </div>
          <Link
            to="/pseo"
            className="rounded border border-teal-500 px-4 py-2 text-teal-300 transition-colors hover:bg-teal-500 hover:text-black"
          >
            Browse Cluster
          </Link>
        </div>

        <p className="mb-6 text-lg text-teal-300">{page.hero}</p>

        <div className="mb-8 grid gap-4 rounded-xl border border-teal-800 bg-zinc-950/80 p-5 md:grid-cols-3">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-teal-500">Audience</p>
            <p className="mt-2 text-pink-300">{page.audience}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-teal-500">Updated</p>
            <p className="mt-2 text-pink-300">{page.updatedAt}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-teal-500">Read Time</p>
            <p className="mt-2 text-pink-300">{page.readingTime}</p>
          </div>
        </div>

        <div className="space-y-8">
          {page.sections.map((section) => (
            <section key={section.heading} className="rounded-xl border border-teal-800 bg-black/60 p-6">
              <h2 className="mb-4 text-2xl text-pink-300">{section.heading}</h2>
              <div className="space-y-4 text-teal-200">
                {section.body.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </section>
          ))}
        </div>

        <section className="mt-10 rounded-xl border border-pink-800 bg-zinc-950/80 p-6">
          <h2 className="mb-4 text-2xl text-pink-300">Related Pages</h2>
          <div className="flex flex-wrap gap-3">
            {page.relatedSlugs.map((relatedSlug) => {
              const relatedPage = getPseoPageBySlug(relatedSlug);
              if (!relatedPage) return null;
              return (
                <Link
                  key={relatedSlug}
                  to={`/pseo/${relatedSlug}`}
                  className="rounded border border-teal-600 px-3 py-2 text-sm text-teal-200 transition-colors hover:border-pink-500 hover:text-pink-300"
                >
                  {relatedPage.title}
                </Link>
              );
            })}
          </div>
        </section>

        <section className="mt-8">
          <p className="text-xs uppercase tracking-[0.3em] text-teal-500 mb-3">
            Target Keywords
          </p>
          <div className="flex flex-wrap gap-2">
            {page.keywords.map((keyword) => (
              <span
                key={keyword}
                className="rounded-full border border-pink-700 px-3 py-1 text-sm text-pink-200"
              >
                {keyword}
              </span>
            ))}
          </div>
        </section>
      </article>
    </div>
  );
}
