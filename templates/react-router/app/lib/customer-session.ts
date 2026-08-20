export const CUSTOMER_SESSION_COOKIE_NAME = "__Host-hydrogen_customer_session";
const COOKIE_VERSION = "v1";
const AES_GCM_ALGORITHM = "AES-GCM";
const AES_GCM_IV_LENGTH_IN_BYTES = 12;
const SECRET_MIN_LENGTH = 32;
const MAX_COOKIE_LENGTH_IN_BYTES = 4_096;
const MAX_AGE_IN_SECONDS = 60 * 60 * 24 * 7;
const MAX_AGE_IN_MILLISECONDS = MAX_AGE_IN_SECONDS * 1_000;
const EXPIRED_COOKIE_DATE = "Thu, 01 Jan 1970 00:00:00 GMT";

type SessionRecord = Record<string, unknown>;
type SessionPayload = {
  data: SessionRecord;
  expiresAt: number;
  issuedAt: number;
};

export class EncryptedCookieCustomerSession {
  #data: SessionRecord;
  #issuedAt: number;
  #origin: string;
  #secret: string;
  #isDirty = false;

  private constructor(data: SessionRecord, issuedAt: number, origin: string, secret: string) {
    this.#data = data;
    this.#issuedAt = issuedAt;
    this.#origin = origin;
    this.#secret = secret;
  }

  static async init(request: Request, secret: string) {
    assertSessionSecret(secret);
    const cookieValue = getCookieValue(request.headers.get("cookie"), CUSTOMER_SESSION_COOKIE_NAME);
    const payload =
      cookieValue && cookieFitsBrowserLimit(cookieValue)
        ? await decryptSessionCookie(cookieValue, secret)
        : undefined;
    const session = new EncryptedCookieCustomerSession(
      payload?.data ?? {},
      payload?.issuedAt ?? Date.now(),
      new URL(request.url).origin,
      secret,
    );
    if (cookieValue && !payload) session.#isDirty = true;
    return session;
  }

  getSessionItem(key: string) {
    return this.#data[key];
  }

  getSessionOrigin() {
    return this.#origin;
  }

  setSessionItem(key: string, value: unknown) {
    this.#data[key] = value;
    this.#isDirty = true;
  }

  removeSessionItem(key: string) {
    delete this.#data[key];
    this.#isDirty = true;
  }

  async commit() {
    if (!this.#isDirty) return;

    const headers = new Headers();
    const cookie = hasSessionData(this.#data)
      ? serializeSessionCookie(
          await encryptSessionCookie(
            createSessionPayload(this.#data, this.#issuedAt),
            this.#secret,
          ),
        )
      : serializeExpiredSessionCookie();
    assertCookieFitsBrowserLimit(cookie);
    headers.set("Set-Cookie", cookie);
    this.#isDirty = false;
    return headers;
  }
}

async function encryptSessionCookie(payload: SessionPayload, secret: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(AES_GCM_IV_LENGTH_IN_BYTES));
  const plaintext = new TextEncoder().encode(JSON.stringify(payload));
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: AES_GCM_ALGORITHM, iv },
      await deriveKey(secret),
      plaintext,
    ),
  );

  return [COOKIE_VERSION, base64UrlEncode(iv), base64UrlEncode(ciphertext)].join(".");
}

async function decryptSessionCookie(
  value: string,
  secret: string,
): Promise<SessionPayload | undefined> {
  try {
    const [version, iv, ciphertext] = value.split(".");
    if (version !== COOKIE_VERSION || !iv || !ciphertext) return;

    const decrypted = await crypto.subtle.decrypt(
      { name: AES_GCM_ALGORITHM, iv: toArrayBuffer(base64UrlDecode(iv)) },
      await deriveKey(secret),
      toArrayBuffer(base64UrlDecode(ciphertext)),
    );
    const parsed: unknown = JSON.parse(new TextDecoder().decode(decrypted));
    if (!isSessionPayload(parsed) || parsed.expiresAt <= Date.now()) return;
    return parsed;
  } catch {
    return;
  }
}

function createSessionPayload(data: SessionRecord, issuedAt: number): SessionPayload {
  return { data, issuedAt, expiresAt: issuedAt + MAX_AGE_IN_MILLISECONDS };
}

async function deriveKey(secret: string): Promise<CryptoKey> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret));
  return crypto.subtle.importKey("raw", digest, AES_GCM_ALGORITHM, false, ["encrypt", "decrypt"]);
}

function serializeSessionCookie(value: string): string {
  return serializeCookie(CUSTOMER_SESSION_COOKIE_NAME, value, [
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    `Max-Age=${MAX_AGE_IN_SECONDS}`,
  ]);
}

function serializeExpiredSessionCookie(): string {
  return serializeCookie(CUSTOMER_SESSION_COOKIE_NAME, "", [
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    "Max-Age=0",
    `Expires=${EXPIRED_COOKIE_DATE}`,
  ]);
}

function serializeCookie(name: string, value: string, attributes: string[]): string {
  return [`${name}=${value}`, ...attributes].join("; ");
}

function getCookieValue(cookieHeader: string | null, name: string): string | undefined {
  if (!cookieHeader) return;
  for (const cookie of cookieHeader.split(";")) {
    const [cookieName, ...valueParts] = cookie.trim().split("=");
    if (cookieName === name) return valueParts.join("=");
  }
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function base64UrlDecode(value: string): Uint8Array {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "="));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.slice().buffer;
}

function hasSessionData(data: SessionRecord): boolean {
  return Object.keys(data).length > 0;
}

function isSessionRecord(value: unknown): value is SessionRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isSessionPayload(value: unknown): value is SessionPayload {
  if (!isSessionRecord(value)) return false;
  return (
    isSessionRecord(value.data) &&
    typeof value.expiresAt === "number" &&
    typeof value.issuedAt === "number"
  );
}

function assertCookieFitsBrowserLimit(cookie: string): void {
  if (cookieFitsBrowserLimit(cookie)) return;
  throw new Error(
    `Customer Account session cookie exceeds ${MAX_COOKIE_LENGTH_IN_BYTES} bytes. Use opaque server-side session storage for larger sessions.`,
  );
}

function cookieFitsBrowserLimit(cookie: string): boolean {
  return new TextEncoder().encode(cookie).byteLength <= MAX_COOKIE_LENGTH_IN_BYTES;
}

function assertSessionSecret(secret: string): void {
  if (secret.length >= SECRET_MIN_LENGTH) return;
  throw new Error(
    `CUSTOMER_ACCOUNT_SESSION_SECRET must be at least ${SECRET_MIN_LENGTH} characters long.`,
  );
}
