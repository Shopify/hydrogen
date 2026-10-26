import { generateNonce } from "./nonce.ts";

export function createContentSecurityPolicy(storeDomain: string) {
  const nonce = generateNonce();
  const isDevelopment = process.env.NODE_ENV === "development";
  const nonceSource = `'nonce-${nonce}'`;
  const localHttp = isDevelopment ? ["http://localhost:*"] : [];
  const localConnections = isDevelopment
    ? ["http://localhost:*", "ws://localhost:*", "ws://127.0.0.1:*", "ws://*.tryhydrogen.dev:*"]
    : [];

  const directives: Array<[string, string[]]> = [
    ["base-uri", ["'self'"]],
    ["default-src", ["'self'", "https://cdn.shopify.com", "https://shopify.com", ...localHttp]],
    ["frame-ancestors", ["'none'"]],
    [
      "script-src",
      ["'self'", nonceSource, "https://cdn.shopify.com", "https://shopify.com", ...localHttp],
    ],
    ["style-src", ["'self'", "'unsafe-inline'", "https://cdn.shopify.com", ...localHttp]],
    [
      "connect-src",
      [
        "'self'",
        "https://cdn.shopify.com",
        "https://monorail-edge.shopifysvc.com",
        `https://${storeDomain}`,
        ...localConnections,
      ],
    ],
  ];

  const header = directives.map(([name, sources]) => `${name} ${sources.join(" ")}`).join("; ");
  return { nonce, header };
}
