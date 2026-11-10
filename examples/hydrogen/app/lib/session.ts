import type { WritableCustomerSessionManager } from "@shopify/hydrogen/customer-account";
import { createCookieSessionStorage, type SessionStorage, type Session } from "react-router";

/**
 * This is a custom session implementation for your Hydrogen shop.
 * Feel free to customize it to your needs, add helper methods, or
 * swap out the cookie-based implementation with something else!
 */
export class AppSession implements WritableCustomerSessionManager {
  public isPending = false;

  #sessionStorage;
  #session;
  #origin;

  constructor(sessionStorage: SessionStorage, session: Session, origin: string) {
    this.#sessionStorage = sessionStorage;
    this.#session = session;
    this.#origin = origin;
  }

  static async init(request: Request, secrets: string[]) {
    const storage = createCookieSessionStorage({
      cookie: {
        name: "session",
        httpOnly: true,
        path: "/",
        sameSite: "lax",
        secrets,
      },
    });

    const session = await storage
      .getSession(request.headers.get("Cookie"))
      .catch(() => storage.getSession());

    return new this(storage, session, new URL(request.url).origin);
  }

  getSessionOrigin() {
    return this.#origin;
  }

  getSessionItem(key: string) {
    return this.#session.get(key);
  }

  setSessionItem(key: string, value: unknown) {
    this.isPending = true;
    this.#session.set(key, value);
  }

  removeSessionItem(key: string) {
    this.isPending = true;
    this.#session.unset(key);
  }

  get has() {
    return this.#session.has;
  }

  get get() {
    return this.#session.get;
  }

  get flash() {
    return this.#session.flash;
  }

  get unset() {
    this.isPending = true;
    return this.#session.unset;
  }

  get set() {
    this.isPending = true;
    return this.#session.set;
  }

  destroy() {
    return this.#sessionStorage.destroySession(this.#session);
  }

  async commit() {
    this.isPending = false;
    const headers = new Headers();
    headers.append("Set-Cookie", await this.#sessionStorage.commitSession(this.#session));
    return headers;
  }
}
