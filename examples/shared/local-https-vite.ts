import { existsSync, readFileSync } from "node:fs";
import type { OutgoingHttpHeader, OutgoingHttpHeaders, ServerResponse } from "node:http";
import { fileURLToPath } from "node:url";

const LOCAL_HTTPS_ENV_VAR = "VITE_LOCAL_HTTPS";
const LOCAL_HTTPS_HOST = "localtest.me";
const LOCAL_HTTPS_PORT = 5_173;
const HEADER_PAIR_SIZE = 2;
const CERTIFICATE_DIR = new URL("../../.cert/", import.meta.url);
const HTTP1_ONLY_RESPONSE_HEADERS = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
]);

type LocalHttpsOptions = {
  host?: string;
  port?: number;
};

type LocalHttpsSettings = Required<LocalHttpsOptions> & {
  certPath: URL;
  keyPath: URL;
};

type LocalHttpsDevServer = {
  middlewares: {
    use(
      handler: (
        request: { headers: Record<string, string | string[] | undefined> },
        response: ServerResponse,
        next: () => void,
      ) => void,
    ): void;
  };
};

export function localHttpsPlugin(options: LocalHttpsOptions = {}) {
  const settings = resolveLocalHttpsSettings(options);

  return {
    name: "local-https",
    configureServer(server: LocalHttpsDevServer) {
      if (!isLocalHttpsEnabled()) return;

      server.middlewares.use((request, response, next) => {
        request.headers["x-forwarded-host"] ??=
          request.headers.host ?? `${settings.host}:${settings.port}`;
        request.headers["x-forwarded-proto"] ??= "https";
        stripHttp1OnlyResponseHeaders(response);
        next();
      });
    },
  };
}

export function localHttpsServerConfig(options: LocalHttpsOptions = {}) {
  if (!isLocalHttpsEnabled()) return;

  const settings = resolveLocalHttpsSettings(options);
  assertLocalHttpsCertificateFiles(settings);

  return {
    allowedHosts: [settings.host],
    host: settings.host,
    port: settings.port,
    strictPort: true,
    https: {
      ALPNProtocols: ["http/1.1"],
      cert: readFileSync(settings.certPath),
      key: readFileSync(settings.keyPath),
    },
    hmr: {
      host: settings.host,
      protocol: "wss" as const,
    },
  };
}

export function localHttpsDevServerConfig(options: LocalHttpsOptions = {}) {
  if (!isLocalHttpsEnabled()) return;

  const settings = resolveLocalHttpsSettings(options);
  assertLocalHttpsCertificateFiles(settings);

  return {
    host: settings.host,
    port: settings.port,
    https: {
      cert: fileURLToPath(settings.certPath),
      key: fileURLToPath(settings.keyPath),
    },
  };
}

function isLocalHttpsEnabled() {
  return process.env[LOCAL_HTTPS_ENV_VAR] === "1";
}

function resolveLocalHttpsSettings(options: LocalHttpsOptions): LocalHttpsSettings {
  const host = options.host ?? LOCAL_HTTPS_HOST;

  return {
    host,
    port: options.port ?? LOCAL_HTTPS_PORT,
    certPath: new URL(`${host}.pem`, CERTIFICATE_DIR),
    keyPath: new URL(`${host}-key.pem`, CERTIFICATE_DIR),
  };
}

function stripHttp1OnlyResponseHeaders(response: ServerResponse) {
  const originalWriteHead = response.writeHead.bind(response);

  response.writeHead = (
    statusCode: number,
    statusMessageOrHeaders?: string | OutgoingHttpHeaders | OutgoingHttpHeader[],
    headers?: OutgoingHttpHeaders | OutgoingHttpHeader[],
  ) => {
    removeStoredHttp1OnlyHeaders(response);

    if (typeof statusMessageOrHeaders === "string") {
      return originalWriteHead(
        statusCode,
        statusMessageOrHeaders,
        sanitizeWriteHeadHeaders(headers),
      );
    }

    return originalWriteHead(statusCode, sanitizeWriteHeadHeaders(statusMessageOrHeaders));
  };
}

function removeStoredHttp1OnlyHeaders(response: ServerResponse) {
  for (const header of HTTP1_ONLY_RESPONSE_HEADERS) {
    response.removeHeader(header);
  }
}

function sanitizeWriteHeadHeaders(headers: OutgoingHttpHeaders | OutgoingHttpHeader[] | undefined) {
  if (Array.isArray(headers)) return sanitizeHeaderArray(headers);
  if (headers) return sanitizeHeaderObject(headers);
  return headers;
}

function sanitizeHeaderObject(headers: OutgoingHttpHeaders) {
  const sanitizedHeaders: OutgoingHttpHeaders = {};

  for (const [name, value] of Object.entries(headers)) {
    if (!isHttp1OnlyHeader(name)) sanitizedHeaders[name] = value;
  }

  return sanitizedHeaders;
}

function sanitizeHeaderArray(headers: OutgoingHttpHeader[]) {
  const sanitizedHeaders: OutgoingHttpHeader[] = [];

  for (let index = 0; index < headers.length; index += HEADER_PAIR_SIZE) {
    const name = headers[index];
    const value = headers[index + 1];
    if (typeof name === "string" && isHttp1OnlyHeader(name)) continue;

    sanitizedHeaders.push(name);
    if (value !== undefined) sanitizedHeaders.push(value);
  }

  return sanitizedHeaders;
}

function isHttp1OnlyHeader(name: string) {
  return HTTP1_ONLY_RESPONSE_HEADERS.has(name.toLowerCase());
}

function assertLocalHttpsCertificateFiles({ certPath, host, keyPath }: LocalHttpsSettings) {
  if (existsSync(certPath) && existsSync(keyPath)) return;

  throw new Error(
    [
      `Missing ${host} HTTPS certificates.`,
      "Run this from the repository root:",
      "pnpm https:setup",
    ].join("\n"),
  );
}
