import assert from "node:assert/strict";
import { test } from "node:test";

import {
  applyMutant,
  checkFeatures,
  checkProofs,
  judgeMutant,
  parseRegistry,
  type Feature,
  type Mutant,
  type Proof,
  type TestOutcome,
  type Workspace,
} from "./check-features.ts";

const URL_TEST = "src/core/collection/__tests__/url.property.test.ts";
const ROUND_TRIP =
  "parseCollectionParams(serializeCollectionParams(p)) equals p up to filter order";
const OWNER = "@Shopify/developer-platforms";

function proof(overrides: Partial<Proof> = {}): Proof {
  return { file: URL_TEST, tests: [ROUND_TRIP], ...overrides };
}

function feature(overrides: Partial<Feature> = {}): Feature {
  return {
    id: "collection.url-params",
    promise: "Collection filter and sort state survives a trip through the URL.",
    status: "shipped",
    owner: "hydrogen",
    entry_points: ["src/core/collection/url.ts"],
    depends_on: [],
    verified_by: [proof()],
    falsified_by: [],
    e2e_groups: ["collection-filter"],
    known_gaps: [
      {
        gap: "category is serialize-only",
        accepted: "category never comes from the URL",
        accepted_by: OWNER,
      },
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
    codeOwners: new Set([OWNER]),
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

  const gapFile = "src/core/collection/__tests__/gaps.test.ts";
  const gap = { gap: "x", issue: "#1", shown_by: proof({ file: gapFile }) };
  const gapErrors = checkFeatures([feature({ known_gaps: [gap] })], workspace());
  assert.match(gapErrors.join("\n"), /gaps\.test\.ts does not exist/);
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

test("an accepted gap must be accepted by a code owner", () => {
  const stranger = {
    gap: "x",
    accepted: "fine",
    accepted_by: "@nobody",
  };
  const errors = checkFeatures([feature({ known_gaps: [stranger] })], workspace());
  assert.deepEqual(errors, [
    'collection.url-params: gap "x" is accepted by @nobody, who is not in .github/CODEOWNERS',
  ]);
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

  const unowned = parseRegistry([{ ...base, known_gaps: [{ gap: "x", accepted: "fine" }] }]);
  assert.match(unowned.errors.join("\n"), /accepted needs accepted_by, a @handle/);

  const badHandle = parseRegistry([
    { ...base, known_gaps: [{ gap: "x", accepted: "fine", accepted_by: "me" }] },
  ]);
  assert.match(badHandle.errors.join("\n"), /accepted needs accepted_by, a @handle/);

  const badIssue = parseRegistry([{ ...base, known_gaps: [{ gap: "x", issue: "later" }] }]);
  assert.match(badIssue.errors.join("\n"), /issue must be a URL or #number/);

  const decided = parseRegistry([
    { ...base, known_gaps: [{ gap: "x", issue: "https://github.com/Shopify/hydrogen/issues/1" }] },
  ]);
  assert.deepEqual(decided.errors, []);
  assert.deepEqual(decided.features[0]?.known_gaps, [
    { gap: "x", issue: "https://github.com/Shopify/hydrogen/issues/1" },
  ]);
});

test("parseRegistry reads a gap's shown_by like a proof", () => {
  const base = { ...feature(), known_gaps: undefined };
  const shown = parseRegistry([
    {
      ...base,
      known_gaps: [{ gap: "x", issue: "#1", shown_by: { file: URL_TEST, tests: ["x holds"] } }],
    },
  ]);
  assert.deepEqual(shown.errors, []);
  assert.deepEqual(shown.features[0]?.known_gaps, [
    { gap: "x", issue: "#1", shown_by: { file: URL_TEST, tests: ["x holds"] } },
  ]);

  const untested = parseRegistry([
    { ...base, known_gaps: [{ gap: "x", issue: "#1", shown_by: { file: URL_TEST, tests: [] } }] },
  ]);
  assert.match(untested.errors.join("\n"), /shown_by: tests must list at least one/);
});

test("parseRegistry requires verified_by to name tests in a file", () => {
  const base = feature();
  const bare = parseRegistry([{ ...base, verified_by: [URL_TEST] }]);
  assert.match(bare.errors.join("\n"), /verified_by\[0\]: must be a mapping of file and tests/);

  const empty = parseRegistry([{ ...base, verified_by: [{ file: URL_TEST, tests: [] }] }]);
  assert.match(empty.errors.join("\n"), /tests must list at least one it title or describe path/);
});

test("parseRegistry keeps every path inside packages/hydrogen", () => {
  const base = feature();
  const escaped = parseRegistry([
    {
      ...base,
      entry_points: ["../../package.json", "/etc/passwd", "--reporter=html", "src//url.ts"],
    },
  ]);
  assert.deepEqual(escaped.errors, [
    "features[0] (collection.url-params): entry_points ../../package.json must be a relative path inside packages/hydrogen",
    "features[0] (collection.url-params): entry_points /etc/passwd must be a relative path inside packages/hydrogen",
    "features[0] (collection.url-params): entry_points --reporter=html must be a relative path inside packages/hydrogen",
    "features[0] (collection.url-params): entry_points src//url.ts must be a relative path inside packages/hydrogen",
  ]);

  const proofEscaped = parseRegistry([
    { ...base, verified_by: [{ file: "src/../../x.test.ts", tests: ["x"] }] },
  ]);
  assert.match(proofEscaped.errors.join("\n"), /verified_by\[0\]: file must be a relative path/);

  const mutantEscaped = parseRegistry([
    { ...base, falsified_by: [{ ...mutant, file: "../../package.json" }] },
  ]);
  assert.match(mutantEscaped.errors.join("\n"), /falsified_by\[0\]: file must be a relative path/);
});

test("parseRegistry reports shape problems with the feature id", () => {
  const { errors } = parseRegistry([{ ...feature(), status: "done", verified_by: "one-string" }]);
  assert.deepEqual(errors, [
    "features[0] (collection.url-params): status must be one of planned, experimental, shipped, deprecated",
    "features[0] (collection.url-params): verified_by must be a list",
  ]);
});

function outcome(overrides: Partial<TestOutcome> = {}): TestOutcome {
  const title = overrides.title ?? ROUND_TRIP;
  return {
    title,
    fullName: `collection URL round-trip properties ${title}`,
    status: "passed",
    ...overrides,
  };
}

test("passing proofs produce no errors", () => {
  const report = new Map([[URL_TEST, [outcome()]]]);
  assert.deepEqual(checkProofs([feature()], report), []);
});

test("a proof vitest did not collect is reported", () => {
  const errors = checkProofs([feature()], new Map());
  assert.match(errors.join("\n"), /was not collected by vitest/);
});

test("a proof must name a test that exists in the file", () => {
  const report = new Map([[URL_TEST, [outcome({ title: "something else" })]]]);
  const errors = checkProofs([feature()], report);
  assert.deepEqual(errors, [
    `collection.url-params: ${URL_TEST} has no test named "${ROUND_TRIP}"`,
  ]);
});

test("a proof with failing tests is reported", () => {
  const report = new Map([
    [URL_TEST, [outcome({ status: "failed" }), outcome({ status: "failed" })]],
  ]);
  const errors = checkProofs([feature()], report);
  assert.match(errors.join("\n"), /has 2 failing test\(s\)/);
});

test("a proof with no passing tests is reported", () => {
  const report = new Map([[URL_TEST, [outcome({ status: "skipped" })]]]);
  const errors = checkProofs([feature()], report);
  assert.match(errors.join("\n"), /has no passing tests/);
});

test("a green test elsewhere in the file does not stand in for the named one", () => {
  const report = new Map([
    [URL_TEST, [outcome({ status: "failed" }), outcome({ title: "other" })]],
  ]);
  const errors = checkProofs([feature()], report);
  assert.match(errors.join("\n"), /"parseCollectionParams\(.*" in .* has 1 failing test/);
});

test("a describe path names every test under it", () => {
  const anchor = proof({
    file: "src/core/collection/__tests__/url.test.ts",
    tests: ["parseCollectionParams"],
  });
  const report = new Map([
    [
      anchor.file,
      [
        {
          title: "parses tag filter",
          fullName: "parseCollectionParams filters parses tag filter",
          status: "passed",
        },
        {
          title: "parses price-ascending",
          fullName: "parseCollectionParams sort key parses price-ascending",
          status: "failed",
        },
        { title: "x", fullName: "parseCollectionParamsExtra x", status: "failed" },
      ],
    ],
  ]);
  const errors = checkProofs([feature({ verified_by: [anchor] })], report);
  assert.deepEqual(errors, [
    `collection.url-params: "parseCollectionParams" in ${anchor.file} has 1 failing test(s)`,
  ]);
});

test("a gap's shown_by test must still pass", () => {
  const gapTitle = "a category filter does not round-trip";
  const gap = {
    gap: "category is serialize-only",
    issue: "#1",
    shown_by: proof({ tests: [gapTitle] }),
  };
  const open = new Map([[URL_TEST, [outcome(), outcome({ title: gapTitle })]]]);
  assert.deepEqual(checkProofs([feature({ known_gaps: [gap] })], open), []);

  const closed = new Map([[URL_TEST, [outcome(), outcome({ title: gapTitle, status: "failed" })]]]);
  assert.deepEqual(checkProofs([feature({ known_gaps: [gap] })], closed), [
    `collection.url-params: gap "category is serialize-only": "${gapTitle}" in ${URL_TEST} has 1 failing test(s)`,
  ]);
});

const mutant: Mutant = {
  mutant: "tags are read from the wrong param",
  file: "src/core/collection/url.ts",
  find: 'getAll("filter.p.tag")',
  replace: 'getAll("filter.p.tags")',
};

test("a mutant must target an entry point", () => {
  const stray = { ...mutant, file: "src/core/collection/state.ts" };
  const errors = checkFeatures([feature({ falsified_by: [stray] })], workspace());
  assert.deepEqual(errors, [
    'collection.url-params: mutant "tags are read from the wrong param" targets src/core/collection/state.ts, which is not an entry point',
  ]);
});

test("parseRegistry requires a complete mutant and rejects a no-op one", () => {
  const base = feature();
  const incomplete = parseRegistry([{ ...base, falsified_by: [{ mutant: "x", find: "a" }] }]);
  assert.match(incomplete.errors.join("\n"), /needs mutant, file, find, and replace strings/);

  const noop = parseRegistry([{ ...base, falsified_by: [{ ...mutant, replace: mutant.find }] }]);
  assert.match(noop.errors.join("\n"), /find and replace are identical/);

  const absent = parseRegistry([{ ...base, falsified_by: undefined }]);
  assert.deepEqual(absent.errors, []);
  assert.deepEqual(absent.features[0]?.falsified_by, []);
});

test("applyMutant replaces a fragment that occurs exactly once", () => {
  const source =
    'const tags = params.getAll("filter.p.tag");\nconst vendors = params.getAll("filter.p.vendor");\n';
  assert.equal(
    applyMutant(source, mutant),
    'const tags = params.getAll("filter.p.tags");\nconst vendors = params.getAll("filter.p.vendor");\n',
  );
  assert.equal(applyMutant("nothing here", mutant), undefined);
  assert.equal(applyMutant(source + source, mutant), undefined);
});

test("judgeMutant kills on a failing named test, survives on all green, and reports a broken run", () => {
  const second = proof({
    file: "src/core/collection/__tests__/sort.property.test.ts",
    tests: ["sort holds"],
  });
  const both = [proof(), second];
  const green = new Map([
    [URL_TEST, [outcome()]],
    [second.file, [outcome({ title: "sort holds" })]],
  ]);
  assert.equal(judgeMutant(green, both), "survived");

  const oneRed = new Map(green).set(second.file, [
    outcome({ title: "sort holds", status: "failed" }),
  ]);
  assert.equal(judgeMutant(oneRed, both), "killed");

  const unnamedRed = new Map(green).set(URL_TEST, [
    outcome(),
    outcome({ title: "other", status: "failed" }),
  ]);
  assert.equal(judgeMutant(unnamedRed, both), "survived");

  const notCollected = new Map([[URL_TEST, [outcome({ status: "failed" })]]]);
  assert.deepEqual(judgeMutant(notCollected, both), { broke: `"sort holds" in ${second.file}` });

  const noTests = new Map(green).set(second.file, [
    outcome({ title: "sort holds", status: "skipped" }),
  ]);
  assert.deepEqual(judgeMutant(noTests, both), { broke: `"sort holds" in ${second.file}` });
});
