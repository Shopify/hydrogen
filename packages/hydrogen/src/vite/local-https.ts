import { readFileSync } from "node:fs";
import type { OutgoingHttpHeader, OutgoingHttpHeaders, ServerResponse } from "node:http";
import { homedir } from "node:os";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import type { Plugin, ViteDevServer } from "vite";

import { CUSTOMER_ACCOUNT_AUTHORIZE_PATH } from "../customer-account/paths";

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
const loggedCustomerAccountSettings = new Set<string>();

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
    if (!settings) return;

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
    config() {
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
      if (!settings) return;

      getCertificateFiles();
      configureLocalHttpsServer(server, settings);
    },
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

  const logSettings = () => {
    const port = resolveBoundPort();
    const settingsKey = `${settings.host}:${port}`;
    if (loggedCustomerAccountSettings.has(settingsKey)) return;
    loggedCustomerAccountSettings.add(settingsKey);
    server.config.logger.info(formatCustomerAccountSettings({ host: settings.host, port }));
  };

  if (server.httpServer) {
    server.httpServer.once("listening", logSettings);
  } else {
    logSettings();
  }
}

function formatCustomerAccountSettings({ host, port }: Pick<LocalHttpsSettings, "host" | "port">) {
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
