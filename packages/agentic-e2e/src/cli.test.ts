import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createBrowserSession } from "./browser/session.ts";
import { main, parseCliArgs, USAGE } from "./cli.ts";

vi.mock("./browser/session.ts", () => ({ createBrowserSession: vi.fn() }));

let stdout: string[];
let stderr: string[];

beforeEach(() => {
  stdout = [];
  stderr = [];
  vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
    stdout.push(String(chunk));
    return true;
  });
  vi.spyOn(process.stderr, "write").mockImplementation((chunk) => {
    stderr.push(String(chunk));
    return true;
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.mocked(createBrowserSession).mockReset();
});

describe("parseCliArgs", () => {
  it("accepts one http or https URL", () => {
    for (const input of ["https://shop.example/en-ca?x=1", "http://127.0.0.1:3000/"]) {
      const parsed = parseCliArgs([input]);
      expect(parsed.kind).toBe("run");
      expect(parsed.kind === "run" && parsed.url.href).toBe(new URL(input).href);
    }
  });

  it("returns help for -h and --help, even with a URL", () => {
    expect(parseCliArgs(["-h"])).toEqual({ kind: "help" });
    expect(parseCliArgs(["--help", "https://shop.example"])).toEqual({ kind: "help" });
  });

  it.each([
    { argv: [], message: "Expected exactly one URL." },
    { argv: ["https://a.example", "https://b.example"], message: "Expected exactly one URL." },
    { argv: ["shop.example"], message: "Not a valid URL: shop.example" },
    { argv: ["file:///etc/hosts"], message: "URL must use http or https, received file:" },
    { argv: ["javascript:alert(1)"], message: "URL must use http or https, received javascript:" },
    { argv: ["https://user:pass@shop.example"], message: "URL must not contain credentials." },
    { argv: ["https://user@shop.example"], message: "URL must not contain credentials." },
  ])("rejects $argv", ({ argv, message }) => {
    expect(parseCliArgs(argv)).toEqual({ kind: "error", message });
  });

  it("rejects unknown flags", () => {
    const parsed = parseCliArgs(["https://shop.example", "--timeout", "10"]);
    expect(parsed.kind).toBe("error");
  });
});

describe("main", () => {
  it("prints help on stdout and exits 0 without a browser", async () => {
    await expect(main(["--help"])).resolves.toBe(0);

    expect(stdout).toEqual([`${USAGE}\n`]);
    expect(createBrowserSession).not.toHaveBeenCalled();
  });

  it("exits 64 with usage on stderr and no browser when there is no URL", async () => {
    await expect(main([])).resolves.toBe(64);

    expect(stdout).toEqual([]);
    expect(stderr.join("")).toContain(USAGE);
    expect(createBrowserSession).not.toHaveBeenCalled();
  });

  it("stops on SIGINT, closes the browser, and reports indeterminate", async () => {
    const close = vi.fn(async () => undefined);
    const { promise: navigating, resolve: gotoStarted } = Promise.withResolvers<void>();
    const page = {
      // A navigation that never settles on its own.
      goto: vi.fn(async () => {
        gotoStarted();
        return new Promise(() => undefined);
      }),
    };
    vi.mocked(createBrowserSession).mockResolvedValue({
      page,
      close,
    } as unknown as Awaited<ReturnType<typeof createBrowserSession>>);
    const listenersBefore = process.listenerCount("SIGINT");

    const run = main(["https://shop.example"]);
    await navigating;
    process.emit("SIGINT", "SIGINT");

    await expect(run).resolves.toBe(2);
    expect(stdout).toEqual([
      `${JSON.stringify({ status: "indeterminate", reason: "Interrupted by SIGINT." })}\n`,
    ]);
    expect(close).toHaveBeenCalledOnce();
    expect(process.listenerCount("SIGINT")).toBe(listenersBefore);
  });

  it("passes the interrupt signal to browser startup and reports a cancelled start", async () => {
    // A startup that ends only when its signal aborts, like the real session.
    vi.mocked(createBrowserSession).mockImplementation(
      async (_executablePath, options) =>
        new Promise((_resolve, reject) => {
          const signal = options?.signal;
          signal?.addEventListener("abort", () => reject(signal.reason), { once: true });
        }),
    );
    const listenersBefore = process.listenerCount("SIGTERM");

    const run = main(["https://shop.example"]);
    await vi.waitFor(() => expect(createBrowserSession).toHaveBeenCalledOnce());
    const [executablePath, options] = vi.mocked(createBrowserSession).mock.calls[0] ?? [];
    expect(executablePath).toBeUndefined();
    expect(options?.signal?.aborted).toBe(false);
    process.emit("SIGTERM", "SIGTERM");

    await expect(run).resolves.toBe(2);
    expect(options?.signal?.aborted).toBe(true);
    expect(stdout).toEqual([
      `${JSON.stringify({ status: "indeterminate", reason: "Interrupted by SIGTERM." })}\n`,
    ]);
    expect(process.listenerCount("SIGTERM")).toBe(listenersBefore);
  });

  it("still prints the result when browser cleanup fails", async () => {
    const page = {
      goto: vi.fn(async () => ({ status: () => 200 })),
      title: vi.fn(async () => "Home"),
      url: () => "https://shop.example/",
    };
    vi.mocked(createBrowserSession).mockResolvedValue({
      page,
      close: vi.fn(async () => {
        throw new Error("profile is busy");
      }),
    } as unknown as Awaited<ReturnType<typeof createBrowserSession>>);
    const listenersBefore = process.listenerCount("SIGINT");

    await expect(main(["https://shop.example"])).resolves.toBe(0);

    expect(stdout).toEqual([
      `${JSON.stringify({ status: "opened", url: "https://shop.example/", title: "Home" })}\n`,
    ]);
    expect(stderr.join("")).toContain("Cleanup failed: profile is busy");
    expect(process.listenerCount("SIGINT")).toBe(listenersBefore);
  });
});
