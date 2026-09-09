import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it, vi } from "vitest";

import { assert } from "../../core/test-utils";
import { isObjectRecord } from "../../core/utils/record";
import {
  checkSkills,
  describeSkillsSyncStatus,
  parseSkillsCheckArgs,
  getSkillsSyncStatus,
  parseSkillsSyncArgs,
  syncSkills,
  type SkillsSyncStatus,
  type SyncSkillsResult,
  type SyncSkillsRootResult,
} from "../skills";

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

function writePackage(packageRoot: string, version: string, skills: Record<string, string>): void {
  mkdirSync(join(packageRoot, "skills"), { recursive: true });
  writeFileSync(
    join(packageRoot, "package.json"),
    JSON.stringify({ name: "@shopify/hydrogen", version }),
  );
  for (const [skillName, body] of Object.entries(skills)) {
    writeSkill(join(packageRoot, "skills"), skillName, body);
  }
}

function createPackageRoot(version: string, skills: Record<string, string> = {}): string {
  const packageRoot = createTempDirectory();
  writePackage(packageRoot, version, skills);
  return packageRoot;
}

function installPackage(root: string, version: string, skills: Record<string, string>): string {
  const packageRoot = join(root, "node_modules/@shopify/hydrogen");
  writePackage(packageRoot, version, skills);
  return packageRoot;
}

