import {
  createServer,
  type IncomingHttpHeaders,
  type RequestListener,
  type Server,
} from "node:http";

import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { Cache } from "../core/cache";
import { createShopifyRequestContext } from "../core/request-context";
import { assert } from "../core/test-utils";
import { gql } from "../graphql";
import { createStorefrontClient } from "./client";
import { StorefrontApiError } from "./errors";
import type { ClientType } from "./types";

const SHOP_QUERY = gql(`query { shop { name } }`);
const PRIVATE_TOKEN = "test-private-token";
const PUBLIC_TOKEN = "test-public-token";
const RESPONSE_BODY = JSON.stringify({ data: { shop: { name: "Test Shop" } } });

class MemoryCache {
  readonly store = new Map<string, unknown>();
  get(key: string) {
    return this.store.get(key);
  }
  set(key: string, value: unknown) {
    this.store.set(key, value);
  }
}

async function listen(handler: RequestListener) {
  const server = createServer(handler);
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  assert(address, "expected a listening server");
  if (typeof address === "string") throw new Error("expected a TCP listener");
  return { server, url: `http://127.0.0.1:${address.port}` };
}

async function close(server?: Server) {
  if (!server?.listening) return;
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
    server.closeAllConnections();
  });
}

describe("Storefront redirect handling with native fetch", () => {
  let originServer: Server;
  let destinationServer: Server;
  let originUrl: string;
  let destinationUrl: string;
  let responseStatus: number;
  let location: string;
  const originRequests: IncomingHttpHeaders[] = [];
  const destinationRequests: IncomingHttpHeaders[] = [];

  const destinationHandler: RequestListener = (request, response) => {
    destinationRequests.push(request.headers);
    request.resume();
    response.writeHead(200, { "content-type": "application/json" });
    response.end(RESPONSE_BODY);
  };

  beforeAll(async () => {
    const destination = await listen(destinationHandler);
    destinationServer = destination.server;
    // Different hostname as well as port, while keeping all traffic local.
    destinationUrl = destination.url.replace("127.0.0.1", "localhost");
    const origin = await listen((request, response) => {
      if (request.url === "/redirect-target") return destinationHandler(request, response);
      originRequests.push(request.headers);
      request.resume();
      response.writeHead(responseStatus, {
        "content-type": "application/json",
        "x-request-id": "redirect-request-id",
        ...(responseStatus === 200 ? {} : { location }),
      });
      response.end(RESPONSE_BODY);
    });
    originServer = origin.server;
    originUrl = origin.url;
  });

  afterAll(async () => {
    await Promise.all([close(originServer), close(destinationServer)]);
  });

  beforeEach(() => {
    originRequests.length = 0;
    destinationRequests.length = 0;
    responseStatus = 307;
    location = `${destinationUrl}/redirect-target`;
  });

  function createClient(type: ClientType, cache?: MemoryCache) {
    const requestContext = createShopifyRequestContext({
      request: new Request("https://storefront.example/cart", {
        headers: { cookie: "session=test-session" },
      }),
      i18n: { country: "US", language: "EN" },
      buyerIp: "127.0.0.1",
    });
    const config = { storeDomain: originUrl, cache };
    return type === "public"
      ? createStorefrontClient({
          type,
          requestContext,
          config: { ...config, publicStorefrontToken: PUBLIC_TOKEN },
        })
      : createStorefrontClient({
          type,
          requestContext,
          config: { ...config, privateStorefrontToken: PRIVATE_TOKEN },
        });
  }

  describe.each([false, true])("private client, caching=%s", (caching) => {
    it.each([301, 302, 303, 307, 308])(
      "rejects HTTP %i without sending credentials to the redirect host",
      async (status) => {
        responseStatus = status;
        const cache = new MemoryCache();
        const client = createClient("private", caching ? cache : undefined);
        const options = caching ? { cache: Cache.long() } : undefined;

        const result = await client.graphql(SHOP_QUERY, options).catch((error: unknown) => error);

        expect(originRequests).toHaveLength(1);
        expect(originRequests[0]["shopify-storefront-private-token"]).toBe(PRIVATE_TOKEN);
        expect(originRequests[0].cookie).toContain("session=test-session");
        expect(destinationRequests).toHaveLength(0);
        expect(result).toBeInstanceOf(StorefrontApiError);
        expect(result).toMatchObject({ status, requestId: "redirect-request-id" });
        expect(cache.store.size).toBe(0);
        await expect(client.graphql(SHOP_QUERY, options)).rejects.toMatchObject({ status });
        expect(originRequests).toHaveLength(2);
        expect(destinationRequests).toHaveLength(0);
      },
    );

    it("still returns successful responses and caches only when requested", async () => {
      responseStatus = 200;
      const cache = new MemoryCache();
      const client = createClient("private", caching ? cache : undefined);
      const options = caching ? { cache: Cache.long() } : undefined;

      await expect(client.graphql(SHOP_QUERY, options)).resolves.toMatchObject({
        data: { shop: { name: "Test Shop" } },
      });
      await expect(client.graphql(SHOP_QUERY, options)).resolves.toMatchObject({
        data: { shop: { name: "Test Shop" } },
      });
      expect(originRequests).toHaveLength(caching ? 1 : 2);
      expect(cache.store.size).toBe(caching ? 1 : 0);
      expect(destinationRequests).toHaveLength(0);
    });
  });

  it.each(["public", "private_no_buyer_context"] as const)(
    "also blocks redirects for %s clients",
    async (type) => {
      const result = await createClient(type)
        .graphql(SHOP_QUERY)
        .catch((error: unknown) => error);

      expect(originRequests).toHaveLength(1);
      expect(
        originRequests[0][
          type === "public"
            ? "x-shopify-storefront-access-token"
            : "shopify-storefront-private-token"
        ],
      ).toBe(type === "public" ? PUBLIC_TOKEN : PRIVATE_TOKEN);
      expect(destinationRequests).toHaveLength(0);
      expect(result).toBeInstanceOf(StorefrontApiError);
      expect(result).toMatchObject({ status: 307 });
    },
  );

  it.each([302, 307])("also rejects same-origin HTTP %i redirects", async (status) => {
    responseStatus = status;
    location = "/redirect-target";
    const result = await createClient("private")
      .graphql(SHOP_QUERY)
      .catch((error: unknown) => error);

    expect(destinationRequests).toHaveLength(0);
    expect(result).toBeInstanceOf(StorefrontApiError);
    expect(result).toMatchObject({ status });
  });
});
