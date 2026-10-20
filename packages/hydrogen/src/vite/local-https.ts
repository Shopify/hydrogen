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

/**
 * Default host, `local.tryhydrogen.dev`, and port, `5173`, for local HTTPS. Pass the values to frameworks that set their own dev server host and port, such as Astro.
 *
 * @publicDocs
 */
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

/** Switch, host, port, and certificate files for local HTTPS. */
export type LocalHttpsOptions = {
  /** Turns on local HTTPS for the dev server. When `false`, the plugin leaves the Vite config unchanged. */
  enabled: boolean;
  /** Hostname for the dev server and the Customer Account API URLs. Defaults to `local.tryhydrogen.dev`. */
  host?: string;
  /** Port for the dev server. Vite exits when another process uses the port. Defaults to `5173`. */
  port?: number;
  /** Path to the certificate file. Defaults to `~/.shopify/hydrogen/certs/<host>.pem`. A leading `~/` points to your home directory, and a relative path starts from the current working directory. */
  certPath?: string | URL;
  /** Path to the private key file. Defaults to `~/.shopify/hydrogen/certs/<host>-key.pem`. Accepts the same path forms as `certPath`. */
  keyPath?: string | URL;
};

/** The local HTTPS Vite plugin, with an API for frameworks that start their own HTTPS server. */
export type LocalHttpsPlugin = Plugin & LocalHttpsPluginExtension;

/** The API that the local HTTPS Vite plugin adds to the Vite plugin object. */
interface LocalHttpsPluginExtension {
  /** Methods for frameworks that start their own HTTPS server. */
  api: LocalHttpsPluginApi;
}

/** Methods for frameworks that start their own HTTPS server. */
interface LocalHttpsPluginApi {
  /**
   * Returns the host, port, and certificate paths for frameworks that serve HTTPS outside Vite, such as Nuxt.
   *
   * Returns `undefined` when `enabled` is `false` or a certificate file is missing.
   */
  getDevServerConfig(): LocalHttpsDevServerConfig | undefined;
}

/** Host, port, and certificate file paths for serving local HTTPS outside Vite. */
export type LocalHttpsDevServerConfig = {
  /** Local hostname that the dev server serves, such as `local.tryhydrogen.dev`. */
  host: string;
  /** Port for the dev server. */
  port: number;
  /** Absolute paths to the certificate file and the private key file. */
  https: {
    cert: string;
    key: string;
  };
};

/**
 * Serves your Vite dev server over trusted HTTPS on a fixed host and port, and adds the dev server URLs to your Customer Account API settings.
 * Vite exits when another process uses the port. The dev server speaks HTTP/1.1 only.
 *
 * When `vite dev` starts without certificate files, the plugin asks for permission in the terminal, then creates the files. The plugin skips the prompt without an interactive terminal and in CI. Hydrogen treats any `CI` environment variable value other than an empty string, `false`, or `0` as CI. While certificate files are missing, the plugin prints a warning and leaves HTTPS off.
 *
 * After the dev server starts, the plugin runs Shopify CLI to update your Customer Account API settings with the dev server URLs. The update needs a Shopify CLI that includes `@shopify/cli-hydrogen` 13.0.4 or later. When the project has no linked Hydrogen storefront, Shopify CLI asks you to link one first. When Shopify CLI is missing or outdated, or the update fails, the plugin prints the URLs to enter by hand and the dev server keeps running. In CI, the plugin prints the URLs and skips Shopify CLI.
 *
 * @param options Switch, host, port, and certificate paths for local HTTPS.
 * @returns A Vite plugin. Its `api.getDevServerConfig()` method returns the HTTPS settings for frameworks that serve HTTPS outside Vite.
 * @publicDocs
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

/** Host and certificate paths for provisionLocalHttps. */
export type ProvisionLocalHttpsOptions = Omit<LocalHttpsOptions, "enabled" | "port">;

/**
 * Creates trusted certificate files for local HTTPS. Call the function from a setup script, or
 * before you start a framework that reads certificate paths when its config loads, such as Nuxt.
 *
 * When both files exist, the function returns their paths and changes nothing. Otherwise, the
 * function downloads a pinned, checksum-verified mkcert release, adds the mkcert certificate
 * authority to your system trust store, and creates the certificate and private key. mkcert can
 * ask for your password.
 *
 * @param options Host and certificate paths. Each option has a Hydrogen default.
 * @returns The host and the absolute paths to the certificate and the private key.
 * @publicDocs
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
