import { createCookie } from "@remix-run/cookie";
import { createCookieSessionStorage } from "@remix-run/session/cookie-storage";
import type { WritableCustomerSessionManager } from "@shopify/hydrogen/customer-account";

const sessionStorage = createCookieSessionStorage();

/**
 * Signed cookie session. The cookie is HttpOnly and tamper-proof, but signed,
 * not encrypted: whoever holds the cookie can read its contents.
 */
export async function createRequestSessionManager(
  request: Request,
  secret: string,
): Promise<WritableCustomerSessionManager> {
  const cookie = createCookie("__Host-session", {
    httpOnly: true,
    secure: true,
    sameSite: "Lax",
    path: "/",
    secrets: [secret],
  });
  const session = await sessionStorage.read(await cookie.parse(request.headers.get("cookie")));
  const origin = new URL(request.url).origin;

  return {
    getSessionOrigin: () => origin,
    getSessionItem: (key) => session.get(key),
    setSessionItem: (key, value) => session.set(key, value),
    removeSessionItem: (key) => session.unset(key),
    async commit() {
      if (session.dirty && session.size === 0) session.destroy();
      const value = await sessionStorage.save(session);
      if (value === null) return;
      return { "set-cookie": await cookie.serialize(value, value === "" ? { maxAge: 0 } : {}) };
    },
  };
}

/** In-memory session for requests without Customer Accounts configured. */
export function createEphemeralSessionManager(request: Request): WritableCustomerSessionManager {
  const data = new Map<string, unknown>();
  const origin = new URL(request.url).origin;

  return {
    getSessionOrigin: () => origin,
    getSessionItem: (key) => data.get(key),
    setSessionItem: (key, value) => {
      data.set(key, value);
    },
    removeSessionItem: (key) => {
      data.delete(key);
    },
  };
}
