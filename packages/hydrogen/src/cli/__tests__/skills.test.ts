import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it, vi } from "vitest";

import { assert } from "../../core/test-utils";
import { syncSkills } from "../skills";

const REAL_SKILLS_ROOT = join(import.meta.dirname, "../../../skills");

function createTempDirectory(): string {
  return mkdtempSync(join(tmpdir(), "hydrogen-skills-"));
}

function writeSkill(
  skillsRoot: string,
  skillName: string,
  body = "Body.\n",
  extra?: Record<string, string>,
): void {
  const skillPath = join(skillsRoot, skillName);
  mkdirSync(skillPath, { recursive: true });
  writeFileSync(
    join(skillPath, "SKILL.md"),
    `---\nname: ${skillName}\ndescription: >\n  Test skill.\n---\n${body}`,
  );
  for (const [relativePath, content] of Object.entries(extra ?? {})) {
    const filePath = join(skillPath, relativePath);
    mkdirSync(join(filePath, ".."), { recursive: true });
    writeFileSync(filePath, content);
  }
}

function createPackageRoot(version: string, skills: Record<string, string> = {}): string {
  const packageRoot = createTempDirectory();
  mkdirSync(join(packageRoot, "skills"));
  writeFileSync(
    join(packageRoot, "package.json"),
    JSON.stringify({ name: "@shopify/hydrogen", version }),
  );
  for (const [skillName, body] of Object.entries(skills)) {
    writeSkill(join(packageRoot, "skills"), skillName, body);
  }
  return packageRoot;
}

function createAppRoot(): string {
  const appRoot = createTempDirectory();
  mkdirSync(join(appRoot, ".agents"));
  return appRoot;
}

function readSkill(appRoot: string, skillName: string): string {
  return readFileSync(join(appRoot, ".agents/skills", skillName, "SKILL.md"), "utf8");
}

function readMetadata(content: string): { version: string; hash: string } {
  const version = /^ {2}version: "([^"]+)"$/m.exec(content)?.[1];
  const hash = /^ {2}hash: "([^"]+)"$/m.exec(content)?.[1];
  assert(version, `No Hydrogen version in:\n${content}`);
  assert(hash, `No Hydrogen hash in:\n${content}`);
  return { version, hash };
}

function sync(appRoot: string, packageRoot: string, args: string[] = []) {
  return syncSkills({ cwd: appRoot, packageRoot, args, log: vi.fn() });
}

