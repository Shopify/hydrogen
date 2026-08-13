import * as fs from "node:fs";
import type { ServerResponse } from "node:http";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { localHttps, localHttpsDevServer } from ".";
import { assert } from "../core/test-utils";

const fsCalls = vi.hoisted(() => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
}));

vi.mock("node:fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs")>();

  return {
    ...actual,
    existsSync(...args: any[]) {
      fsCalls.existsSync(...args);
      return (actual.existsSync as any)(...args);
    },
    readFileSync(...args: any[]) {
      fsCalls.readFileSync(...args);
      return (actual.readFileSync as any)(...args);
    },
  };
});

const HTTP1_ONLY_HEADERS = [
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
] as const;

function getHook<T extends (this: any, ...args: any[]) => any>(
  hook: T | { handler: T } | undefined,
  name: string,
): OmitThisParameter<T> {
  assert(hook, `${name} hook is defined`);
  return (typeof hook === "function" ? hook : hook.handler) as OmitThisParameter<T>;
}

describe("localHttps", () => {
  let directory: string;
  let certPath: string;
  let keyPath: string;

  beforeEach(() => {
    fsCalls.existsSync.mockClear();
    fsCalls.readFileSync.mockClear();
    directory = fs.mkdtempSync(join(tmpdir(), "hydrogen-local-https-"));
    certPath = join(directory, "custom.test.pem");
    keyPath = join(directory, "custom.test-key.pem");
  });

  afterEach(() => {
    vi.restoreAllMocks();
    fs.rmSync(directory, { recursive: true, force: true });
  });

  it("has no side effects when disabled", () => {
    const use = vi.fn();
    const plugin = localHttps({ enabled: false });

    const config = getHook(plugin.config, "config");
    const configureServer = getHook(plugin.configureServer, "configureServer");

    expect(config({} as any, {} as any)).toBeUndefined();
    expect(configureServer({ middlewares: { use } } as any)).toBeUndefined();
    expect(use).not.toHaveBeenCalled();
    expect(fsCalls.existsSync).not.toHaveBeenCalled();
    expect(fsCalls.readFileSync).not.toHaveBeenCalled();
  });

  it("returns complete Vite server configuration from certificate files", () => {
    fs.writeFileSync(certPath, "certificate");
    fs.writeFileSync(keyPath, "private-key");
    const plugin = localHttps({
      enabled: true,
      host: "custom.test",
      port: 4_321,
      certPath,
      keyPath,
    });

    const config = getHook(plugin.config, "config");

    expect(config({} as any, {} as any)).toEqual({
      server: {
        allowedHosts: ["custom.test"],
        host: "custom.test",
        port: 4_321,
        strictPort: true,
        https: {
          ALPNProtocols: ["http/1.1"],
          cert: Buffer.from("certificate"),
          key: Buffer.from("private-key"),
        },
        hmr: {
          host: "custom.test",
          protocol: "wss",
        },
      },
    });
  });

  it("warns and leaves Vite unconfigured when certificate files are missing", () => {
    const warn = vi.spyOn(process, "emitWarning").mockImplementation(() => {});
    const plugin = localHttps({
      enabled: true,
      host: "custom.test",
      certPath,
      keyPath,
    });
    const config = getHook(plugin.config, "config");
    const configureServer = getHook(plugin.configureServer, "configureServer");
    const use = vi.fn();

    expect(config({} as any, {} as any)).toBeUndefined();
    expect(configureServer({ middlewares: { use } } as any)).toBeUndefined();
    expect(use).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledOnce();

    const message = String(warn.mock.calls[0]?.[0]);
    expect(message).toContain(certPath);
    expect(message).toContain(keyPath);
    expect(message).toContain("brew install mkcert");
    expect(message).toContain("mkcert -install");
    expect(message).toContain(`mkdir -p '${directory}'`);
    expect(message).not.toContain(`mkdir -p '${directory}' '${directory}'`);
    expect(message).toContain(
      `mkcert -cert-file '${certPath}' -key-file '${keyPath}' 'custom.test'`,
    );
  });

  it("warns once when Vite creates multiple plugin instances", () => {
    const warn = vi.spyOn(process, "emitWarning").mockImplementation(() => {});

    for (let index = 0; index < 2; index += 1) {
      const plugin = localHttps({
        enabled: true,
        host: "custom.test",
        certPath,
        keyPath,
      });
      const config = getHook(plugin.config, "config");
      expect(config({} as any, {} as any)).toBeUndefined();
    }

    expect(warn).toHaveBeenCalledOnce();
  });

  it("warns for distinct hosts that share missing certificate paths", () => {
    const warn = vi.spyOn(process, "emitWarning").mockImplementation(() => {});

    for (const host of ["first.test", "second.test"]) {
      const plugin = localHttps({ enabled: true, host, certPath, keyPath });
      const config = getHook(plugin.config, "config");
      expect(config({} as any, {} as any)).toBeUndefined();
    }

    expect(warn).toHaveBeenCalledTimes(2);
    expect(String(warn.mock.calls[0]?.[0])).toContain("'first.test'");
    expect(String(warn.mock.calls[1]?.[0])).toContain("'second.test'");
  });

  it("sets forwarded headers without replacing existing values", () => {
    fs.writeFileSync(certPath, "certificate");
    fs.writeFileSync(keyPath, "private-key");
    const { middleware } = configurePlugin({ certPath, keyPath });
    const next = vi.fn();
    const response = createResponse();
    const request = {
      headers: {
        host: "request.test:3000",
        "x-forwarded-host": "proxy.test:8080",
        "x-forwarded-proto": "http",
      },
    };

    middleware(request, response.value, next);

    expect(request.headers["x-forwarded-host"]).toBe("proxy.test:8080");
    expect(request.headers["x-forwarded-proto"]).toBe("http");
    expect(next).toHaveBeenCalledOnce();
  });

  it("uses the request host and configured fallback for forwarded host", () => {
    fs.writeFileSync(certPath, "certificate");
    fs.writeFileSync(keyPath, "private-key");
    const { middleware } = configurePlugin({ certPath, keyPath });
    const response = createResponse();
    const withHost = { headers: { host: "request.test:3000" } };
    const withoutHost: { headers: Record<string, string | undefined> } = { headers: {} };

    middleware(withHost, response.value, vi.fn());
    middleware(withoutHost, createResponse().value, vi.fn());

    expect(withHost.headers).toMatchObject({
      "x-forwarded-host": "request.test:3000",
      "x-forwarded-proto": "https",
    });
    expect(withoutHost.headers).toMatchObject({
      "x-forwarded-host": "custom.test:4321",
      "x-forwarded-proto": "https",
    });
  });

  it.each(HTTP1_ONLY_HEADERS)("strips stored %s response headers", (header) => {
    fs.writeFileSync(certPath, "certificate");
    fs.writeFileSync(keyPath, "private-key");
    const { middleware } = configurePlugin({ certPath, keyPath });
    const response = createResponse();

    middleware({ headers: {} }, response.value, vi.fn());
    response.value.writeHead(200);

    expect(response.removeHeader).toHaveBeenCalledWith(header);
  });

  it("sanitizes the writeHead status and headers-object overload case-insensitively", () => {
    fs.writeFileSync(certPath, "certificate");
    fs.writeFileSync(keyPath, "private-key");
    const { middleware } = configurePlugin({ certPath, keyPath });
    const response = createResponse();

    middleware({ headers: {} }, response.value, vi.fn());
    response.value.writeHead(200, {
      ConNection: "close",
      "content-type": "text/plain",
    });

    expect(response.writeHead).toHaveBeenCalledWith(200, {
      "content-type": "text/plain",
    });
  });

  it("sanitizes the writeHead status-message and headers overload", () => {
    fs.writeFileSync(certPath, "certificate");
    fs.writeFileSync(keyPath, "private-key");
    const { middleware } = configurePlugin({ certPath, keyPath });
    const response = createResponse();

    middleware({ headers: {} }, response.value, vi.fn());
    response.value.writeHead(201, "Created", {
      upgrade: "websocket",
      "x-example": "preserved",
    });

    expect(response.writeHead).toHaveBeenCalledWith(201, "Created", {
      "x-example": "preserved",
    });
  });

  it("sanitizes flat-array writeHead headers and preserves allowed pairs", () => {
    fs.writeFileSync(certPath, "certificate");
    fs.writeFileSync(keyPath, "private-key");
    const { middleware } = configurePlugin({ certPath, keyPath });
    const response = createResponse();

    middleware({ headers: {} }, response.value, vi.fn());
    response.value.writeHead(200, ["Transfer-Encoding", "chunked", "content-type", "text/plain"]);

    expect(response.writeHead).toHaveBeenCalledWith(200, ["content-type", "text/plain"]);
  });

  it("logs derived Customer Account settings when the server starts listening", () => {
    fs.writeFileSync(certPath, "certificate");
    fs.writeFileSync(keyPath, "private-key");
    const { info, listening } = configurePlugin({ certPath, keyPath });

    expect(info).not.toHaveBeenCalled();
    listening();

    const message = String(info.mock.calls[0]?.[0]);
    expect(message).toContain("https://custom.test:4321/account/authorize");
    expect(message).toContain("JavaScript origin(s):        https://custom.test\n");
    expect(message).not.toContain("JavaScript origin(s):        https://custom.test:4321");
    expect(message).toContain("Logout URI:                  https://custom.test:4321");
  });

  it("logs the port the server actually bound instead of the configured port", () => {
    fs.writeFileSync(certPath, "certificate");
    fs.writeFileSync(keyPath, "private-key");
    const { info, listening, middleware } = configurePlugin(
      { certPath, keyPath },
      { port: 4_321, boundPort: 4_000 },
    );

    listening();

    const message = String(info.mock.calls[0]?.[0]);
    expect(message).toContain("https://custom.test:4000/account/authorize");
    expect(message).not.toContain("custom.test:4321");

    const request: { headers: Record<string, string | undefined> } = { headers: {} };
    middleware(request, createResponse().value, vi.fn());
    expect(request.headers["x-forwarded-host"]).toBe("custom.test:4000");
  });

  it("logs Customer Account settings once across Vite server instances", () => {
    fs.writeFileSync(certPath, "certificate");
    fs.writeFileSync(keyPath, "private-key");
    const first = configurePlugin({ certPath, keyPath }, { port: 4_322 });
    const second = configurePlugin({ certPath, keyPath }, { port: 4_322 });

    first.listening();
    second.listening();

    expect(first.info).toHaveBeenCalledOnce();
    expect(second.info).not.toHaveBeenCalled();
  });

  it("logs settings immediately when Vite has no HTTP server", () => {
    fs.writeFileSync(certPath, "certificate");
    fs.writeFileSync(keyPath, "private-key");
    const info = vi.fn();
    const plugin = localHttps({ enabled: true, certPath, keyPath });
    const configureServer = getHook(plugin.configureServer, "configureServer");

    configureServer({
      middlewares: { use: vi.fn() },
      config: { logger: { info } },
      httpServer: null,
    } as any);

    expect(info).toHaveBeenCalledOnce();
  });

  function configurePlugin(
    paths: { certPath: string; keyPath: string },
    options: { port?: number; boundPort?: number } = {},
  ) {
    let middleware:
      | ((request: any, response: ServerResponse, next: () => void) => void)
      | undefined;
    let listening: (() => void) | undefined;
    const info = vi.fn();
    const plugin = localHttps({
      enabled: true,
      host: "custom.test",
      port: options.port ?? 4_321,
      ...paths,
    });
    const configureServer = getHook(plugin.configureServer, "configureServer");

    configureServer({
      middlewares: {
        use(handler: typeof middleware) {
          middleware = handler;
        },
      },
      config: { logger: { info } },
      httpServer: {
        address: () => (options.boundPort ? { port: options.boundPort } : null),
        once(event: string, listener: () => void) {
          expect(event).toBe("listening");
          listening = listener;
        },
      },
    } as any);

    assert(middleware, "middleware is registered");
    assert(listening, "listening handler is registered");
    return { info, listening, middleware };
  }
});

