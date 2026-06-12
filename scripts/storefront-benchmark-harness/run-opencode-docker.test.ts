import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

import {
  buildOpenCodeDockerBuildArgs,
  buildOpenCodeDockerRunArgs,
  BENCHMARK_RUN_TIMEOUT_IN_MILLISECONDS,
  checkDockerAvailable,
  parseOpenCodeHostArgs,
  prepareBenchmarkWorkspace,
  resolveDockerRuntime,
  runDocker,
  stageHydrogenPackage,
} from "./run-opencode-docker.ts";

const SUCCESS_STATUS = 0;
const FAILURE_STATUS = 1;
const EXPECTED_BENCHMARK_RUN_TIMEOUT_IN_MINUTES = 40;
const SECONDS_PER_MINUTE = 60;
const MILLISECONDS_PER_SECOND = 1000;
const EXPECTED_BENCHMARK_RUN_TIMEOUT_IN_MILLISECONDS =
  EXPECTED_BENCHMARK_RUN_TIMEOUT_IN_MINUTES * SECONDS_PER_MINUTE * MILLISECONDS_PER_SECOND;
const EXPECTED_TEMPLATE_PUBLIC_FILES = ["favicon.svg"];
const REMOVED_TEMPLATE_VENDOR_FILES = [
  "consent-tracking-api.local.js",
  "standard-actions-tools.js",
  "standard-actions.js",
  "standard-events.js",
  "storefront-banner.local.js",
];

