import { existsSync, readFileSync } from "node:fs";
import type { OutgoingHttpHeader, OutgoingHttpHeaders, ServerResponse } from "node:http";
import { homedir } from "node:os";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import type { ConfigEnv, Plugin, ViteDevServer } from "vite";

import { confirmCertificateInstallation } from "./certificate-prompt";
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

/** Options for Hydrogen's local HTTPS Vite plugin. */
export type LocalHttpsOptions = {
  /** Enable trusted local HTTPS for the dev server. */
  enabled: boolean;
  /** Local hostname registered in Shopify admin. Defaults to `local.tryhydrogen.dev`. */
  host?: string;
  /** Local port registered in Shopify admin. Defaults to `5173`. */
  port?: number;
  /** Certificate file path. Defaults to Hydrogen's mkcert path under `~/.shopify/hydrogen/certs`. */
  certPath?: string | URL;
  /** Private key file path. Defaults to Hydrogen's mkcert path under `~/.shopify/hydrogen/certs`. */
  keyPath?: string | URL;
};

export type LocalHttpsPlugin = Plugin & {
  api: {
    /** Returns host, port, and TLS file paths for frameworks that terminate HTTPS outside Vite. */
    getDevServerConfig(): LocalHttpsDevServerConfig | undefined;
  };
};

export type LocalHttpsDevServerConfig = {
  host: string;
  port: number;
  https: {
    cert: string;
    key: string;
  };
};

/**
 * Configures Vite for trusted local HTTPS on Hydrogen's default development host.
 */
export function localHttps(options: LocalHttpsOptions): LocalHttpsPlugin {
  const settings = options.enabled ? resolveLocalHttpsSettings(options) : undefined;
  let certificateFiles: LocalHttpsCertificateFiles | undefined;

  const getCertificateFiles = () => {
    if (!settings) return;

    certificateFiles ??= readCertificateFiles(settings);
    return certificateFiles;
  };

  const getDevServerConfig = () => {
    if (!settings || !checkCertificateFiles(settings)) return;

    getCertificateFiles();

    return {
      host: settings.host,
      port: settings.port,
      https: {
        cert: settings.certPath,
        key: settings.keyPath,
      },
    };
  };

  return {
    name: "hydrogen-local-https",
    api: { getDevServerConfig },
    async config(_config: unknown, env: ConfigEnv) {
      if (settings && env.command === "serve" && !env.isPreview) {
        const certificatesAvailable = await ensureCertificateFiles(settings);
        if (!certificatesAvailable) return;
      } else if (settings && !checkCertificateFiles(settings)) {
        return;
      }

      const certificates = getCertificateFiles();
      if (!settings || !certificates) return;

      return {
        server: {
          allowedHosts: [settings.host],
          host: settings.host,
          port: settings.port,
          strictPort: true,
          https: {
            // Several framework dev servers fail when Vite negotiates HTTP/2.
            ALPNProtocols: ["http/1.1"],
            cert: certificates.cert,
            key: certificates.key,
          },
          hmr: {
            host: settings.host,
            protocol: "wss",
          },
        },
      };
    },
    configureServer(server) {
      if (!settings || !checkCertificateFiles(settings)) return;

      getCertificateFiles();
      configureLocalHttpsServer(server, settings);
    },
  };
}

export type ProvisionLocalHttpsOptions = Omit<LocalHttpsOptions, "enabled" | "port">;

/**
 * Downloads a pinned, checksum-verified mkcert release and generates the
 * trusted local certificate files when they do not exist yet. The Vite plugin
 * runs this automatically on `vite dev`; call it directly for frameworks that
 * read certificate paths before Vite starts or from setup scripts.
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

type LocalHttpsCertificateFiles = {
  cert: Buffer;
  key: Buffer;
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
  // prompt on first run, which hangs or fails on CI runners.
  if (isContinuousIntegration()) {
    return checkCertificateFiles(
      settings,
      "Automatic certificate provisioning is skipped in CI environments (the CI environment variable is set).",
    );
  }

  if (!(await confirmCertificateInstallation(settings.host))) {
    return checkCertificateFiles(
      settings,
      "Automatic certificate provisioning requires confirmation in an interactive terminal.",
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
    process.emitWarning(warning, { type: "HydrogenLocalHttpsWarning" });
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
    "  npx hydrogen certs install",
    "",
    "Or install and configure mkcert, then generate the certificate:",
    "  macOS: brew install mkcert",
    "  mkcert -install",
    `  mkdir -p ${certificateDirectories.map(shellQuote).join(" ")}`,
    `  mkcert -cert-file ${shellQuote(certPath)} -key-file ${shellQuote(keyPath)} ${shellQuote(host)}`,
  ].join("\n");
}

function readCertificateFiles(settings: LocalHttpsSettings): LocalHttpsCertificateFiles {
  return {
    cert: readCertificateFile(settings, "certificate", settings.certPath),
    key: readCertificateFile(settings, "private key", settings.keyPath),
  };
}

function readCertificateFile(settings: LocalHttpsSettings, label: string, path: string) {
  try {
    return readFileSync(path);
  } catch (error) {
    throw new Error(formatCertificateReadError(settings, label, path, error), { cause: error });
  }
}

function formatCertificateReadError(
  { certPath, host, keyPath }: LocalHttpsSettings,
  label: string,
  path: string,
  error: unknown,
) {
  const certificateDirectories = [...new Set([dirname(certPath), dirname(keyPath)])];
  const reason = error instanceof Error ? error.message : String(error);

  return [
    `Local HTTPS requires a readable ${label} file:`,
    `  ${path}`,
    `Reason: ${reason}`,
    "",
    "Expected certificate files:",
    `  Certificate: ${certPath}`,
    `  Private key: ${keyPath}`,
    "",
    "Install and configure mkcert, then generate the certificate:",
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
