import test from "node:test";
import assert from "node:assert/strict";
import { buildArchiveEntry } from "../utils/archiveEntry.mjs";

test("buildArchiveEntry preserves hashtag strings as normalized arrays", () => {
  const entry = buildArchiveEntry({
    id: "p1",
    title: "Post",
    body: "Body",
    hashtags: "#one two,three",
  });

  assert.deepEqual(entry.hashtags, ["#one", "#two", "#three"]);
});
