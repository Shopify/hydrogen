import assert from "node:assert/strict";
import { test } from "node:test";

import {
  checkFeatures,
  parseRegistry,
  type Feature,
  type ProofResult,
  type Workspace,
} from "./check-features.ts";

const URL_TEST = "src/core/collection/__tests__/url.property.test.ts";

function feature(overrides: Partial<Feature> = {}): Feature {
  return {
    id: "collection.url-params",
    promise: "Collection filter and sort state survives a trip through the URL.",
    status: "shipped",
    owner: "hydrogen",
    entry_points: ["src/core/collection/url.ts"],
    depends_on: [],
    verified_by: [URL_TEST],
    e2e_groups: ["collection-filter"],
    known_gaps: [
      { gap: "category is serialize-only", accepted: "category never comes from the URL" },
    ],
    ...overrides,
  };
}

function workspace(overrides: Partial<Workspace> = {}): Workspace {
  const files = new Set(["src/core/collection/url.ts", URL_TEST]);
  return {
    fileExists: (path) => files.has(path),
    e2eGroupExists: (name) => name === "collection-filter",
    propertyTests: [URL_TEST],
    ...overrides,
  };
}

test("a complete registry passes", () => {
  assert.deepEqual(checkFeatures([feature()], workspace()), []);
});

test("a shipped feature must name a test", () => {
  const errors = checkFeatures([feature({ verified_by: [] })], workspace({ propertyTests: [] }));
  assert.match(errors.join("\n"), /shipped features need at least one verified_by/);
});

test("listed paths must exist", () => {
  const errors = checkFeatures(
    [feature({ entry_points: ["src/core/collection/gone.ts"] })],
    workspace(),
  );
  assert.match(errors.join("\n"), /gone\.ts does not exist/);
});

test("e2e groups must exist under storefront-e2e/specs", () => {
  const errors = checkFeatures([feature({ e2e_groups: ["collection-sorting"] })], workspace());
  assert.match(errors.join("\n"), /no packages\/storefront-e2e\/specs\/collection-sorting/);
});

test("every property test must be claimed by a feature", () => {
  const stray = "src/core/cart/__tests__/cart.property.test.ts";
  const errors = checkFeatures([feature()], workspace({ propertyTests: [URL_TEST, stray] }));
  assert.deepEqual(errors, [`${stray}: property test is not claimed by any feature's verified_by`]);
});

test("depends_on must point at registered features and form a DAG", () => {
  const a = feature({ id: "collection.store", depends_on: ["collection.url-params"] });
  const b = feature({ id: "collection.url-params", depends_on: ["collection.store"] });
  const errors = checkFeatures([a, b], workspace());
  assert.match(
    errors.join("\n"),
    /depends_on cycle: collection\.store -> collection\.url-params -> collection\.store/,
  );

  const dangling = checkFeatures([feature({ depends_on: ["cart.lines"] })], workspace());
  assert.match(dangling.join("\n"), /depends_on cart\.lines is not a registered feature/);
});

test("ids are unique and dotted lowercase", () => {
  const errors = checkFeatures([feature(), feature()], workspace());
  assert.match(errors.join("\n"), /duplicate id/);

  const shouty = checkFeatures([feature({ id: "Collection URL" })], workspace());
  assert.match(shouty.join("\n"), /id must look like area\.feature-name/);
});

test("parseRegistry requires a decision on every known gap", () => {
  const base = { ...feature(), known_gaps: undefined };
  const undecided = parseRegistry([
    { ...base, known_gaps: [{ gap: "price filters merge on parse" }] },
  ]);
  assert.match(undecided.errors.join("\n"), /needs exactly one of accepted .* or issue/);

  const both = parseRegistry([
    { ...base, known_gaps: [{ gap: "x", accepted: "fine", issue: "#1" }] },
  ]);
  assert.match(both.errors.join("\n"), /needs exactly one of accepted .* or issue/);

  const badIssue = parseRegistry([{ ...base, known_gaps: [{ gap: "x", issue: "later" }] }]);
  assert.match(badIssue.errors.join("\n"), /issue must be a URL or #number/);

  const decided = parseRegistry([
    { ...base, known_gaps: [{ gap: "x", issue: "https://github.com/Shopify/hydrogen/issues/1" }] },
  ]);
  assert.deepEqual(decided.errors, []);
  assert.equal(decided.features[0]?.known_gaps.length, 1);
});

test("parseRegistry reports shape problems with the feature id", () => {
  const { errors } = parseRegistry([{ ...feature(), status: "done", verified_by: "one-string" }]);
  assert.deepEqual(errors, [
    "features[0] (collection.url-params): status must be one of planned, experimental, shipped, deprecated",
    "features[0] (collection.url-params): verified_by must be a list of strings",
  ]);
});

function proof(overrides: Partial<ProofResult> = {}): ProofResult {
  return { passed: 5, failed: 0, skipped: 0, ...overrides };
}

test("passing proofs produce no errors", () => {
  const proofs = new Map<string, ProofResult>([[URL_TEST, proof()]]);
  const errors = checkFeatures([feature()], workspace({ proofs }));
  assert.deepEqual(errors, []);
});

test("a proof vitest did not collect is reported", () => {
  const proofs = new Map<string, ProofResult>();
  const errors = checkFeatures([feature()], workspace({ proofs }));
  assert.match(errors.join("\n"), /was not collected by vitest/);
});

test("a proof with failing tests is reported", () => {
  const proofs = new Map<string, ProofResult>([[URL_TEST, proof({ failed: 2 })]]);
  const errors = checkFeatures([feature()], workspace({ proofs }));
  assert.match(errors.join("\n"), /has 2 failing test\(s\)/);
});

test("a proof with no passing tests is reported", () => {
  const proofs = new Map<string, ProofResult>([[URL_TEST, proof({ passed: 0, skipped: 3 })]]);
  const errors = checkFeatures([feature()], workspace({ proofs }));
  assert.match(errors.join("\n"), /has no passing tests/);
});
