const AMAZON_ASIN_PATTERN = /\/dp\/([A-Z0-9]{10})(?:[/?]|$)/i;

export function getPostProductLink(post) {
  return (
    post?.metadata?.productLinks?.primary ||
    post?.metadata?.productLinks?.amazon ||
    post?.metadata?.productLinks?.gumroad ||
    ""
  );
}

export function canonicalizeProductLink(link) {
  const raw = String(link || "").trim();
  if (!raw) return "";

  try {
    const parsed = new URL(raw);
    if (/(^|\.)amazon\./i.test(parsed.hostname)) {
      const asin = parsed.pathname.match(AMAZON_ASIN_PATTERN)?.[1]?.toUpperCase() || "";
      return asin ? `amazon:${asin}` : `${parsed.origin}${parsed.pathname}`;
    }
    return `${parsed.origin}${parsed.pathname}`.replace(/\/+$/, "");
  } catch {
    return raw.toLowerCase();
  }
}

export function getPostProductIdentity(post) {
  const canonicalLink = canonicalizeProductLink(getPostProductLink(post));
  return (
    canonicalLink ||
    String(post?.metadata?.productProfileId || "").trim() ||
    String(post?.metadata?.productProfileLabel || "").trim() ||
    String(post?.title || "").trim() ||
    String(post?.id || "").trim()
  );
}

export function getAffiliateRowIdentity(row) {
  const canonicalLink = canonicalizeProductLink(row?.productLink || row?.link || "");
  return (
    canonicalLink ||
    String(row?.keyword || "").trim().toLowerCase() ||
    String(row?.id || "").trim()
  );
}
