import test from "node:test";
import assert from "node:assert/strict";
import { findDuplicatePost } from "../utils/queueGuard.mjs";

test("findDuplicatePost detects duplicates with normalized targets", () => {
  const posts = [
    {
      id: "p1",
      title: "Hello World",
      body: "This is a post",
      scheduledAt: "2026-03-14T12:00:00.000Z",
      targets: [
        { platform: "x", accountId: "main" },
        { platform: "facebook", accountId: "page-1" },
      ],
    },
  ];

  const candidate = {
    title: "  hello world ",
    body: "This   is a post",
    scheduledAt: "2026-03-14T12:00:00Z",
    targets: [
      { platform: "facebook", accountId: "page-1" },
      { platform: "x", accountId: "main" },
    ],
  };

  const duplicate = findDuplicatePost(posts, candidate);
  assert.equal(duplicate?.id, "p1");
});

test("findDuplicatePost ignores excluded ids", () => {
  const posts = [
    {
      id: "p1",
      title: "Same",
      body: "Body",
      scheduledAt: "2026-03-14T12:00:00.000Z",
      targets: [{ platform: "x", accountId: "main" }],
    },
  ];

  const candidate = {
    id: "p1",
    title: "Same",
    body: "Body",
    scheduledAt: "2026-03-14T12:00:00.000Z",
    targets: [{ platform: "x", accountId: "main" }],
  };

  const duplicate = findDuplicatePost(posts, candidate, { excludeId: "p1" });
  assert.equal(duplicate, null);
});
