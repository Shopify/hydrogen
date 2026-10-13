import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";

import {
  applyCalverVersion,
  findCalverViolations,
  getNextHydrogenVersion,
  resolveCalverVersion,
} from "./calver.ts";

interface Fixture {
  version: string;
  /** Pending changesets in .changeset/, by file name and Hydrogen bump type. */
  changesets?: Record<string, string>;
  /** Changesets earlier prereleases released, which changesets keeps in .changeset/pre/. */
  preChangesets?: Record<string, string>;
  preMode?: "pre" | "exit";
}

test("maps changesets' semver bumps onto CalVer", () => {
  const cases = [
    // [before `changeset version`, what changesets computed, bump, expected]
    ["2026.10.0", "2026.10.1", "patch", "2026.10.1"],
    ["2026.10.1", "2026.11.0", "patch", "2026.10.2"],
    ["2026.10.3", "2027.0.0", "major", "2027.1.0"],
    ["2027.1.2", "2028.0.0", "major", "2027.4.0"],
    ["2026.10.0-preview.3", "2026.10.0", "patch", "2026.10.0"],
    ["2026.10.0-preview.3", "2026.10.0-preview.4", "patch", "2026.10.0-preview.4"],
  ] as const;

  for (const [baseline, changesetVersion, bump, expected] of cases) {
    assert.equal(resolveCalverVersion(baseline, changesetVersion, bump), expected);
  }
});

test("rejects versions that would leave CalVer", () => {
  // A major while on a prerelease would skip the prerelease's release.
  assert.throws(
    () => resolveCalverVersion("2026.10.0-preview.3", "2027.0.0", "major"),
    /prerelease/,
  );
  // A prerelease entered from a stable version counts toward a semver minor.
  assert.throws(
    () => resolveCalverVersion("2026.10.1", "2026.11.0-next.0", "patch"),
    /doesn't lead to its next CalVer version, 2026\.10\.2/,
  );

  withFixture(
    { version: "2026.10.0-preview.3", changesets: { "breaking.md": "major" } },
    (root) => {
      assert.deepEqual(findCalverViolations(root), [
        ".changeset/breaking.md: @shopify/hydrogen is major, which would skip the 2026.10.0-preview.3 release.",
      ]);
    },
  );
  withFixture({ version: "2026.10.0", changesets: { "breaking.md": "major" } }, (root) => {
    assert.deepEqual(findCalverViolations(root), []);
  });
});

test("flags a pre.json that no Changesets 3 command has migrated", () => {
  withFixture({ version: "2026.10.0-preview.4", preMode: "pre" }, (root) => {
    writeFile(
      join(root, ".changeset", "pre.json"),
      `${JSON.stringify({ mode: "pre", tag: "preview", changesets: ["released"] })}\n`,
    );
    assert.match(findCalverViolations(root).join("\n"), /still lists changesets/);
  });
});

test("flags changesets left in .changeset/pre/ after prerelease mode ends", () => {
  withFixture({ version: "2026.10.0", preChangesets: { "released.md": "minor" } }, (root) => {
    assert.match(findCalverViolations(root).join("\n"), /pre\/ still has 1 changesets/);
  });
  withFixture(
    { version: "2026.10.0-preview.3", preChangesets: { "released.md": "minor" }, preMode: "exit" },
    (root) => {
      assert.deepEqual(findCalverViolations(root), []);
    },
  );
});

test("names the next Hydrogen version for the release title", () => {
  withFixture(
    { version: "2026.10.0-preview.3", changesets: { "feature.md": "minor", "fix.md": "patch" } },
    (root) => {
      assert.equal(getNextHydrogenVersion(root), "2026.10.0");
    },
  );
  withFixture({ version: "2026.10.0", changesets: { "feature.md": "minor" } }, (root) => {
    assert.equal(getNextHydrogenVersion(root), "2026.10.1");
  });
  withFixture({ version: "2026.10.0" }, (root) => {
    assert.equal(getNextHydrogenVersion(root), undefined);
  });
});

test("counts .changeset/pre/ only once prerelease mode ends", () => {
  const released = { "released.md": "minor" };

  withFixture(
    { version: "2026.10.0-preview.3", preChangesets: released, preMode: "exit" },
    (root) => {
      assert.equal(getNextHydrogenVersion(root), "2026.10.0");
    },
  );
  withFixture(
    { version: "2026.10.0-preview.3", preChangesets: released, preMode: "pre" },
    (root) => {
      assert.equal(getNextHydrogenVersion(root), undefined);
    },
  );
});

test("rewrites the version changesets wrote", () => {
  withFixture({ version: "2026.11.0" }, (root) => {
    const changelogPath = join(root, "packages", "hydrogen", "CHANGELOG.md");
    writeFile(
      changelogPath,
      "# @shopify/hydrogen\n\n## 2026.11.0\n\n- New feature\n\n## 2026.10.1\n\n- Fix\n",
    );

    applyCalverVersion(root, "2026.11.0", "2026.10.2");

    const packageJson: unknown = JSON.parse(
      readFileSync(join(root, "packages", "hydrogen", "package.json"), "utf8"),
    );
    assert.deepEqual(packageJson, { name: "@shopify/hydrogen", version: "2026.10.2" });
    assert.equal(
      readFileSync(changelogPath, "utf8"),
      "# @shopify/hydrogen\n\n## 2026.10.2\n\n- New feature\n\n## 2026.10.1\n\n- Fix\n",
    );
  });
});

function withFixture(fixture: Fixture, run: (repoRoot: string) => void): void {
  const repoRoot = mkdtempSync(join(tmpdir(), "calver-"));

  try {
    writeFile(
      join(repoRoot, "packages", "hydrogen", "package.json"),
      `${JSON.stringify({ name: "@shopify/hydrogen", version: fixture.version }, null, 2)}\n`,
    );
    writeFile(join(repoRoot, ".changeset", "config.json"), "{}\n");
    writeFile(join(repoRoot, ".changeset", "README.md"), "# Changesets\n");
    if (fixture.preMode) {
      writeFile(
        join(repoRoot, ".changeset", "pre.json"),
        `${JSON.stringify({ mode: fixture.preMode, tag: "preview" })}\n`,
      );
    }
    writeChangesets(join(repoRoot, ".changeset"), fixture.changesets ?? {});
    writeChangesets(join(repoRoot, ".changeset", "pre"), fixture.preChangesets ?? {});
    run(repoRoot);
  } finally {
    rmSync(repoRoot, { recursive: true, force: true });
  }
}

function writeChangesets(directory: string, changesets: Record<string, string>): void {
  for (const [file, type] of Object.entries(changesets)) {
    writeFile(join(directory, file), `---\n"@shopify/hydrogen": ${type}\n---\n\nSummary.\n`);
  }
}

function writeFile(path: string, contents: string): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, contents);
}
