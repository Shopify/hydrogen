import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";

import { afterEach, describe, it, expect, vi } from "vitest";

import { setupHydrogen, type RunCommand } from "./setup";
import * as skills from "./skills";

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
  writeJson(join(packageRoot, "package.json"), { name: "@shopify/hydrogen", version: "1.0.0" });

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

function createFixtureTarball(): Buffer {
  const fixtureDir = mkdtempSync(join(tmpdir(), "hydrogen-fixture-"));
  const templateDir = join(fixtureDir, "hydrogen-dist-preview/templates/react-router");
  const siblingDir = join(fixtureDir, "hydrogen-dist-preview/templates/other-template");
  mkdirSync(templateDir, { recursive: true });
  mkdirSync(join(templateDir, "app"), { recursive: true });
  mkdirSync(siblingDir, { recursive: true });

  writeJson(join(templateDir, "package.json"), {
    name: "@shopify/hydrogen-template-react-router",
    private: true,
    packageManager: "npm@11.17.0",
    dependencies: { "@shopify/hydrogen": "2026.10.0-preview.3" },
  });
  writeJson(join(templateDir, "package-lock.json"), { lockfileVersion: 3 });
  writeFileSync(join(templateDir, "app/root.tsx"), "export default function App() {}");
  writeJson(join(siblingDir, "package.json"), { name: "other-template" });

  const tarballPath = join(fixtureDir, "fixture.tar.gz");
  execFileSync("tar", ["czf", tarballPath, "-C", fixtureDir, "hydrogen-dist-preview"]);
  return readFileSync(tarballPath);
}

function createInstallOnlyRunCommandSpy(): RunCommand & {
  calls: Array<[string, string[], { cwd: string }]>;
} {
  const calls: Array<[string, string[], { cwd: string }]> = [];
  const runCommand: RunCommand = async (command, args, options) => {
    calls.push([command, args, options]);
    if (command === "tar") {
      execFileSync(command, args, { cwd: options.cwd });
    }
  };
  return Object.assign(runCommand, { calls });
}