function readRealPackageVersion(): string {
  const parsed: unknown = JSON.parse(
    readFileSync(join(REAL_SKILLS_ROOT, "../package.json"), "utf8"),
  );
  const version =
    isObjectRecord(parsed) && typeof parsed.version === "string" ? parsed.version : undefined;
  assert(version, "No package version");
  return version;
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

function statusFixture(overrides: Partial<SkillsSyncStatus> = {}): SkillsSyncStatus {
  return {
    version: "2026.2.0",
    pending: { add: 0, update: 0, remove: 0, modified: 0 },
    conflicts: [],
    ...overrides,
  };
}

/** Tests that expect a prompt pass their own confirm; everything else must never ask. */
const rejectPrompt = (question: string): Promise<boolean> =>
  Promise.reject(new Error(`Unexpected prompt: ${question}`));

function sync(appRoot: string, packageRoot: string, force = false) {
  return syncSkills({ cwd: appRoot, packageRoot, force, log: vi.fn(), confirm: rejectPrompt });
}

function rootResult(result: SyncSkillsResult, harness: string): SyncSkillsRootResult {
  const root = result.roots.find((candidate) => candidate.root.endsWith(join(harness, "skills")));
  assert(root, `No result for ${harness}`);
  return root;
}

const agents = (result: SyncSkillsResult) => rootResult(result, ".agents");
const claude = (result: SyncSkillsResult) => rootResult(result, ".claude");

describe("syncSkills", () => {
  it("copies skills and records source, version, and hash in frontmatter metadata", async () => {
    const appRoot = createAppRoot();
    const packageRoot = createPackageRoot("2026.1.0", { "hydrogen-cart-ui": "Cart.\n" });

    const result = await sync(appRoot, packageRoot);

    const content = readSkill(appRoot, "hydrogen-cart-ui");
    expect(result.version).toBe("2026.1.0");
    expect(result.roots.map((root) => root.root)).toEqual([
      join(appRoot, ".claude/skills"),
      join(appRoot, ".agents/skills"),
    ]);
    expect(agents(result)).toMatchObject({ added: 1, updated: 0, removed: 0, skipped: [] });
    expect(claude(result)).toMatchObject({ added: 1, updated: 0, removed: 0, skipped: [] });
    expect(readFileSync(join(appRoot, ".claude/skills/hydrogen-cart-ui/SKILL.md"), "utf8")).toBe(
      content,
    );
    expect(content).toMatch(
      /^---\nname: hydrogen-cart-ui\ndescription: >\n {2}Test skill\.\nmetadata:\n {2}source: "@shopify\/hydrogen"\n {2}version: "2026\.1\.0"\n {2}hash: "sha256:[0-9a-f]{64}"\n---\nCart\.\n$/,
    );
  });

  it("leaves skills untouched when rerun against the same package version", async () => {
    const appRoot = createAppRoot();
    const packageRoot = createPackageRoot("2026.1.0", { "hydrogen-cart-ui": "Cart.\n" });
    await sync(appRoot, packageRoot);
    const skillFile = join(appRoot, ".agents/skills/hydrogen-cart-ui/SKILL.md");
    const before = statSync(skillFile).mtimeMs;

    const result = await sync(appRoot, packageRoot);

    expect(agents(result)).toMatchObject({
      added: 0,
      updated: 0,
      unchanged: 1,
      removed: 0,
      skipped: [],
    });
    expect(statSync(skillFile).mtimeMs).toBe(before);
  });

  it("overwrites unmodified skills with the newer package version", async () => {
    const appRoot = createAppRoot();
    await sync(appRoot, createPackageRoot("2026.1.0", { "hydrogen-cart-ui": "Old.\n" }));

    const result = await sync(
      appRoot,
      createPackageRoot("2026.2.0", { "hydrogen-cart-ui": "New.\n" }),
    );

    const content = readSkill(appRoot, "hydrogen-cart-ui");
    expect(agents(result)).toMatchObject({ added: 0, updated: 1, removed: 0 });
    expect(content).toContain("New.");
    expect(readMetadata(content).version).toBe("2026.2.0");
  });

  it("skips locally modified skills and overwrites them with --force", async () => {
    const appRoot = createAppRoot();
    await sync(appRoot, createPackageRoot("2026.1.0", { "hydrogen-cart-ui": "Old.\n" }));
    const skillFile = join(appRoot, ".agents/skills/hydrogen-cart-ui/SKILL.md");
    writeFileSync(skillFile, readFileSync(skillFile, "utf8") + "My local note.\n");
    const newPackageRoot = createPackageRoot("2026.2.0", { "hydrogen-cart-ui": "New.\n" });

    const skipped = await sync(appRoot, newPackageRoot);
    expect(agents(skipped)).toMatchObject({
      updated: 0,
      skipped: [join(appRoot, ".agents/skills/hydrogen-cart-ui")],
    });
    expect(readSkill(appRoot, "hydrogen-cart-ui")).toContain("My local note.");

    const forced = await sync(appRoot, newPackageRoot, true);
    expect(agents(forced)).toMatchObject({ updated: 1, skipped: [] });
    expect(readSkill(appRoot, "hydrogen-cart-ui")).toContain("New.");
    expect(readSkill(appRoot, "hydrogen-cart-ui")).not.toContain("My local note.");
  });

  it("leaves a locally modified skill alone without nagging when nothing new ships", async () => {
    const appRoot = createAppRoot();
    const packageRoot = createPackageRoot("2026.1.0", { "hydrogen-cart-ui": "Cart.\n" });
    await sync(appRoot, packageRoot);
    const skillFile = join(appRoot, ".agents/skills/hydrogen-cart-ui/SKILL.md");
    writeFileSync(skillFile, readFileSync(skillFile, "utf8") + "My local note.\n");
    const log = vi.fn();

    const result = await syncSkills({ cwd: appRoot, packageRoot, log });

    expect(agents(result)).toMatchObject({ updated: 0, unchanged: 1, skipped: [] });
    expect(readSkill(appRoot, "hydrogen-cart-ui")).toContain("My local note.");
    expect(log.mock.calls.flat().join("\n")).not.toContain("Skipped");
  });

  it("overwrites a locally modified skill with --force even when the version is unchanged", async () => {
    const appRoot = createAppRoot();
    const packageRoot = createPackageRoot("2026.1.0", { "hydrogen-cart-ui": "Cart.\n" });
    await sync(appRoot, packageRoot);
    const skillFile = join(appRoot, ".agents/skills/hydrogen-cart-ui/SKILL.md");
    writeFileSync(skillFile, readFileSync(skillFile, "utf8") + "My local note.\n");

    const result = await sync(appRoot, packageRoot, true);

    expect(agents(result)).toMatchObject({ updated: 1, unchanged: 0, skipped: [] });
    expect(readSkill(appRoot, "hydrogen-cart-ui")).not.toContain("My local note.");
  });

  it("refreshes the recorded version when content is identical across versions", async () => {
    const appRoot = createAppRoot();
    await sync(appRoot, createPackageRoot("2026.1.0", { "hydrogen-cart-ui": "Cart.\n" }));

    const result = await sync(
      appRoot,
      createPackageRoot("2026.2.0", { "hydrogen-cart-ui": "Cart.\n" }),
    );

    expect(agents(result)).toMatchObject({ updated: 1, unchanged: 0 });
    expect(readMetadata(readSkill(appRoot, "hydrogen-cart-ui")).version).toBe("2026.2.0");
  });

  it("ignores operating system junk files when checking for modifications", async () => {
    const appRoot = createAppRoot();
    const packageRoot = createPackageRoot("2026.1.0", { "hydrogen-cart-ui": "Cart.\n" });
    await sync(appRoot, packageRoot);
    writeFileSync(join(appRoot, ".agents/skills/hydrogen-cart-ui/.DS_Store"), "finder");

    const result = await sync(appRoot, packageRoot);

    expect(agents(result)).toMatchObject({ unchanged: 1, skipped: [] });
  });

  it("rejects a shipped skill without frontmatter before writing anything", async () => {
    const appRoot = createAppRoot();
    const packageRoot = createPackageRoot("2026.1.0", { "hydrogen-setup": "Setup.\n" });
    mkdirSync(join(packageRoot, "skills/hydrogen-broken"));
    writeFileSync(join(packageRoot, "skills/hydrogen-broken/SKILL.md"), "No frontmatter.\n");

    await expect(sync(appRoot, packageRoot)).rejects.toThrow("has no frontmatter");
    expect(existsSync(join(appRoot, ".agents/skills/hydrogen-setup"))).toBe(false);
  });

  it("detects modifications to files other than SKILL.md", async () => {
    const appRoot = createAppRoot();
    const packageRoot = createPackageRoot("2026.1.0");
    writeSkill(join(packageRoot, "skills"), "hydrogen-cart-ui", "Cart.\n", {
      "references/react.md": "React notes.\n",
    });
    await sync(appRoot, packageRoot);
    writeFileSync(
      join(appRoot, ".agents/skills/hydrogen-cart-ui/references/react.md"),
      "Edited.\n",
    );
    const newPackageRoot = createPackageRoot("2026.2.0");
    writeSkill(join(newPackageRoot, "skills"), "hydrogen-cart-ui", "Cart.\n", {
      "references/react.md": "Newer React notes.\n",
    });

    const result = await sync(appRoot, newPackageRoot);

    expect(agents(result).skipped).toHaveLength(1);
    expect(claude(result).skipped).toHaveLength(0);
  });

  it("treats a skill that documents the metadata block in its body as unmodified", async () => {
    const appRoot = createAppRoot();
    const documentedBlock = [
      "```yaml",
      "metadata:",
      '  source: "@shopify/hydrogen"',
      '  version: "2026.1.0"',
      '  hash: "sha256:example"',
      "```",
      "",
    ].join("\n");
    const packageRoot = createPackageRoot("2026.1.0", { "hydrogen-skills": documentedBlock });
    await sync(appRoot, packageRoot);

    const result = await sync(appRoot, packageRoot);

    expect(agents(result)).toMatchObject({ unchanged: 1, skipped: [] });
    expect(readSkill(appRoot, "hydrogen-skills")).toContain('hash: "sha256:example"');
  });

  it("keeps a frontmatter-only skill without a trailing newline stable across resyncs", async () => {
    const appRoot = createAppRoot();
    const packageRoot = createPackageRoot("2026.1.0");
    mkdirSync(join(packageRoot, "skills/hydrogen-pointer"));
    writeFileSync(
      join(packageRoot, "skills/hydrogen-pointer/SKILL.md"),
      "---\nname: hydrogen-pointer\ndescription: Read node_modules/@shopify/hydrogen/skills.\n---",
    );
    await sync(appRoot, packageRoot);

    const result = await sync(appRoot, packageRoot);

    expect(agents(result)).toMatchObject({ unchanged: 1, skipped: [] });
    expect(readSkill(appRoot, "hydrogen-pointer")).toMatch(
      /\n {2}hash: "sha256:[0-9a-f]{64}"\n---$/,
    );
  });

  it("treats CRLF line endings as unmodified", async () => {
    const appRoot = createAppRoot();
    const packageRoot = createPackageRoot("2026.1.0", { "hydrogen-cart-ui": "Cart.\n" });
    await sync(appRoot, packageRoot);
    const skillFile = join(appRoot, ".agents/skills/hydrogen-cart-ui/SKILL.md");
    writeFileSync(skillFile, readFileSync(skillFile, "utf8").replaceAll("\n", "\r\n"));

    const result = await sync(appRoot, packageRoot);

    expect(agents(result)).toMatchObject({ unchanged: 1, skipped: [] });
  });

  it("removes managed skills the package no longer ships and leaves unmanaged skills alone", async () => {
    const appRoot = createAppRoot();
    await sync(appRoot, createPackageRoot("2026.1.0", { "hydrogen-legacy": "Legacy.\n" }));
    writeSkill(join(appRoot, ".agents/skills"), "my-own-skill");

    const result = await sync(
      appRoot,
      createPackageRoot("2026.2.0", { "hydrogen-cart-ui": "Cart.\n" }),
    );

    expect(agents(result)).toMatchObject({ added: 1, updated: 0, removed: 1, skipped: [] });
    expect(readdirSync(join(appRoot, ".agents/skills")).toSorted()).toEqual([
      "hydrogen-cart-ui",
      "my-own-skill",
    ]);
  });

  describe("locally modified skills the package no longer ships", () => {
    async function createEditedStaleSkill() {
      const appRoot = createAppRoot();
      await sync(appRoot, createPackageRoot("2026.1.0", { "hydrogen-legacy": "Legacy.\n" }));
      const skillFile = join(appRoot, ".agents/skills/hydrogen-legacy/SKILL.md");
      writeFileSync(skillFile, readFileSync(skillFile, "utf8") + "Kept.\n");
      return { appRoot, skillFile, newPackageRoot: createPackageRoot("2026.2.0") };
    }

    it("asks once per skill and removes it from every harness directory on yes", async () => {
      const { appRoot, skillFile, newPackageRoot } = await createEditedStaleSkill();
      const confirm = vi.fn(async (_question: string) => true);

      const result = await syncSkills({
        cwd: appRoot,
        packageRoot: newPackageRoot,
        confirm,
        log: vi.fn(),
      });

      expect(confirm.mock.calls).toEqual([
        [
          "Skill hydrogen-legacy was edited locally and Hydrogen 2026.2.0 no longer ships it. Remove it?",
        ],
      ]);
      expect(agents(result)).toMatchObject({ removed: 1, kept: [], skipped: [] });
      expect(claude(result)).toMatchObject({ removed: 1, kept: [] });
      expect(existsSync(skillFile)).toBe(false);
    });

    it("keeps the skill and warns prominently on no", async () => {
      const { appRoot, skillFile, newPackageRoot } = await createEditedStaleSkill();
      const log = vi.fn();

      const result = await syncSkills({
        cwd: appRoot,
        packageRoot: newPackageRoot,
        confirm: async () => false,
        log,
      });

      expect(agents(result)).toMatchObject({
        removed: 0,
        skipped: [],
        kept: [join(appRoot, ".agents/skills/hydrogen-legacy")],
      });
      expect(existsSync(skillFile)).toBe(true);
      const output = log.mock.calls.flat().join("\n");
      expect(output).toContain("WARNING: Hydrogen 2026.2.0 no longer ships these skills");
      expect(output).toContain(`  - ${join(appRoot, ".agents/skills/hydrogen-legacy")}`);
      expect(output).toContain("rerun with --force to remove them");
    });

    it("removes without asking when forced", async () => {
      const { appRoot, skillFile, newPackageRoot } = await createEditedStaleSkill();

      const result = await sync(appRoot, newPackageRoot, true);

      expect(agents(result)).toMatchObject({ removed: 1, kept: [], skipped: [] });
      expect(existsSync(skillFile)).toBe(false);
    });

    it("does not ask when the sync is going to fail on a conflict anyway", async () => {
      const { appRoot, newPackageRoot } = await createEditedStaleSkill();
      writeSkill(join(newPackageRoot, "skills"), "hydrogen-cart-ui", "Cart.\n");
      writeSkill(join(appRoot, ".agents/skills"), "hydrogen-cart-ui", "Handwritten.\n");

      await expect(sync(appRoot, newPackageRoot)).rejects.toThrow(
        "Skill directories exist that Hydrogen did not create",
      );
    });
  });

  it("fails before writing when an unmanaged skill collides with a shipped name", async () => {
    const appRoot = createAppRoot();
    writeSkill(join(appRoot, ".agents/skills"), "hydrogen-cart-ui", "Handwritten.\n");
    const packageRoot = createPackageRoot("2026.1.0", {
      "hydrogen-setup": "Setup.\n",
      "hydrogen-cart-ui": "Cart.\n",
    });

    await expect(sync(appRoot, packageRoot)).rejects.toThrow(
      "Skill directories exist that Hydrogen did not create",
    );
    expect(existsSync(join(appRoot, ".agents/skills/hydrogen-setup"))).toBe(false);
    expect(readSkill(appRoot, "hydrogen-cart-ui")).toContain("Handwritten.");

    expect(agents(await sync(appRoot, packageRoot, true))).toMatchObject({
      added: 1,
      updated: 1,
    });
    expect(readSkill(appRoot, "hydrogen-cart-ui")).toContain("Cart.");
  });

  it("removes a staging directory left behind by an interrupted run", async () => {
    const appRoot = createAppRoot();
    const packageRoot = createPackageRoot("2026.1.0", { "hydrogen-cart-ui": "Cart.\n" });
    await sync(appRoot, packageRoot);
    writeSkill(join(appRoot, ".agents/skills"), "hydrogen-cart-ui.hydrogen-sync", "Half copied.\n");

    const result = await sync(appRoot, packageRoot);

    expect(agents(result)).toMatchObject({ unchanged: 1, removed: 1 });
    expect(readdirSync(join(appRoot, ".agents/skills"))).toEqual(["hydrogen-cart-ui"]);
  });

  it("repairs a partial skill directory without SKILL.md", async () => {
    const appRoot = createAppRoot();
    mkdirSync(join(appRoot, ".agents/skills/hydrogen-cart-ui/references"), { recursive: true });
    writeFileSync(join(appRoot, ".agents/skills/hydrogen-cart-ui/references/react.md"), "partial");

    const result = await sync(
      appRoot,
      createPackageRoot("2026.1.0", { "hydrogen-cart-ui": "Cart.\n" }),
    );

    expect(agents(result)).toMatchObject({ updated: 1 });
    expect(existsSync(join(appRoot, ".agents/skills/hydrogen-cart-ui/references/react.md"))).toBe(
      false,
    );
    expect(readSkill(appRoot, "hydrogen-cart-ui")).toContain("Cart.");
  });

  it("fails clearly when a harness skills path exists but is not a directory", async () => {
    const appRoot = createAppRoot();
    writeFileSync(join(appRoot, ".agents/skills"), "not a directory");
    const packageRoot = createPackageRoot("2026.1.0", { "hydrogen-cart-ui": "Cart.\n" });

    await expect(sync(appRoot, packageRoot)).rejects.toThrow(
      `${join(".agents", "skills")} exists but is not a directory.`,
    );
    expect(existsSync(join(appRoot, ".claude/skills"))).toBe(false);
  });

  it("parses --force and rejects unknown flags", () => {
    expect(parseSkillsSyncArgs([])).toEqual({ force: false });
    expect(parseSkillsSyncArgs(["--force"])).toEqual({ force: true });
    expect(() => parseSkillsSyncArgs(["--yolo"])).toThrow("--yolo");
  });

  describe("package resolution", () => {
    it("uses the package installed in the app's own node_modules", async () => {
      const appRoot = createAppRoot();
      writeFileSync(join(appRoot, "package.json"), "{}");
      installPackage(appRoot, "3.0.0", { "hydrogen-local": "Local.\n" });

      const result = await syncSkills({ cwd: appRoot, log: vi.fn() });

      expect(agents(result).added).toBe(1);
      expect(readMetadata(readSkill(appRoot, "hydrogen-local")).version).toBe("3.0.0");
    });

    it("finds a hoisted install when the app lives inside a monorepo", async () => {
      const repoRoot = createTempDirectory();
      installPackage(repoRoot, "4.0.0", { "hydrogen-hoisted": "Hoisted.\n" });
      const appRoot = join(repoRoot, "apps/storefront");
      mkdirSync(join(appRoot, ".agents"), { recursive: true });
      writeFileSync(join(appRoot, "package.json"), "{}");

      const result = await syncSkills({ cwd: appRoot, log: vi.fn() });

      expect(agents(result).added).toBe(1);
      expect(readMetadata(readSkill(appRoot, "hydrogen-hoisted")).version).toBe("4.0.0");
      expect(existsSync(join(repoRoot, ".agents"))).toBe(false);
    });

    it("prefers the app's own install over a hoisted one", async () => {
      const repoRoot = createTempDirectory();
      installPackage(repoRoot, "4.0.0", { "hydrogen-hoisted": "Hoisted.\n" });
      const appRoot = join(repoRoot, "apps/storefront");
      mkdirSync(join(appRoot, ".agents"), { recursive: true });
      writeFileSync(join(appRoot, "package.json"), "{}");
      installPackage(appRoot, "5.0.0", { "hydrogen-nested": "Nested.\n" });

      const result = await syncSkills({ cwd: appRoot, log: vi.fn() });

      expect(agents(result).added).toBe(1);
      expect(readMetadata(readSkill(appRoot, "hydrogen-nested")).version).toBe("5.0.0");
    });

    it("follows a pnpm-style symlinked install to the store", async () => {
      const appRoot = createAppRoot();
      writeFileSync(join(appRoot, "package.json"), "{}");
      const storeRoot = join(
        appRoot,
        "node_modules/.pnpm/@shopify+hydrogen@6.0.0/node_modules/@shopify/hydrogen",
      );
      writePackage(storeRoot, "6.0.0", { "hydrogen-store": "Store.\n" });
      mkdirSync(join(appRoot, "node_modules/@shopify"), { recursive: true });
      symlinkSync(storeRoot, join(appRoot, "node_modules/@shopify/hydrogen"), "dir");

      const result = await syncSkills({ cwd: appRoot, log: vi.fn() });

      expect(agents(result).added).toBe(1);
      expect(readMetadata(readSkill(appRoot, "hydrogen-store")).version).toBe("6.0.0");
    });

    it("falls back to the running CLI's own package when nothing is installed", async () => {
      const appRoot = createAppRoot();
      writeFileSync(join(appRoot, "package.json"), "{}");

      const result = await syncSkills({ cwd: appRoot, log: vi.fn() });

      expect(agents(result).added).toBe(readdirSync(REAL_SKILLS_ROOT).length);
      expect(readMetadata(readSkill(appRoot, "hydrogen-setup")).version).toBe(
        readRealPackageVersion(),
      );
    });
  });

  it("syncs every skill shipped in this package", async () => {
    const appRoot = createAppRoot();

    const result = await syncSkills({
      cwd: appRoot,
      packageRoot: join(REAL_SKILLS_ROOT, ".."),
      log: vi.fn(),
    });

    const shipped = readdirSync(REAL_SKILLS_ROOT).toSorted();
    expect(agents(result).added).toBe(shipped.length);
    expect(readdirSync(join(appRoot, ".agents/skills")).toSorted()).toEqual(shipped);
    for (const skillName of shipped) {
      readMetadata(readSkill(appRoot, skillName));
    }
  });

  describe("getSkillsSyncStatus", () => {
    it("reports everything pending for a project that never synced", () => {
      const appRoot = createAppRoot();
      const packageRoot = createPackageRoot("2026.1.0", { "hydrogen-cart-ui": "Cart.\n" });

      const status = getSkillsSyncStatus({ cwd: appRoot, packageRoot });

      expect(status).toEqual({
        version: "2026.1.0",
        pending: { add: 1, update: 0, remove: 0, modified: 0 },
        conflicts: [],
      });
    });

    it("reports nothing pending right after a sync", async () => {
      const appRoot = createAppRoot();
      const packageRoot = createPackageRoot("2026.1.0", { "hydrogen-cart-ui": "Cart.\n" });
      await sync(appRoot, packageRoot);

      const status = getSkillsSyncStatus({ cwd: appRoot, packageRoot });

      expect(status.pending).toEqual({ add: 0, update: 0, remove: 0, modified: 0 });
    });

    it("counts updates, additions, removals, and local modifications after an upgrade", async () => {
      const appRoot = createAppRoot();
      await sync(
        appRoot,
        createPackageRoot("2026.1.0", {
          "hydrogen-cart-ui": "Cart.\n",
          "hydrogen-legacy": "Legacy.\n",
          "hydrogen-money": "Money.\n",
        }),
      );
      for (const harness of [".claude", ".agents"]) {
        const moneyFile = join(appRoot, harness, "skills/hydrogen-money/SKILL.md");
        writeFileSync(moneyFile, readFileSync(moneyFile, "utf8") + "Mine.\n");
      }
      const newPackageRoot = createPackageRoot("2026.2.0", {
        "hydrogen-cart-ui": "Cart v2.\n",
        "hydrogen-money": "Money v2.\n",
        "hydrogen-image": "Image.\n",
      });

      const status = getSkillsSyncStatus({ cwd: appRoot, packageRoot: newPackageRoot });

      expect(status).toEqual({
        version: "2026.2.0",
        pending: { add: 1, update: 1, remove: 1, modified: 1 },
        conflicts: [],
      });
      expect(readSkill(appRoot, "hydrogen-cart-ui")).toContain("Cart.\n");
    });

    it("counts an edited skill the package no longer ships as locally modified", async () => {
      const appRoot = createAppRoot();
      await sync(appRoot, createPackageRoot("2026.1.0", { "hydrogen-legacy": "Legacy.\n" }));
      const skillFile = join(appRoot, ".agents/skills/hydrogen-legacy/SKILL.md");
      writeFileSync(skillFile, readFileSync(skillFile, "utf8") + "Mine.\n");

      const status = getSkillsSyncStatus({
        cwd: appRoot,
        packageRoot: createPackageRoot("2026.2.0"),
      });

      // The .claude copy is untouched and would be removed; the edited .agents copy waits for consent.
      expect(status.pending).toEqual({ add: 0, update: 0, remove: 1, modified: 1 });
    });

    it("surfaces name collisions without throwing", () => {
      const appRoot = createAppRoot();
      writeSkill(join(appRoot, ".agents/skills"), "hydrogen-cart-ui", "Handwritten.\n");
      const packageRoot = createPackageRoot("2026.1.0", { "hydrogen-cart-ui": "Cart.\n" });

      const status = getSkillsSyncStatus({ cwd: appRoot, packageRoot });

      expect(status.conflicts).toEqual([join(appRoot, ".agents/skills/hydrogen-cart-ui")]);
    });
  });

  describe("describeSkillsSyncStatus", () => {
    it("returns nothing when everything is current", () => {
      expect(describeSkillsSyncStatus(statusFixture())).toBeUndefined();
    });

    it("lists pending updates, additions, and removals with the sync command", () => {
      expect(
        describeSkillsSyncStatus(
          statusFixture({ pending: { add: 2, update: 5, remove: 1, modified: 0 } }),
        ),
      ).toBe(
        "Hydrogen skills are out of date with @shopify/hydrogen 2026.2.0 (5 to update, 2 new, 1 removed upstream). Run `npx @shopify/hydrogen skills sync`.",
      );
    });

    it("points at --force when only locally modified skills are behind", () => {
      const message = describeSkillsSyncStatus(
        statusFixture({ pending: { add: 0, update: 0, remove: 0, modified: 2 } }),
      );

      expect(message).toContain("2 locally modified");
      expect(message).toContain("skills sync --force");
    });

    it("explains collisions", () => {
      const message = describeSkillsSyncStatus(
        statusFixture({ conflicts: ["/app/.agents/skills/x"] }),
      );

      expect(message).toContain("/app/.agents/skills/x");
      expect(message).toContain("--force");
    });
  });

  describe("checkSkills", () => {
    it("passes and reports the version when skills are current", async () => {
      const appRoot = createAppRoot();
      const packageRoot = createPackageRoot("2026.1.0", { "hydrogen-cart-ui": "Cart.\n" });
      await sync(appRoot, packageRoot);
      const log = vi.fn();

      checkSkills({ cwd: appRoot, packageRoot, log });

      expect(log).toHaveBeenCalledWith(
        "Hydrogen skills are up to date with @shopify/hydrogen 2026.1.0.",
      );
    });

    it("fails when the package moved on", async () => {
      const appRoot = createAppRoot();
      await sync(appRoot, createPackageRoot("2026.1.0", { "hydrogen-cart-ui": "Cart.\n" }));
      const newPackageRoot = createPackageRoot("2026.2.0", { "hydrogen-cart-ui": "Cart v2.\n" });

      expect(() =>
        checkSkills({ cwd: appRoot, packageRoot: newPackageRoot, log: vi.fn() }),
      ).toThrow("out of date with @shopify/hydrogen 2026.2.0 (1 to update)");
    });

    it("fails when skills were never synced", () => {
      const appRoot = createAppRoot();
      const packageRoot = createPackageRoot("2026.1.0", { "hydrogen-cart-ui": "Cart.\n" });

      expect(() => checkSkills({ cwd: appRoot, packageRoot, log: vi.fn() })).toThrow("1 new");
    });

    it("warns and returns instead of throwing in warn mode", () => {
      const appRoot = createAppRoot();
      const packageRoot = createPackageRoot("2026.1.0", { "hydrogen-cart-ui": "Cart.\n" });
      const log = vi.fn();
      const warn = vi.fn();

      checkSkills({ cwd: appRoot, packageRoot, mode: "warn", log, warn });

      expect(warn).toHaveBeenCalledTimes(1);
      expect(warn.mock.calls[0]?.[0]).toContain("1 new");
      expect(log).not.toHaveBeenCalled();
    });

    it("stays silent in warn mode when skills are current", async () => {
      const appRoot = createAppRoot();
      const packageRoot = createPackageRoot("2026.1.0", { "hydrogen-cart-ui": "Cart.\n" });
      await sync(appRoot, packageRoot);
      const log = vi.fn();
      const warn = vi.fn();

      checkSkills({ cwd: appRoot, packageRoot, mode: "warn", log, warn });

      expect(log).not.toHaveBeenCalled();
      expect(warn).not.toHaveBeenCalled();
    });

    it("parses --mode and rejects unknown values", () => {
      expect(parseSkillsCheckArgs([])).toEqual({ mode: "error" });
      expect(parseSkillsCheckArgs(["--mode=warn"])).toEqual({ mode: "warn" });
      expect(parseSkillsCheckArgs(["--mode", "error"])).toEqual({ mode: "error" });
      expect(() => parseSkillsCheckArgs(["--mode=loud"])).toThrow("Unknown --mode 'loud'");
      expect(() => parseSkillsCheckArgs(["--yolo"])).toThrow("--yolo");
    });

    it("never writes", () => {
      const appRoot = createAppRoot();
      const packageRoot = createPackageRoot("2026.1.0", { "hydrogen-cart-ui": "Cart.\n" });

      expect(() => checkSkills({ cwd: appRoot, packageRoot, log: vi.fn() })).toThrow();
      expect(existsSync(join(appRoot, ".agents/skills"))).toBe(false);
      expect(existsSync(join(appRoot, ".claude"))).toBe(false);
    });
  });
});
