import { afterEach, describe, expect, it, vi } from "vitest";

import { runCli } from "../index";

const commandCalls = vi.hoisted(() => ({
  checkGraphQL: vi.fn(async () => {}),
  installLocalHttpsCertificates: vi.fn(async () => {}),
  setupHydrogen: vi.fn(async () => {}),
}));

vi.mock("../certs", () => ({
  installLocalHttpsCertificates: commandCalls.installLocalHttpsCertificates,
}));
vi.mock("../gql", () => ({ checkGraphQL: commandCalls.checkGraphQL }));
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

  it("dispatches certs install to local HTTPS installation", () => {
    runWithArguments(["certs", "install"]);

    expect(commandCalls.installLocalHttpsCertificates).toHaveBeenCalledOnce();
    expect(commandCalls.setupHydrogen).not.toHaveBeenCalled();
  });

  it("dispatches setup to the skills setup", () => {
    runWithArguments(["setup"]);

    expect(commandCalls.setupHydrogen).toHaveBeenCalledOnce();
    expect(commandCalls.installLocalHttpsCertificates).not.toHaveBeenCalled();
  });

  it("dispatches gql check with trailing arguments", () => {
    runWithArguments(["gql", "check", "src/**/*.ts"]);

    expect(commandCalls.checkGraphQL).toHaveBeenCalledWith({ args: ["src/**/*.ts"] });
  });
});
