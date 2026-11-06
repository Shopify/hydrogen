import assert from "node:assert/strict";

import { describe, it } from "vitest";

import { serializeEvidence } from "./evidence.ts";

describe("serializeEvidence", () => {
  it("projects errors to name and message without SDK request or response properties", () => {
    const error = Object.assign(new Error("Invalid API key"), {
      request: { headers: { authorization: "FAKE_ONLY_REQUEST_AUTH" } },
      responseHeaders: { "set-cookie": "FAKE_ONLY_RESPONSE_COOKIE" },
      responseBody: "FAKE_ONLY_BODY",
      cause: new Error("FAKE_ONLY_CAUSE"),
    });
    assert.deepEqual(JSON.parse(serializeEvidence({ error })), {
      error: { name: "Error", message: "Invalid API key" },
    });
  });
});
