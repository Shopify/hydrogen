import { createHash } from "node:crypto";
import * as fs from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { downloadVerified, provisionCertificates, resolveMkcertBinary } from "./mkcert";

const SUPPORTED_TARGETS = [
  ["darwin", "arm64", "mkcert-v1.4.4-darwin-arm64"],
  ["darwin", "x64", "mkcert-v1.4.4-darwin-amd64"],
  ["linux", "arm64", "mkcert-v1.4.4-linux-arm64"],
  ["linux", "x64", "mkcert-v1.4.4-linux-amd64"],
  ["win32", "arm64", "mkcert-v1.4.4-windows-arm64.exe"],
  ["win32", "x64", "mkcert-v1.4.4-windows-amd64.exe"],
] as const;

describe("resolveMkcertBinary", () => {
  it.each(SUPPORTED_TARGETS)("resolves %s-%s to a pinned release", (platform, arch, assetName) => {
    const binary = resolveMkcertBinary(platform, arch);

    expect(binary).toMatchObject({
      assetName,
      url: `https://github.com/FiloSottile/mkcert/releases/download/v1.4.4/${assetName}`,
    });
    expect(binary?.sha256).toMatch(/^[a-f0-9]{64}$/);
  });

  it("pins a distinct checksum per target", () => {
    const checksums = SUPPORTED_TARGETS.map(
      ([platform, arch]) => resolveMkcertBinary(platform, arch)?.sha256,
    );

    expect(new Set(checksums).size).toBe(SUPPORTED_TARGETS.length);
  });

  it.each([
    ["sunos", "x64"],
    ["linux", "arm"],
    ["win32", "ia32"],
  ])("returns undefined for unsupported %s-%s", (platform, arch) => {
    expect(resolveMkcertBinary(platform, arch)).toBeUndefined();
  });
});

describe("downloadVerified", () => {
  let directory: string;
  let destination: string;

  beforeEach(() => {
    directory = fs.mkdtempSync(join(tmpdir(), "hydrogen-mkcert-"));
    destination = join(directory, "bin", "mkcert");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    fs.rmSync(directory, { recursive: true, force: true });
  });

  function stubFetch(response: Response) {
    const fetchMock = vi.fn(async () => response);
    vi.stubGlobal("fetch", fetchMock);
    return fetchMock;
  }

  it("writes an executable file when the checksum matches", async () => {
    const bytes = Buffer.from("mkcert binary contents");
    const sha256 = createHash("sha256").update(bytes).digest("hex");
    const fetchMock = stubFetch(new Response(bytes));

    await downloadVerified({ url: "https://example.test/mkcert", sha256, destination });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://example.test/mkcert",
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(fs.readFileSync(destination)).toEqual(bytes);
    expect(fs.readdirSync(join(directory, "bin"))).toEqual(["mkcert"]);
    if (process.platform !== "win32") {
      expect(fs.statSync(destination).mode & 0o111).not.toBe(0);
    }
  });

  it("refuses to write a download that does not match the pinned checksum", async () => {
    stubFetch(new Response(Buffer.from("tampered contents")));

    await expect(
      downloadVerified({
        url: "https://example.test/mkcert",
        sha256: "a".repeat(64),
        destination,
      }),
    ).rejects.toThrow(/did not match the pinned SHA-256 checksum/);
    expect(fs.existsSync(destination)).toBe(false);
  });

  it("names the operation and URL when the download times out", async () => {
    const fetchMock = vi.fn(async () => {
      throw new DOMException("The operation was aborted due to timeout", "TimeoutError");
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      downloadVerified({
        url: "https://example.test/mkcert",
        sha256: "a".repeat(64),
        destination,
      }),
    ).rejects.toThrow("mkcert download timed out after 60s: https://example.test/mkcert");
  });

  it("throws on a failed download response", async () => {
    stubFetch(new Response(null, { status: 404 }));

    await expect(
      downloadVerified({
        url: "https://example.test/mkcert",
        sha256: "a".repeat(64),
        destination,
      }),
    ).rejects.toThrow(/failed with status 404/);
    expect(fs.existsSync(destination)).toBe(false);
  });
});

describe("provisionCertificates", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("rejects unsupported platforms with manual instructions", async () => {
    vi.spyOn(process, "platform", "get").mockReturnValue("sunos" as NodeJS.Platform);

    await expect(
      provisionCertificates({
        host: "custom.test",
        certPath: join(tmpdir(), "custom.test.pem"),
        keyPath: join(tmpdir(), "custom.test-key.pem"),
      }),
    ).rejects.toThrow(/not available for sunos-.*Install mkcert manually/s);
  });
});
