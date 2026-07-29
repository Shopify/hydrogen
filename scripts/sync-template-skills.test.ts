import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";

import { syncTemplateSkills } from "./sync-template-skills.ts";

test("copies package skills into every template target", () => {
  withFixture(({ sourceRoot, targetRoot }) => {
    writeFile(join(sourceRoot, "hydrogen-setup", "SKILL.md"), "current setup skill");
    writeFile(join(sourceRoot, "hydrogen-setup", "references", "react.md"), "react reference");
    writeFile(join(targetRoot, "stale-skill", "SKILL.md"), "remove me");

    syncTemplateSkills({
      sourceRoot,
      targets: [targetRoot],
      log: () => {},
    });

    assert.equal(
      readFileSync(join(targetRoot, "hydrogen-setup", "SKILL.md"), "utf8"),
      "current setup skill",
    );
    assert.equal(
      readFileSync(join(targetRoot, "hydrogen-setup", "references", "react.md"), "utf8"),
      "react reference",
    );
    assert.equal(existsSync(join(targetRoot, "stale-skill")), false);
  });
});

test("check mode passes when template skills match the package skills", () => {
  withFixture(({ sourceRoot, targetRoot }) => {
    writeFile(join(sourceRoot, "hydrogen-setup", "SKILL.md"), "current setup skill");

    syncTemplateSkills({
      sourceRoot,
      targets: [targetRoot],
      log: () => {},
    });

    assert.doesNotThrow(() =>
      syncTemplateSkills({
        check: true,
        sourceRoot,
        targets: [targetRoot],
        log: () => {},
      }),
    );
  });
});

test("check mode fails without mutating stale template skills", () => {
  withFixture(({ sourceRoot, targetRoot }) => {
    writeFile(join(sourceRoot, "hydrogen-setup", "SKILL.md"), "current setup skill");
    writeFile(join(targetRoot, "hydrogen-setup", "SKILL.md"), "stale setup skill");

    assert.throws(
      () =>
        syncTemplateSkills({
          check: true,
          sourceRoot,
          targets: [targetRoot],
          log: () => {},
        }),
      /Template skills are stale/,
    );
    assert.equal(
      readFileSync(join(targetRoot, "hydrogen-setup", "SKILL.md"), "utf8"),
      "stale setup skill",
    );
  });
});

function withFixture(run: (fixture: { sourceRoot: string; targetRoot: string }) => void): void {
  const fixtureRoot = mkdtempSync(join(tmpdir(), "template-skills-"));
  const sourceRoot = join(fixtureRoot, "packages", "hydrogen", "skills");
  const targetRoot = join(fixtureRoot, "templates", "react-router", ".agents", "skills");

  try {
    mkdirSync(sourceRoot, { recursive: true });
    run({ sourceRoot, targetRoot });
  } finally {
    rmSync(fixtureRoot, { recursive: true, force: true });
  }
}

function writeFile(path: string, contents: string): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, contents);
}