describe("setupHydrogen", () => {
  it("installs Hydrogen with the packageManager field and copies skills to both harness directories", async () => {
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
    for (const harness of [".claude", ".agents"]) {
      expect(existsSync(join(appRoot, harness, "skills/hydrogen-setup/SKILL.md"))).toBe(true);
      expect(existsSync(join(appRoot, harness, "skills/hydrogen-cart-ui/SKILL.md"))).toBe(true);
      expect(existsSync(join(appRoot, harness, "skills/hydrogen-storefront-client/SKILL.md"))).toBe(
        true,
      );
    }
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

  it("skips installation when Hydrogen is already installed", async () => {
    const appRoot = createTempDirectory();
    const packageRoot = createPackageRoot(["hydrogen-setup"]);
    const runCommand = createRunCommandSpy();

    mkdirSync(join(appRoot, "node_modules/@shopify/hydrogen"), { recursive: true });
    writeJson(join(appRoot, "node_modules/@shopify/hydrogen/package.json"), {
      name: "@shopify/hydrogen",
      version: "1.0.0",
    });
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
  });

  it("runs install when Hydrogen is declared but not resolvable", async () => {
    vi.spyOn(skills, "getInstalledPackageRoot").mockReturnValue(undefined);

    const appRoot = createTempDirectory();
    const packageRoot = createPackageRoot(["hydrogen-setup"]);
    const runCommand = createRunCommandSpy();
    const log = vi.fn();

    writeJson(join(appRoot, "package.json"), {
      dependencies: { "@shopify/hydrogen": "^1.0.0" },
    });

    await setupHydrogen({
      cwd: appRoot,
      packageRoot,
      runCommand,
      log,
      env: { npm_config_user_agent: "npm/10.0.0 node/v24.0.0 darwin arm64" },
    });

    expect(log).toHaveBeenCalledWith(expect.stringContaining("declared but not installed"));
    expect(runCommand.calls).toEqual([["npm", ["install"], { cwd: appRoot }]]);

    vi.restoreAllMocks();
  });

  it("fails when a harness path exists but is not a directory", async () => {
    const appRoot = createTempDirectory();
    const packageRoot = createPackageRoot(["hydrogen-setup"]);

    writeFileSync(join(appRoot, ".claude"), "not a directory");
    writeJson(join(appRoot, "package.json"), {
      dependencies: { "@shopify/hydrogen": "^1.0.0" },
    });

    await expect(
      setupHydrogen({
        cwd: appRoot,
        packageRoot,
        runCommand: createRunCommandSpy(),
        log: vi.fn(),
        env: {},
      }),
    ).rejects.toThrow(".claude exists but is not a directory");
    expect(existsSync(join(appRoot, ".agents"))).toBe(false);
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

  it("fails before copying when an unmanaged destination skill already exists", async () => {
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
    ).rejects.toThrow("Skill directories exist that Hydrogen did not create");

    expect(existsSync(join(appRoot, ".agents/skills/hydrogen-setup"))).toBe(false);
  });

  it("forwards --force to skills sync so unmanaged skills are overwritten", async () => {
    const appRoot = createTempDirectory();
    const packageRoot = createPackageRoot(["hydrogen-cart-ui"]);
    const skillFile = join(appRoot, ".agents/skills/hydrogen-cart-ui/SKILL.md");

    mkdirSync(join(appRoot, ".agents/skills/hydrogen-cart-ui"), { recursive: true });
    writeFileSync(skillFile, "existing skill");
    writeJson(join(appRoot, "package.json"), {
      dependencies: { "@shopify/hydrogen": "^1.0.0" },
    });

    await setupHydrogen({
      force: true,
      cwd: appRoot,
      packageRoot,
      runCommand: createRunCommandSpy(),
      log: vi.fn(),
      env: {},
    });

    expect(readFileSync(skillFile, "utf8")).toContain("name: hydrogen-cart-ui");
  });

  it("fails before copying to any destination when one destination has an unmanaged skill", async () => {
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
    ).rejects.toThrow("Skill directories exist that Hydrogen did not create");

    expect(existsSync(join(appRoot, ".agents/skills/hydrogen-setup"))).toBe(false);
  });

  describe("no package.json", () => {
    afterEach(() => {
      vi.unstubAllGlobals();
      vi.restoreAllMocks();
    });

    let fixtureTarball: Buffer;

    function stubFetch(): void {
      fixtureTarball ??= createFixtureTarball();
      const arrayBuffer = fixtureTarball.buffer.slice(
        fixtureTarball.byteOffset,
        fixtureTarball.byteOffset + fixtureTarball.byteLength,
      );
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          arrayBuffer: () => Promise.resolve(arrayBuffer),
        }),
      );
    }

    it("scaffolds template when prompt returns scaffold", async () => {
      stubFetch();
      const appRoot = createTempDirectory();
      const packageRoot = createPackageRoot(["hydrogen-setup"]);
      const runCommand = createInstallOnlyRunCommandSpy();

      await setupHydrogen({
        cwd: appRoot,
        packageRoot,
        runCommand,
        log: vi.fn(),
        env: { npm_config_user_agent: "pnpm/10.33.0 node/v24.0.0 darwin arm64" },
        prompt: async () => "scaffold",
      });

      expect(existsSync(join(appRoot, "app/root.tsx"))).toBe(true);
      const installCall = runCommand.calls.find(([cmd]) => cmd !== "tar");
      expect(installCall).toEqual(["pnpm", ["install"], { cwd: appRoot }]);
      expect(existsSync(join(appRoot, ".claude/skills/hydrogen-setup/SKILL.md"))).toBe(true);
    });

    it("extracts only the target template, not siblings", async () => {
      stubFetch();
      const appRoot = createTempDirectory();
      const packageRoot = createPackageRoot(["hydrogen-setup"]);

      await setupHydrogen({
        cwd: appRoot,
        packageRoot,
        runCommand: createInstallOnlyRunCommandSpy(),
        log: vi.fn(),
        env: {},
        prompt: async () => "scaffold",
      });

      expect(existsSync(join(appRoot, "package.json"))).toBe(true);
      expect(existsSync(join(appRoot, "other-template"))).toBe(false);
    });

    it("preserves template lockfile after scaffolding", async () => {
      stubFetch();
      const appRoot = createTempDirectory();
      const packageRoot = createPackageRoot(["hydrogen-setup"]);

      await setupHydrogen({
        cwd: appRoot,
        packageRoot,
        runCommand: createInstallOnlyRunCommandSpy(),
        log: vi.fn(),
        env: {},
        prompt: async () => "scaffold",
      });

      expect(existsSync(join(appRoot, "package-lock.json"))).toBe(true);
    });

    it("updates scaffolded package.json: sets name, strips private and packageManager", async () => {
      stubFetch();
      const appRoot = createTempDirectory();
      const packageRoot = createPackageRoot(["hydrogen-setup"]);

      await setupHydrogen({
        cwd: appRoot,
        packageRoot,
        runCommand: createInstallOnlyRunCommandSpy(),
        log: vi.fn(),
        env: {},
        prompt: async () => "scaffold",
      });

      const packageJson = JSON.parse(readFileSync(join(appRoot, "package.json"), "utf8"));
      expect(packageJson.name).toBe(basename(appRoot));
      expect(packageJson.private).toBeUndefined();
      expect(packageJson.packageManager).toBeUndefined();
      expect(packageJson.dependencies["@shopify/hydrogen"]).toBe("2026.10.0-preview.3");
    });

    it("detects package manager from npm_config_user_agent for scaffold", async () => {
      stubFetch();
      const appRoot = createTempDirectory();
      const packageRoot = createPackageRoot(["hydrogen-setup"]);
      const runCommand = createInstallOnlyRunCommandSpy();

      await setupHydrogen({
        cwd: appRoot,
        packageRoot,
        runCommand,
        log: vi.fn(),
        env: { npm_config_user_agent: "yarn/4.0.0 node/v24.0.0 darwin arm64" },
        prompt: async () => "scaffold",
      });

      const installCall = runCommand.calls.find(([cmd]) => cmd !== "tar");
      expect(installCall).toEqual(["yarn", ["install"], { cwd: appRoot }]);
    });

    it("falls back to npm when no npm_config_user_agent is set", async () => {
      stubFetch();
      const appRoot = createTempDirectory();
      const packageRoot = createPackageRoot(["hydrogen-setup"]);
      const runCommand = createInstallOnlyRunCommandSpy();

      await setupHydrogen({
        cwd: appRoot,
        packageRoot,
        runCommand,
        log: vi.fn(),
        env: {},
        prompt: async () => "scaffold",
      });

      const installCall = runCommand.calls.find(([cmd]) => cmd !== "tar");
      expect(installCall).toEqual(["npm", ["install"], { cwd: appRoot }]);
    });

    it("syncs skills only when prompt returns skills", async () => {
      const appRoot = createTempDirectory();
      const packageRoot = createPackageRoot(["hydrogen-setup"]);
      const runCommand = createRunCommandSpy();

      await setupHydrogen({
        cwd: appRoot,
        packageRoot,
        runCommand,
        log: vi.fn(),
        env: {},
        prompt: async () => "skills",
      });

      expect(runCommand.calls).toEqual([]);
      expect(existsSync(join(appRoot, ".claude/skills/hydrogen-setup/SKILL.md"))).toBe(true);
      expect(existsSync(join(appRoot, ".agents/skills/hydrogen-setup/SKILL.md"))).toBe(true);
    });

    it("defaults to skills-only when no prompt is provided (CI)", async () => {
      const originalStdinIsTTY = process.stdin.isTTY;
      const originalStdoutIsTTY = process.stdout.isTTY;
      Object.defineProperty(process.stdin, "isTTY", { value: true, configurable: true });
      Object.defineProperty(process.stdout, "isTTY", { value: true, configurable: true });

      try {
        const appRoot = createTempDirectory();
        const packageRoot = createPackageRoot(["hydrogen-setup"]);
        const runCommand = createRunCommandSpy();

        await setupHydrogen({
          cwd: appRoot,
          packageRoot,
          runCommand,
          log: vi.fn(),
          env: { CI: "1" },
        });

        expect(runCommand.calls).toEqual([]);
        expect(existsSync(join(appRoot, ".claude/skills/hydrogen-setup/SKILL.md"))).toBe(true);
      } finally {
        Object.defineProperty(process.stdin, "isTTY", {
          value: originalStdinIsTTY,
          configurable: true,
        });
        Object.defineProperty(process.stdout, "isTTY", {
          value: originalStdoutIsTTY,
          configurable: true,
        });
      }
    });

    it("errors when directory is non-empty and has no package.json", async () => {
      const appRoot = createTempDirectory();
      writeFileSync(join(appRoot, "README.md"), "# existing project");
      const packageRoot = createPackageRoot(["hydrogen-setup"]);

      await expect(
        setupHydrogen({
          cwd: appRoot,
          packageRoot,
          runCommand: createRunCommandSpy(),
          log: vi.fn(),
          env: {},
          prompt: async () => "scaffold",
        }),
      ).rejects.toThrow("No package.json found. Run this command from your project root.");
    });

    it("allows scaffolding into a directory that only contains .git", async () => {
      stubFetch();
      const appRoot = createTempDirectory();
      mkdirSync(join(appRoot, ".git"));
      const packageRoot = createPackageRoot(["hydrogen-setup"]);
      const runCommand = createInstallOnlyRunCommandSpy();

      await setupHydrogen({
        cwd: appRoot,
        packageRoot,
        runCommand,
        log: vi.fn(),
        env: {},
        prompt: async () => "scaffold",
      });

      expect(existsSync(join(appRoot, "package.json"))).toBe(true);
    });

    it("fails with a clear message when template download fails", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({ ok: false, status: 404, statusText: "Not Found" }),
      );
      const appRoot = createTempDirectory();
      const packageRoot = createPackageRoot(["hydrogen-setup"]);

      await expect(
        setupHydrogen({
          cwd: appRoot,
          packageRoot,
          runCommand: createRunCommandSpy(),
          log: vi.fn(),
          env: {},
          prompt: async () => "scaffold",
        }),
      ).rejects.toThrow("Failed to download template (404)");
    });
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
      join(appRoot, ".agents/skills/hydrogen-cart-ui/references/react.md"),
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

    for (const harness of [".claude", ".agents"]) {
      expect(existsSync(join(appRoot, harness, "skills/hydrogen-setup/SKILL.md"))).toBe(true);
      expect(existsSync(join(appRoot, harness, "skills/hydrogen-cart-ui/SKILL.md"))).toBe(true);
      expect(existsSync(join(appRoot, harness, "skills/hydrogen-storefront-client/SKILL.md"))).toBe(
        true,
      );
    }
  });
});
