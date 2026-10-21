import { readFileSync } from "node:fs";
import * as http from "node:http";
import * as https from "node:https";
import { parseArgs } from "node:util";

import { LOCAL_HTTPS_DEFAULTS, provisionLocalHttps } from "@shopify/hydrogen/vite";
import { createRequestListener, type FetchHandler } from "remix/node-fetch-server";

import { assets, getDocumentAssets } from "./app/assets.ts";
import { readEnv } from "./app/env.ts";
import { createStorefrontCache } from "./app/lib/storefront.ts";
import { createApp } from "./app/router.ts";

const isHmr = process.env.REMIX_NODE_HMR === "1";
// Customer Account OAuth needs HTTPS: `pnpm dev:https` serves the trusted local certificate.
const isLocalHttps = process.env.npm_lifecycle_event === "dev:https";

// Fail before listening when configuration is missing.
const env = readEnv();
const cache = createStorefrontCache();
const documentAssets = await getDocumentAssets();

const handler: FetchHandler = async (request, client) => {
  try {
    const app = createApp({ env, cache, buyerIp: client.address }, documentAssets);
    return await app.fetch(request);
  } catch (error) {
    if (!(request.signal.aborted && error === request.signal.reason)) console.error(error);
    return new Response("An unexpected error occurred", { status: 500 });
  }
};

const listener = createRequestListener(handler, {
  // Behind a proxy that terminates TLS, such as a tunnel, trusted `X-Forwarded-*` headers
  // give the public origin (Customer Account OAuth needs `https:`) and the buyer's address.
  // Only enable this when every request comes through a proxy that overwrites them.
  trustProxy: isHmr || process.env.TRUST_PROXY === "1",
});

const { values: args } = parseArgs({ options: { port: { type: "string" } }, strict: false });
const hmrProxyPort = process.env.HMR_PROXY_PORT ? Number(process.env.HMR_PROXY_PORT) : null;

let server: http.Server;
let host: string | undefined;
let port: number;
let origin: string;

if (isLocalHttps) {
  const certificate = await provisionLocalHttps();
  host = certificate.host;
  port = LOCAL_HTTPS_DEFAULTS.port;
  server = https.createServer(
    { cert: readFileSync(certificate.certPath), key: readFileSync(certificate.keyPath) },
    listener,
  );
  origin = `https://${host}:${port}`;
} else {
  port = Number(args.port ?? process.env.PORT ?? 44100);
  server = http.createServer(listener);
  origin = `http://localhost:${hmrProxyPort ?? port}`;
}

server.listen(port, host, () => {
  if (isHmr) {
    void import("remix/node-hmr/runtime").then((nodeHmr) => nodeHmr.emitServerReady());
  }
  console.log(`Server listening on ${origin}`);
});

let shuttingDown = false;

function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  server.close(() => {
    void assets.close().finally(() => process.exit(0));
  });
  server.closeAllConnections();
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
