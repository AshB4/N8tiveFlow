import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeTargets,
  withAffiliateTag,
  normalizeProductLink,
  ensureProductLink,
  normalizeHashtags,
  isConfiguredValue,
  isThreadsConfigured,
} from "../scripts/platforms/post-to-all.js";

test("normalizeTargets normalizes strings and object targets", () => {
  const result = normalizeTargets([
    "X",
    { platform: "Facebook", accountId: 12 },
    { name: "threads", id: "threads-main" },
  ]);

  assert.deepEqual(result, [
    { platform: "x", accountId: null },
    { platform: "facebook", accountId: "12" },
    { platform: "threads", accountId: "threads-main" },
  ]);
});

test("normalizeTargets preserves null account ids as null", () => {
  const result = normalizeTargets([
    { platform: "devto", accountId: null },
  ]);

  assert.deepEqual(result, [{ platform: "devto", accountId: null }]);
});

test("withAffiliateTag only tags plain Amazon links", () => {
  const result = withAffiliateTag(
    "Read this https://www.amazon.com/example-product and keep this https://example.com/test",
    "ashb4studio0b-20",
  );

  assert.match(result, /amazon\.com\/example-product\?tag=ashb4studio0b-20/);
  assert.match(result, /https:\/\/example\.com\/test/);
});

test("withAffiliateTag preserves vended Amazon links", () => {
  const source =
    "https://www.amazon.com/example-product?ref_=abc123&linkCode=ll1";
  const result = withAffiliateTag(source, "ashb4studio0b-20");
  assert.equal(result, source);
});

test("normalizeProductLink tags amazon product links", () => {
  const result = normalizeProductLink(
    {
      metadata: {
        productLinks: {
          primary: "https://www.amazon.com/example-product",
        },
      },
    },
    "ashb4studio0b-20",
  );

  assert.match(result, /amazon\.com\/example-product\?tag=ashb4studio0b-20/);
});

test("normalizeProductLink accepts legacy metadata productLink", () => {
  const result = normalizeProductLink({
    metadata: {
      productLink: "https://example.com/product",
    },
  });

  assert.equal(result, "https://example.com/product");
});

test("ensureProductLink appends missing product link", () => {
  const result = ensureProductLink("Helpful punch post", "https://example.com/product");
  assert.match(result, /Helpful punch post/);
  assert.match(result, /https:\/\/example\.com\/product/);
});

test("normalizeHashtags normalizes arrays and strings", () => {
  assert.deepEqual(normalizeHashtags("#one two,three"), ["#one", "#two", "#three"]);
  assert.deepEqual(normalizeHashtags(["one", "#two"]), ["#one", "#two"]);
});

test("isConfiguredValue rejects placeholders", () => {
  assert.equal(isConfiguredValue("TODO_TOKEN"), false);
  assert.equal(isConfiguredValue("replace-me"), false);
  assert.equal(isConfiguredValue("real-token"), true);
});

test("isThreadsConfigured requires token and account id", () => {
  assert.equal(
    isThreadsConfigured({
      credentials: { accessToken: "token" },
      metadata: { accountId: "acct" },
    }),
    true,
  );
  assert.equal(
    isThreadsConfigured({
      credentials: { accessToken: "" },
      metadata: { accountId: "acct" },
    }),
    false,
  );
});
