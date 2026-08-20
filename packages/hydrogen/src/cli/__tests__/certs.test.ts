import { homedir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { uninstallLocalHttpsCertificates } from "../certs";

const fsCalls = vi.hoisted(() => ({ rm: vi.fn(async () => {}) }));
const mkcertCalls = vi.hoisted(() => ({
  resolveMkcertBinary: vi.fn((): { assetName: string } | undefined => ({
    assetName: "mkcert-pinned-platform",
  })),
  uninstallCertificateAuthority: vi.fn(async () => {}),
}));

vi.mock("node:fs/promises", async (importOriginal) => ({
  ...(await importOriginal<typeof import("node:fs/promises")>()),
  rm: fsCalls.rm,
}));

vi.mock("../../vite/mkcert", () => ({
  resolveMkcertBinary: mkcertCalls.resolveMkcertBinary,
  uninstallCertificateAuthority: mkcertCalls.uninstallCertificateAuthority,
}));

describe("uninstallLocalHttpsCertificates", () => {
  beforeEach(() => {
    fsCalls.rm.mockClear();
    mkcertCalls.resolveMkcertBinary.mockClear();
    mkcertCalls.uninstallCertificateAuthority.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("removes Hydrogen files but keeps the shared certificate authority by default", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const hydrogenDirectory = join(homedir(), ".shopify", "hydrogen");

    await uninstallLocalHttpsCertificates();

    expect(fsCalls.rm.mock.calls).toEqual([
      [join(hydrogenDirectory, "certs", "local.tryhydrogen.dev.pem"), { force: true }],
      [join(hydrogenDirectory, "certs", "local.tryhydrogen.dev-key.pem"), { force: true }],
      [join(hydrogenDirectory, "mkcert", "mkcert-pinned-platform"), { force: true }],
    ]);
    expect(mkcertCalls.resolveMkcertBinary).toHaveBeenCalledWith(process.platform, process.arch);
    expect(mkcertCalls.uninstallCertificateAuthority).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith(
      "The shared mkcert CA remains trusted. Pass --remove-ca to remove it.",
    );
  });

  it("removes the shared certificate authority when requested", async () => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    await uninstallLocalHttpsCertificates(["--remove-ca"]);

    expect(warn).toHaveBeenCalledWith(expect.stringContaining("other projects"));
    expect(mkcertCalls.uninstallCertificateAuthority).toHaveBeenCalledOnce();
  });

  it("does not remove another mkcert binary on an unsupported platform", async () => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    mkcertCalls.resolveMkcertBinary.mockReturnValueOnce(undefined);
    const certificateDirectory = join(homedir(), ".shopify", "hydrogen", "certs");

    await uninstallLocalHttpsCertificates();

    expect(fsCalls.rm.mock.calls).toEqual([
      [join(certificateDirectory, "local.tryhydrogen.dev.pem"), { force: true }],
      [join(certificateDirectory, "local.tryhydrogen.dev-key.pem"), { force: true }],
    ]);
  });

  it("rejects unknown arguments without removing anything", async () => {
    await expect(uninstallLocalHttpsCertificates(["--unknown"])).rejects.toThrow(
      "Unknown argument: --unknown",
    );

    expect(fsCalls.rm).not.toHaveBeenCalled();
    expect(mkcertCalls.uninstallCertificateAuthority).not.toHaveBeenCalled();
  });
});