describe("localHttpsDevServer", () => {
  beforeEach(() => {
    fsCalls.existsSync.mockClear();
    fsCalls.readFileSync.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns undefined without file-system access when disabled", () => {
    expect(localHttpsDevServer({ enabled: false })).toBeUndefined();
    expect(fsCalls.existsSync).not.toHaveBeenCalled();
    expect(fsCalls.readFileSync).not.toHaveBeenCalled();
  });

  it("returns absolute certificate paths when enabled", () => {
    const directory = fs.mkdtempSync(join(tmpdir(), "hydrogen-local-https-dev-server-"));
    const certPath = join(directory, "custom.test.pem");
    const keyPath = join(directory, "custom.test-key.pem");
    fs.writeFileSync(certPath, "certificate");
    fs.writeFileSync(keyPath, "private-key");

    try {
      expect(
        localHttpsDevServer({
          enabled: true,
          host: "custom.test",
          port: 4_321,
          certPath,
          keyPath,
        }),
      ).toEqual({
        host: "custom.test",
        port: 4_321,
        https: { cert: certPath, key: keyPath },
      });
    } finally {
      fs.rmSync(directory, { recursive: true, force: true });
    }
  });

  it("warns and returns undefined when a certificate is missing", () => {
    const warn = vi.spyOn(process, "emitWarning").mockImplementation(() => {});
    const certPath = join(tmpdir(), "missing-cert.pem");
    const keyPath = join(tmpdir(), "missing-key.pem");

    expect(
      localHttpsDevServer({ enabled: true, host: "custom.test", certPath, keyPath }),
    ).toBeUndefined();
    expect(warn).toHaveBeenCalledOnce();
    expect(String(warn.mock.calls[0]?.[0])).toContain(certPath);
    expect(String(warn.mock.calls[0]?.[0])).toContain(keyPath);
  });

  it("looks for default certificates in the Hydrogen home directory", () => {
    const warn = vi.spyOn(process, "emitWarning").mockImplementation(() => {});
    const host = `missing-${process.pid}.local.tryhydrogen.dev`;

    expect(localHttpsDevServer({ enabled: true, host })).toBeUndefined();

    const message = String(warn.mock.calls[0]?.[0]);
    expect(message).toContain(join(homedir(), ".shopify", "hydrogen", "certs", `${host}.pem`));
    expect(message).toContain(join(homedir(), ".shopify", "hydrogen", "certs", `${host}-key.pem`));
  });
});

function createResponse() {
  const writeHead = vi.fn(function (this: ServerResponse) {
    return this;
  });
  const removeHeader = vi.fn();
  const value = { writeHead, removeHeader } as unknown as ServerResponse;

  return { removeHeader, value, writeHead };
}
