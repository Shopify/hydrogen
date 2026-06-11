import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, it, expect, vi } from "vitest";

import { setupHydrogen, type RunCommand } from "../setup";

function createTempDirectory(): string {
  return mkdtempSync(join(tmpdir(), "hydrogen-cli-"));
}

function writeJson(filePath: string, value: unknown): void {
  writeFileSync(filePath, JSON.stringify(value, null, 2));
}

function createPackageRoot(skillNames: string[]): string {
  const packageRoot = createTempDirectory();
  const skillsPath = join(packageRoot, "skills");
  mkdirSync(skillsPath, { recursive: true });

  for (const skillName of skillNames) {
    const skillPath = join(skillsPath, skillName);
    mkdirSync(skillPath, { recursive: true });
    writeFileSync(join(skillPath, "SKILL.md"), `---\nname: ${skillName}\n---\n`);
  }

  return packageRoot;
}

function createRunCommandSpy(): RunCommand & { calls: Array<[string, string[], { cwd: string }]> } {
  const calls: Array<[string, string[], { cwd: string }]> = [];
  const runCommand: RunCommand = async (command, args, options) => {
    calls.push([command, args, options]);
  };
  return Object.assign(runCommand, { calls });
}

describe("setupHydrogen", () => {
  it("installs Hydrogen with the packageManager field and copies skills to .agents", async () => {
    const appRoot = createTempDirectory();
    const packageRoot = createPackageRoot([
      "hydrogen-setup",
      "hydrogen-cart-ui",
      "hydrogen-storefront-client",
    ]);
    const runCommand = createRunCommandSpy();

    writeJson(join(appRoot, "package.json"), {
      packageManager: "pnpm@10.33.0",
      dependencies: {},
    });

    await setupHydrogen({
      cwd: appRoot,
      packageRoot,
      runCommand,
      log: vi.fn(),
      env: {},
    });

    expect(runCommand.calls).toEqual([
      ["pnpm", ["add", "@shopify/hydrogen@preview"], { cwd: appRoot }],
    ]);
    expect(existsSync(join(appRoot, ".agents/skills/hydrogen-setup/SKILL.md"))).toBe(true);
    expect(existsSync(join(appRoot, ".agents/skills/hydrogen-cart-ui/SKILL.md"))).toBe(true);
    expect(existsSync(join(appRoot, ".agents/skills/hydrogen-storefront-client/SKILL.md"))).toBe(
      true,
    );
  });

  it("detects pnpm from its lockfile", async () => {
    const appRoot = createTempDirectory();
    const packageRoot = createPackageRoot(["hydrogen-setup"]);
    const runCommand = createRunCommandSpy();

    writeFileSync(join(appRoot, "pnpm-lock.yaml"), "lockfileVersion: '9.0'\n");
    writeJson(join(appRoot, "package.json"), {
      dependencies: {},
    });

    await setupHydrogen({
      cwd: appRoot,
      packageRoot,
      runCommand,
      log: vi.fn(),
      env: {},
    });

    expect(runCommand.calls).toEqual([
      ["pnpm", ["add", "@shopify/hydrogen@preview"], { cwd: appRoot }],
    ]);
  });

  it("detects npm from npm_config_user_agent when no package manager metadata exists", async () => {
    const appRoot = createTempDirectory();
    const packageRoot = createPackageRoot(["hydrogen-setup"]);
    const runCommand = createRunCommandSpy();

    writeJson(join(appRoot, "package.json"), {
      dependencies: {},
    });

    await setupHydrogen({
      cwd: appRoot,
      packageRoot,
      runCommand,
      log: vi.fn(),
      env: { npm_config_user_agent: "npm/11.0.0 node/v24.0.0 darwin arm64" },
    });

    expect(runCommand.calls).toEqual([
      ["npm", ["install", "@shopify/hydrogen@preview"], { cwd: appRoot }],
    ]);
  });

  it("skips installation when Hydrogen is already installed and copies to .claude", async () => {
    const appRoot = createTempDirectory();
    const packageRoot = createPackageRoot(["hydrogen-setup"]);
    const runCommand = createRunCommandSpy();

    mkdirSync(join(appRoot, ".claude"));
    writeJson(join(appRoot, "package.json"), {
      dependencies: { "@shopify/hydrogen": "^1.0.0" },
    });

    await setupHydrogen({
      cwd: appRoot,
      packageRoot,
      runCommand,
      log: vi.fn(),
      env: { npm_config_user_agent: "npm/10.0.0 node/v24.0.0 darwin arm64" },
    });

    expect(runCommand.calls).toEqual([]);
    expect(readFileSync(join(appRoot, ".claude/skills/hydrogen-setup/SKILL.md"), "utf8")).toContain(
      "hydrogen-setup",
    );
    expect(existsSync(join(appRoot, ".agents"))).toBe(false);
  });

  it("copies skills to both .claude and .agents when both directories exist", async () => {
    const appRoot = createTempDirectory();
    const packageRoot = createPackageRoot(["hydrogen-setup"]);
    const runCommand = createRunCommandSpy();

    mkdirSync(join(appRoot, ".claude"));
    mkdirSync(join(appRoot, ".agents"));
    writeJson(join(appRoot, "package.json"), {
      dependencies: { "@shopify/hydrogen": "^1.0.0" },
    });

    await setupHydrogen({
      cwd: appRoot,
      packageRoot,
      runCommand,
      log: vi.fn(),
      env: {},
    });

    expect(existsSync(join(appRoot, ".claude/skills/hydrogen-setup/SKILL.md"))).toBe(true);
    expect(existsSync(join(appRoot, ".agents/skills/hydrogen-setup/SKILL.md"))).toBe(true);
  });

  it("copies skills to .agents when only .agents exists", async () => {
    const appRoot = createTempDirectory();
    const packageRoot = createPackageRoot(["hydrogen-setup"]);
    const runCommand = createRunCommandSpy();

    mkdirSync(join(appRoot, ".agents"));
    writeJson(join(appRoot, "package.json"), {
      dependencies: { "@shopify/hydrogen": "^1.0.0" },
    });

    await setupHydrogen({
      cwd: appRoot,
      packageRoot,
      runCommand,
      log: vi.fn(),
      env: {},
    });

    expect(existsSync(join(appRoot, ".agents/skills/hydrogen-setup/SKILL.md"))).toBe(true);
    expect(existsSync(join(appRoot, ".claude"))).toBe(false);
  });

  it("copies skills from the local installed package when available", async () => {
    const appRoot = createTempDirectory();
    const localPackageRoot = createPackageRoot(["local-copy"]);
    const runCommand = createRunCommandSpy();

    mkdirSync(join(appRoot, "node_modules/@shopify"), { recursive: true });
    cpSync(localPackageRoot, join(appRoot, "node_modules/@shopify/hydrogen"), {
      recursive: true,
    });
    writeJson(join(appRoot, "package.json"), {
      dependencies: { "@shopify/hydrogen": "^1.0.0" },
    });

    await setupHydrogen({
      cwd: appRoot,
      runCommand,
      log: vi.fn(),
      env: {},
    });

    expect(existsSync(join(appRoot, ".agents/skills/local-copy/SKILL.md"))).toBe(true);
    expect(existsSync(join(appRoot, ".agents/skills/npx-copy/SKILL.md"))).toBe(false);
  });

  it("fails before copying when a complete destination skill already exists", async () => {
    const appRoot = createTempDirectory();
    const packageRoot = createPackageRoot(["hydrogen-setup", "hydrogen-cart-ui"]);
    const runCommand = createRunCommandSpy();

    mkdirSync(join(appRoot, ".agents/skills/hydrogen-cart-ui"), { recursive: true });
    writeFileSync(join(appRoot, ".agents/skills/hydrogen-cart-ui/SKILL.md"), "existing skill");
    writeJson(join(appRoot, "package.json"), {
      packageManager: "npm@11.0.0",
      dependencies: { "@shopify/hydrogen": "^1.0.0" },
    });

    await expect(
      setupHydrogen({
        cwd: appRoot,
        packageRoot,
        runCommand,
        log: vi.fn(),
        env: {},
      }),
    ).rejects.toThrow("Skill directories already exist");

    expect(existsSync(join(appRoot, ".agents/skills/hydrogen-setup"))).toBe(false);
  });

  it("fails before copying to any destination when one destination has a conflicting skill", async () => {
    const appRoot = createTempDirectory();
    const packageRoot = createPackageRoot(["hydrogen-setup", "hydrogen-cart-ui"]);
    const runCommand = createRunCommandSpy();

    mkdirSync(join(appRoot, ".claude/skills/hydrogen-cart-ui"), { recursive: true });
    mkdirSync(join(appRoot, ".agents"));
    writeFileSync(join(appRoot, ".claude/skills/hydrogen-cart-ui/SKILL.md"), "existing skill");
    writeJson(join(appRoot, "package.json"), {
      dependencies: { "@shopify/hydrogen": "^1.0.0" },
    });

    await expect(
      setupHydrogen({
        cwd: appRoot,
        packageRoot,
        runCommand,
        log: vi.fn(),
        env: {},
      }),
    ).rejects.toThrow("Skill directories already exist");

    expect(existsSync(join(appRoot, ".agents/skills/hydrogen-setup"))).toBe(false);
  });

  it("repairs incomplete destination skill directories while copying all skills", async () => {
    const appRoot = createTempDirectory();
    const packageRoot = createPackageRoot([
      "hydrogen-setup",
      "hydrogen-cart-ui",
      "hydrogen-storefront-client",
    ]);
    const runCommand = createRunCommandSpy();

    mkdirSync(join(appRoot, ".agents/skills/hydrogen-cart-ui/references"), {
      recursive: true,
    });
    writeFileSync(
      join(appRoot, ".agents/skills/hydrogen-cart-ui/references/vue.md"),
      "partial copy",
    );
    writeJson(join(appRoot, "package.json"), {
      dependencies: { "@shopify/hydrogen": "^1.0.0" },
    });

    await setupHydrogen({
      cwd: appRoot,
      packageRoot,
      runCommand,
      log: vi.fn(),
      env: {},
    });

    expect(existsSync(join(appRoot, ".agents/skills/hydrogen-setup/SKILL.md"))).toBe(true);
    expect(existsSync(join(appRoot, ".agents/skills/hydrogen-cart-ui/SKILL.md"))).toBe(true);
    expect(existsSync(join(appRoot, ".agents/skills/hydrogen-storefront-client/SKILL.md"))).toBe(
      true,
    );
  });
});
