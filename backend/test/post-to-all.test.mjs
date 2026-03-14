import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeTargets,
  withAffiliateTag,
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
