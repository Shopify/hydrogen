import { existsSync, readFileSync } from "node:fs";
import type { OutgoingHttpHeader, OutgoingHttpHeaders, ServerResponse } from "node:http";
import { homedir } from "node:os";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import type { Plugin, ViteDevServer } from "vite";

export const LOCAL_HTTPS_DEFAULTS = {
  host: "localtest.me",
  port: 5_173,
} as const;

const HEADER_PAIR_SIZE = 2;
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
// Keep this synchronized with CUSTOMER_ACCOUNT_AUTHORIZE_PATH in customer-account/session.ts.
const CUSTOMER_ACCOUNT_AUTHORIZE_PATH = "/account/authorize";

export type LocalHttpsOptions = {
  enabled: boolean;
  host?: string;
  port?: number;
  certPath?: string | URL;
  keyPath?: string | URL;
};

export function localHttps(options: LocalHttpsOptions): Plugin {
  const settings = options.enabled ? resolveLocalHttpsSettings(options) : undefined;
  let certificatesAvailable: boolean | undefined;

  const isActive = () => {
    if (!settings) return false;
    if (certificatesAvailable === undefined) {
      certificatesAvailable = checkCertificateFiles(settings);
    }
    return certificatesAvailable;
  };

  return {
    name: "hydrogen-local-https",
    config() {
      if (!isActive() || !settings) return;

      return {
        server: {
          allowedHosts: [settings.host],
          host: settings.host,
          port: settings.port,
          strictPort: true,
          https: {
            // Several framework dev servers fail when Vite negotiates HTTP/2.
            ALPNProtocols: ["http/1.1"],
            cert: readFileSync(settings.certPath),
            key: readFileSync(settings.keyPath),
          },
          hmr: {
            host: settings.host,
            protocol: "wss",
          },
        },
      };
    },
    configureServer(server) {
      if (!isActive() || !settings) return;

      configureLocalHttpsServer(server, settings);
    },
  };
}

export function localHttpsDevServer(options: LocalHttpsOptions) {
  if (!options.enabled) return;

  const settings = resolveLocalHttpsSettings(options);
  if (!checkCertificateFiles(settings)) return;

  return {
    host: settings.host,
    port: settings.port,
    https: {
      cert: settings.certPath,
      key: settings.keyPath,
    },
  };
}

type LocalHttpsSettings = {
  host: string;
  port: number;
  certPath: string;
  keyPath: string;
};

function resolveLocalHttpsSettings(options: LocalHttpsOptions): LocalHttpsSettings {
  const host = options.host ?? LOCAL_HTTPS_DEFAULTS.host;
  const certificateDirectory = join(homedir(), ".shopify", "hydrogen", "certs");

  return {
    host,
    port: options.port ?? LOCAL_HTTPS_DEFAULTS.port,
    certPath: resolveCertificatePath(options.certPath ?? join(certificateDirectory, `${host}.pem`)),
    keyPath: resolveCertificatePath(
      options.keyPath ?? join(certificateDirectory, `${host}-key.pem`),
    ),
  };
}

function resolveCertificatePath(path: string | URL) {
  if (path instanceof URL) return fileURLToPath(path);
  if (path === "~") return homedir();
  if (path.startsWith("~/")) return resolve(homedir(), path.slice(2));
  return isAbsolute(path) ? path : resolve(path);
}

function checkCertificateFiles(settings: LocalHttpsSettings) {
  const missingPaths = [settings.certPath, settings.keyPath].filter((path) => !existsSync(path));
  if (missingPaths.length === 0) return true;

  process.emitWarning(formatMissingCertificateWarning(settings, missingPaths), {
    type: "HydrogenLocalHttpsWarning",
  });
  return false;
}

function formatMissingCertificateWarning(
  { certPath, host, keyPath }: LocalHttpsSettings,
  missingPaths: string[],
) {
  const certDirectory = dirname(certPath);
  const keyDirectory = dirname(keyPath);

  return [
    "Local HTTPS is disabled because certificate files are missing:",
    ...missingPaths.map((path) => `  ${path}`),
    "",
    "Expected certificate files:",
    `  Certificate: ${certPath}`,
    `  Private key: ${keyPath}`,
    "",
    "Install and configure mkcert, then generate the certificate:",
    "  macOS: brew install mkcert",
    "  mkcert -install",
    `  mkdir -p ${shellQuote(certDirectory)} ${shellQuote(keyDirectory)}`,
    `  mkcert -cert-file ${shellQuote(certPath)} -key-file ${shellQuote(keyPath)} ${shellQuote(host)}`,
  ].join("\n");
}

function shellQuote(value: string) {
  return `'${value.replaceAll("'", `'\\''`)}'`;
}

function configureLocalHttpsServer(server: ViteDevServer, settings: LocalHttpsSettings) {
  server.middlewares.use((request, response, next) => {
    request.headers["x-forwarded-host"] ??=
      request.headers.host ?? `${settings.host}:${settings.port}`;
    request.headers["x-forwarded-proto"] ??= "https";
    stripHttp1OnlyResponseHeaders(response);
    next();
  });

  const logSettings = () => {
    server.config.logger.info(formatCustomerAccountSettings(settings));
  };

  if (server.httpServer) {
    server.httpServer.once("listening", logSettings);
  } else {
    logSettings();
  }
}

function formatCustomerAccountSettings({ host, port }: LocalHttpsSettings) {
  const origin = `https://${host}`;
  const portfulOrigin = `${origin}:${port}`;

  return [
    "",
    "Customer Account API — make sure these values are configured for your storefront:",
    "",
    `  Callback URI(s) (required):  ${portfulOrigin}${CUSTOMER_ACCOUNT_AUTHORIZE_PATH}`,
    // Shopify's server-side validation rejects JavaScript origins containing a port.
    `  JavaScript origin(s):        ${origin}`,
    `  Logout URI:                  ${portfulOrigin}`,
    "",
  ].join("\n");
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