describe("syncSkills", () => {
  it("copies skills and records source, version, and hash in frontmatter metadata", () => {
    const appRoot = createAppRoot();
    const packageRoot = createPackageRoot("2026.1.0", { "hydrogen-cart-ui": "Cart.\n" });

    const result = sync(appRoot, packageRoot);

    const content = readSkill(appRoot, "hydrogen-cart-ui");
    expect(result).toMatchObject({ added: 1, updated: 0, removed: 0, skipped: [] });
    expect(content).toMatch(
      /^---\nname: hydrogen-cart-ui\ndescription: >\n {2}Test skill\.\nmetadata:\n {2}source: "@shopify\/hydrogen"\n {2}version: "2026\.1\.0"\n {2}hash: "sha256:[0-9a-f]{64}"\n---\nCart\.\n$/,
    );
  });

  it("leaves skills untouched when rerun against the same package version", () => {
    const appRoot = createAppRoot();
    const packageRoot = createPackageRoot("2026.1.0", { "hydrogen-cart-ui": "Cart.\n" });
    sync(appRoot, packageRoot);
    const skillFile = join(appRoot, ".agents/skills/hydrogen-cart-ui/SKILL.md");
    const before = statSync(skillFile).mtimeMs;

    const result = sync(appRoot, packageRoot);

    expect(result).toMatchObject({ added: 0, updated: 0, unchanged: 1, removed: 0, skipped: [] });
    expect(statSync(skillFile).mtimeMs).toBe(before);
  });

  it("overwrites unmodified skills with the newer package version", () => {
    const appRoot = createAppRoot();
    sync(appRoot, createPackageRoot("2026.1.0", { "hydrogen-cart-ui": "Old.\n" }));

    const result = sync(appRoot, createPackageRoot("2026.2.0", { "hydrogen-cart-ui": "New.\n" }));

    const content = readSkill(appRoot, "hydrogen-cart-ui");
    expect(result).toMatchObject({ added: 0, updated: 1, removed: 0 });
    expect(content).toContain("New.");
    expect(readMetadata(content).version).toBe("2026.2.0");
  });

  it("skips locally modified skills and overwrites them with --force", () => {
    const appRoot = createAppRoot();
    sync(appRoot, createPackageRoot("2026.1.0", { "hydrogen-cart-ui": "Old.\n" }));
    const skillFile = join(appRoot, ".agents/skills/hydrogen-cart-ui/SKILL.md");
    writeFileSync(skillFile, readFileSync(skillFile, "utf8") + "My local note.\n");
    const newPackageRoot = createPackageRoot("2026.2.0", { "hydrogen-cart-ui": "New.\n" });

    const skipped = sync(appRoot, newPackageRoot);
    expect(skipped).toMatchObject({
      updated: 0,
      skipped: [join(appRoot, ".agents/skills/hydrogen-cart-ui")],
    });
    expect(readSkill(appRoot, "hydrogen-cart-ui")).toContain("My local note.");

    const forced = sync(appRoot, newPackageRoot, ["--force"]);
    expect(forced).toMatchObject({ updated: 1, skipped: [] });
    expect(readSkill(appRoot, "hydrogen-cart-ui")).toContain("New.");
    expect(readSkill(appRoot, "hydrogen-cart-ui")).not.toContain("My local note.");
  });

  it("detects modifications to files other than SKILL.md", () => {
    const appRoot = createAppRoot();
    const packageRoot = createPackageRoot("2026.1.0");
    writeSkill(join(packageRoot, "skills"), "hydrogen-cart-ui", "Cart.\n", {
      "references/react.md": "React notes.\n",
    });
    sync(appRoot, packageRoot);
    writeFileSync(
      join(appRoot, ".agents/skills/hydrogen-cart-ui/references/react.md"),
      "Edited.\n",
    );

    const result = sync(appRoot, packageRoot);

    expect(result.skipped).toHaveLength(1);
  });

  it("treats CRLF line endings as unmodified", () => {
    const appRoot = createAppRoot();
    const packageRoot = createPackageRoot("2026.1.0", { "hydrogen-cart-ui": "Cart.\n" });
    sync(appRoot, packageRoot);
    const skillFile = join(appRoot, ".agents/skills/hydrogen-cart-ui/SKILL.md");
    writeFileSync(skillFile, readFileSync(skillFile, "utf8").replaceAll("\n", "\r\n"));

    const result = sync(appRoot, packageRoot);

    expect(result).toMatchObject({ unchanged: 1, skipped: [] });
  });

  it("removes managed skills the package no longer ships and leaves unmanaged skills alone", () => {
    const appRoot = createAppRoot();
    sync(appRoot, createPackageRoot("2026.1.0", { "hydrogen-legacy": "Legacy.\n" }));
    writeSkill(join(appRoot, ".agents/skills"), "my-own-skill");

    const result = sync(appRoot, createPackageRoot("2026.2.0", { "hydrogen-cart-ui": "Cart.\n" }));

    expect(result).toMatchObject({ added: 1, updated: 0, removed: 1, skipped: [] });
    expect(readdirSync(join(appRoot, ".agents/skills")).toSorted()).toEqual([
      "hydrogen-cart-ui",
      "my-own-skill",
    ]);
  });

  it("keeps a modified stale skill unless forced", () => {
    const appRoot = createAppRoot();
    sync(appRoot, createPackageRoot("2026.1.0", { "hydrogen-legacy": "Legacy.\n" }));
    const skillFile = join(appRoot, ".agents/skills/hydrogen-legacy/SKILL.md");
    writeFileSync(skillFile, readFileSync(skillFile, "utf8") + "Kept.\n");
    const newPackageRoot = createPackageRoot("2026.2.0");

    expect(sync(appRoot, newPackageRoot)).toMatchObject({
      removed: 0,
      skipped: [join(appRoot, ".agents/skills/hydrogen-legacy")],
    });
    expect(existsSync(skillFile)).toBe(true);

    expect(sync(appRoot, newPackageRoot, ["--force"])).toMatchObject({ removed: 1, skipped: [] });
    expect(existsSync(skillFile)).toBe(false);
  });

  it("fails before writing when an unmanaged skill collides with a shipped name", () => {
    const appRoot = createAppRoot();
    writeSkill(join(appRoot, ".agents/skills"), "hydrogen-cart-ui", "Handwritten.\n");
    const packageRoot = createPackageRoot("2026.1.0", {
      "hydrogen-setup": "Setup.\n",
      "hydrogen-cart-ui": "Cart.\n",
    });

    expect(() => sync(appRoot, packageRoot)).toThrow(
      "Skill directories exist that Hydrogen did not create",
    );
    expect(existsSync(join(appRoot, ".agents/skills/hydrogen-setup"))).toBe(false);
    expect(readSkill(appRoot, "hydrogen-cart-ui")).toContain("Handwritten.");

    expect(sync(appRoot, packageRoot, ["--force"])).toMatchObject({ added: 1, updated: 1 });
    expect(readSkill(appRoot, "hydrogen-cart-ui")).toContain("Cart.");
  });

  it("repairs a partial skill directory without SKILL.md", () => {
    const appRoot = createAppRoot();
    mkdirSync(join(appRoot, ".agents/skills/hydrogen-cart-ui/references"), { recursive: true });
    writeFileSync(join(appRoot, ".agents/skills/hydrogen-cart-ui/references/react.md"), "partial");

    const result = sync(appRoot, createPackageRoot("2026.1.0", { "hydrogen-cart-ui": "Cart.\n" }));

    expect(result).toMatchObject({ updated: 1 });
    expect(existsSync(join(appRoot, ".agents/skills/hydrogen-cart-ui/references/react.md"))).toBe(
      false,
    );
    expect(readSkill(appRoot, "hydrogen-cart-ui")).toContain("Cart.");
  });

  it("rejects unknown arguments", () => {
    const appRoot = createAppRoot();
    const packageRoot = createPackageRoot("2026.1.0");

    expect(() => sync(appRoot, packageRoot, ["--yolo"])).toThrow();
  });

  it("syncs every skill shipped in this package", () => {
    const appRoot = createAppRoot();

    const result = syncSkills({
      cwd: appRoot,
      packageRoot: join(REAL_SKILLS_ROOT, ".."),
      log: vi.fn(),
    });

    const shipped = readdirSync(REAL_SKILLS_ROOT).toSorted();
    expect(result.added).toBe(shipped.length);
    expect(readdirSync(join(appRoot, ".agents/skills")).toSorted()).toEqual(shipped);
    for (const skillName of shipped) {
      readMetadata(readSkill(appRoot, skillName));
    }
  });
});
