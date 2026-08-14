import { afterEach, describe, expect, it, vi } from "vitest";

import { runCli } from "../index";

const commandCalls = vi.hoisted(() => ({
  checkGraphQL: vi.fn(async () => {}),
  setupHydrogen: vi.fn(async () => {}),
  setupLocalHttps: vi.fn(async () => {}),
}));

vi.mock("../gql", () => ({ checkGraphQL: commandCalls.checkGraphQL }));
vi.mock("../https", () => ({ setupLocalHttps: commandCalls.setupLocalHttps }));
vi.mock("../setup", () => ({ setupHydrogen: commandCalls.setupHydrogen }));

const originalArgv = process.argv;

function runWithArguments(args: string[]): void {
  process.argv = ["node", "hydrogen", ...args];
  runCli();
}

describe("runCli", () => {
  afterEach(() => {
    process.argv = originalArgv;
    vi.clearAllMocks();
  });

  it("dispatches setup https to the local HTTPS setup, not the skills setup", () => {
    runWithArguments(["setup", "https"]);

    expect(commandCalls.setupLocalHttps).toHaveBeenCalledOnce();
    expect(commandCalls.setupHydrogen).not.toHaveBeenCalled();
  });

  it("dispatches setup to the skills setup", () => {
    runWithArguments(["setup"]);

    expect(commandCalls.setupHydrogen).toHaveBeenCalledOnce();
    expect(commandCalls.setupLocalHttps).not.toHaveBeenCalled();
  });

  it("dispatches gql check with trailing arguments", () => {
    runWithArguments(["gql", "check", "src/**/*.ts"]);

    expect(commandCalls.checkGraphQL).toHaveBeenCalledWith({ args: ["src/**/*.ts"] });
  });
});