describe("opencode docker wrapper", () => {
  it("parses wrapper flags and prompt", () => {
    assert.deepEqual(
      parseOpenCodeHostArgs(["--workspace", "tmp/run", "--image", "bench:opencode", "hello"]),
      {
        image: "bench:opencode",
        workspace: "tmp/run",
        prompt: "hello",
        skipBuild: false,
      },
    );
  });

  it("builds Docker build args for the OpenCode image", () => {
    const args = buildOpenCodeDockerBuildArgs({ image: "bench:opencode" });

    assert.deepEqual(args.slice(0, 3), ["build", "--tag", "bench:opencode"]);
  });

  it("caps Docker benchmark runs at the configured timeout", () => {
    let observedTimeoutInMilliseconds: unknown;

    runDocker(["run", "bench:opencode"], {}, (_command, _args, options) => {
      observedTimeoutInMilliseconds = options.timeout;
      return { status: SUCCESS_STATUS };
    });

    assert.equal(observedTimeoutInMilliseconds, BENCHMARK_RUN_TIMEOUT_IN_MILLISECONDS);
    assert.equal(
      BENCHMARK_RUN_TIMEOUT_IN_MILLISECONDS,
      EXPECTED_BENCHMARK_RUN_TIMEOUT_IN_MILLISECONDS,
    );
  });

  it("keeps node_modules inside Docker so host dev installs stay platform-native", () => {
    const args = buildOpenCodeDockerRunArgs({
      image: "bench:opencode",
      workspacePath: "/tmp/workspace",
      prompt: "hello",
    });

    assert.ok(args.includes("--mount"));
    assert.ok(args.includes("type=volume,target=/workspace/node_modules"));
  });

  it("detects a reachable Docker daemon", () => {
    const result = checkDockerAvailable(() => ({ status: SUCCESS_STATUS }));

    assert.deepEqual(result, { ok: true });
  });

  it("reports an unreachable Docker daemon with next steps", () => {
    const result = checkDockerAvailable(() => ({
      status: FAILURE_STATUS,
      stderr: "cannot connect to Docker daemon",
      stdout: "",
    }));

    assert.equal(result.ok, false);
    assert.match(result.message, /Docker daemon is not reachable/);
    assert.match(result.message, /Docker Desktop/);
    assert.match(result.message, /cannot connect to Docker daemon/);
  });

  it("uses a running Colima socket when the default Docker socket is not reachable", () => {
    const checkedHosts: string[] = [];
    const result = resolveDockerRuntime({
      env: {},
      homeDir: "/Users/tester",
      existsFn: (path) => path === "/Users/tester/.colima/default/docker.sock",
      spawnFn: (_command, _args, options) => {
        const env = options.env as Record<string, string | undefined>;
        checkedHosts.push(env.DOCKER_HOST ?? "default");
        return env.DOCKER_HOST
          ? { status: SUCCESS_STATUS }
          : { status: FAILURE_STATUS, stderr: "default socket failed", stdout: "" };
      },
    });

    assert.equal(result.ok, true);
    assert.equal(result.env.DOCKER_HOST, "unix:///Users/tester/.colima/default/docker.sock");
    assert.deepEqual(checkedHosts, ["default", "unix:///Users/tester/.colima/default/docker.sock"]);
  });

  it("cleans stale files and seeds the benchmark workspace template", async () => {
    const workspacePath = await mkdtemp(join(tmpdir(), "benchmark-workspace-"));
    writeFileSync(join(workspacePath, ".storefront-benchmark-workspace"), "owned");
    writeFileSync(join(workspacePath, "stale.txt"), "stale");

    prepareBenchmarkWorkspace({ workspacePath });

    assert.equal(existsSync(join(workspacePath, "stale.txt")), false);
    assert.equal(existsSync(join(workspacePath, ".storefront-benchmark-workspace")), true);
    assert.match(
      readFileSync(join(workspacePath, "AGENTS.md"), "utf8"),
      /hydrogen-benchmark-agent-instructions-loaded/,
    );
    assert.match(
      readFileSync(join(workspacePath, ".opencode/skills/benchmark-canary/SKILL.md"), "utf8"),
      /hydrogen-benchmark-skill-loaded/,
    );

    const packageJson = JSON.parse(readFileSync(join(workspacePath, "package.json"), "utf8"));
    assert.equal(packageJson.packageManager, "pnpm@10.33.0");
    assert.equal(packageJson.dependencies["@shopify/hydrogen"], "file:./vendor/hydrogen.tgz");
    assert.ok(packageJson.dependencies["react-router"]);
    assert.ok(packageJson.devDependencies["@react-router/dev"]);
    assert.ok(packageJson.devDependencies["@tailwindcss/vite"]);
    assert.ok(packageJson.devDependencies.typescript);
    assert.ok(existsSync(join(workspacePath, "vite.config.ts")));
    assert.ok(existsSync(join(workspacePath, "react-router.config.ts")));
    assert.ok(existsSync(join(workspacePath, "app/root.tsx")));
    assert.ok(existsSync(join(workspacePath, "app/routes/home.tsx")));
    for (const file of EXPECTED_TEMPLATE_PUBLIC_FILES) {
      assert.ok(existsSync(join(workspacePath, "public", file)), `${file} should be seeded`);
    }
    for (const file of REMOVED_TEMPLATE_VENDOR_FILES) {
      assert.equal(
        existsSync(join(workspacePath, "public", file)),
        false,
        `${file} should come from the CDN, not the template`,
      );
    }
    const rootSource = readFileSync(join(workspacePath, "app/root.tsx"), "utf8");
    assert.match(rootSource, /https:\/\/cdn\.shopify\.com\/storefront\/standard-actions\.js/);
    assert.doesNotMatch(rootSource, /src="\/standard-actions\.js"/);
    assert.doesNotMatch(rootSource, /src="\/standard-actions-tools\.js"/);
    assert.doesNotMatch(
      readFileSync(join(workspacePath, "package.json"), "utf8"),
      /\/Users\/|\/workspace\/|file:\/\//,
    );
  });

  it("stages a packed Hydrogen tarball inside the benchmark workspace", async () => {
    const workspacePath = await mkdtemp(join(tmpdir(), "benchmark-workspace-"));
    const packageRoot = await mkdtemp(join(tmpdir(), "hydrogen-package-"));
    const calls: Array<{ command: string; args: string[] }> = [];

    stageHydrogenPackage({
      workspacePath,
      packageRoot,
      spawnFn: (command, args) => {
        calls.push({ command, args });
        if (command === "npm") {
          const packDestination = String(args[args.indexOf("--pack-destination") + 1]);
          writeFileSync(join(packDestination, "shopify-hydrogen-1.0.0.tgz"), "fake tarball");
          return { status: SUCCESS_STATUS, stdout: "shopify-hydrogen-1.0.0.tgz\n" };
        }
        return { status: SUCCESS_STATUS, stdout: "", stderr: "" };
      },
    });

    assert.deepEqual(calls, [
      { command: "pnpm", args: ["--dir", packageRoot, "build"] },
      {
        command: "npm",
        args: ["pack", packageRoot, "--pack-destination", join(workspacePath, "vendor")],
      },
    ]);
    assert.equal(readFileSync(join(workspacePath, "vendor/hydrogen.tgz"), "utf8"), "fake tarball");
  });

  it("refuses to reset an existing custom workspace without a marker", async () => {
    const workspacePath = await mkdtemp(join(tmpdir(), "benchmark-custom-workspace-"));
    writeFileSync(join(workspacePath, "personal-file.txt"), "do not delete");

    assert.throws(
      () => prepareBenchmarkWorkspace({ workspacePath }),
      /without \.storefront-benchmark-workspace marker/,
    );
    assert.equal(readFileSync(join(workspacePath, "personal-file.txt"), "utf8"), "do not delete");
  });

  it("resets an existing custom workspace when the marker is present", async () => {
    const workspacePath = await mkdtemp(join(tmpdir(), "benchmark-custom-workspace-"));
    writeFileSync(join(workspacePath, ".storefront-benchmark-workspace"), "owned");
    writeFileSync(join(workspacePath, "stale.txt"), "stale");

    prepareBenchmarkWorkspace({ workspacePath });

    assert.equal(existsSync(join(workspacePath, "stale.txt")), false);
    assert.equal(existsSync(join(workspacePath, "AGENTS.md")), true);
  });

  it("refuses to reset a git worktree", async () => {
    const workspacePath = await mkdtemp(join(tmpdir(), "benchmark-workspace-"));
    mkdirSync(join(workspacePath, ".git"));

    assert.throws(
      () => prepareBenchmarkWorkspace({ workspacePath }),
      /Refusing to reset a git worktree/,
    );
  });
});
