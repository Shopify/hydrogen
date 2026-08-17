import { existsSync, readFileSync } from "node:fs";
import type { OutgoingHttpHeader, OutgoingHttpHeaders, ServerResponse } from "node:http";
import { homedir } from "node:os";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import type { ConfigEnv, Plugin, ViteDevServer } from "vite";

import {
  configureCustomerAccountUrls,
  isContinuousIntegration,
  resolveCustomerAccountUrls,
} from "./customer-account";
import { provisionCertificates } from "./mkcert";

export const LOCAL_HTTPS_DEFAULTS = {
  host: "local.tryhydrogen.dev",
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
const emittedMissingCertificateWarnings = new Set<string>();
const startedCustomerAccountSetups = new Set<string>();

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
    async config(_config: unknown, env: ConfigEnv) {
      if (settings && env.command === "serve" && !env.isPreview) {
        certificatesAvailable = await ensureCertificateFiles(settings);
      }

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

export type ProvisionLocalHttpsOptions = Omit<LocalHttpsOptions, "enabled" | "port">;

/**
 * Downloads a pinned, checksum-verified mkcert release and generates the
 * trusted local certificate files when they do not exist yet. The Vite plugin
 * runs this automatically on `vite dev`; call it directly for frameworks that
 * read certificate paths before Vite starts (Nuxt, SolidStart) or from setup
 * scripts such as `hydrogen setup https`.
 */
export async function provisionLocalHttps(options: ProvisionLocalHttpsOptions = {}) {
  const settings = resolveLocalHttpsSettings({ enabled: true, ...options });

  if (!certificateFilesExist(settings)) {
    await provisionCertificates(settings);
  }

  return {
    host: settings.host,
    certPath: settings.certPath,
    keyPath: settings.keyPath,
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

function certificateFilesExist(settings: LocalHttpsSettings) {
  return existsSync(settings.certPath) && existsSync(settings.keyPath);
}

async function ensureCertificateFiles(settings: LocalHttpsSettings): Promise<boolean> {
  if (certificateFilesExist(settings)) return true;

  // Installing the mkcert certificate authority needs an interactive trust
  // prompt on first run (sudo on macOS/Linux, a GUI dialog on Windows), which
  // hangs or fails on CI runners. Explicit `hydrogen setup https` runs remain
  // available there.
  if (isContinuousIntegration()) {
    return checkCertificateFiles(
      settings,
      "Automatic certificate provisioning is skipped in CI environments (the CI environment variable is set).",
    );
  }

  try {
    await provisionCertificates(settings);
    return true;
  } catch (error) {
    return checkCertificateFiles(
      settings,
      `Automatic certificate provisioning failed:\n  ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

function checkCertificateFiles(settings: LocalHttpsSettings, provisioningNote?: string) {
  const missingPaths = [settings.certPath, settings.keyPath].filter((path) => !existsSync(path));
  if (missingPaths.length === 0) return true;

  const warning = formatMissingCertificateWarning(settings, missingPaths, provisioningNote);
  if (!emittedMissingCertificateWarnings.has(warning)) {
    emittedMissingCertificateWarnings.add(warning);
    process.emitWarning(warning, {
      type: "HydrogenLocalHttpsWarning",
    });
  }
  return false;
}

function formatMissingCertificateWarning(
  { certPath, host, keyPath }: LocalHttpsSettings,
  missingPaths: string[],
  provisioningNote?: string,
) {
  const certificateDirectories = [...new Set([dirname(certPath), dirname(keyPath)])];
  const provisioningFailure = provisioningNote === undefined ? [] : ["", provisioningNote];

  return [
    "Local HTTPS is disabled because certificate files are missing:",
    ...missingPaths.map((path) => `  ${path}`),
    ...provisioningFailure,
    "",
    "Expected certificate files:",
    `  Certificate: ${certPath}`,
    `  Private key: ${keyPath}`,
    "",
    "Run the automatic setup:",
    "  npx hydrogen setup https",
    "",
    "Or install and configure mkcert, then generate the certificate:",
    "  macOS: brew install mkcert",
    "  mkcert -install",
    `  mkdir -p ${certificateDirectories.map(shellQuote).join(" ")}`,
    `  mkcert -cert-file ${shellQuote(certPath)} -key-file ${shellQuote(keyPath)} ${shellQuote(host)}`,
  ].join("\n");
}

function shellQuote(value: string) {
  return `'${value.replaceAll("'", `'\\''`)}'`;
}

function configureLocalHttpsServer(server: ViteDevServer, settings: LocalHttpsSettings) {
  // The configured port is only a fallback: frameworks that own the listener
  // (or auto-incremented ports) can bind somewhere else, and the Customer
  // Account URLs registered in admin must match the port actually served.
  const resolveBoundPort = () => {
    const address = server.httpServer?.address();
    return address && typeof address === "object" ? address.port : settings.port;
  };

  server.middlewares.use((request, response, next) => {
    request.headers["x-forwarded-host"] ??=
      request.headers.host ?? `${settings.host}:${resolveBoundPort()}`;
    request.headers["x-forwarded-proto"] ??= "https";
    stripHttp1OnlyResponseHeaders(response);
    next();
  });

  const configureCustomerAccounts = () => {
    const port = resolveBoundPort();
    const settingsKey = `${server.config.root}:${settings.host}:${port}`;
    if (startedCustomerAccountSetups.has(settingsKey)) return;
    startedCustomerAccountSetups.add(settingsKey);

    void configureCustomerAccountUrls({
      logger: server.config.logger,
      root: server.config.root,
      urls: resolveCustomerAccountUrls(settings.host, port),
    });
  };

  if (server.httpServer) {
    server.httpServer.once("listening", configureCustomerAccounts);
  } else {
    configureCustomerAccounts();
  }
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
