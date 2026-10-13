const COOKIE_NAME = "__Host-hydrogen_customer_session";
const COOKIE_PATH = "/";
const COOKIE_VERSION = "v1";
const COOKIE_SEPARATOR = ".";
const AES_GCM_ALGORITHM = "AES-GCM";
const AES_GCM_IV_LENGTH_IN_BYTES = 12;
const SECRET_MIN_LENGTH = 32;
const MAX_COOKIE_LENGTH_IN_BYTES = 4_096;
const BYTE_CHUNK_SIZE = 32_768;
const EXPIRED_COOKIE_DATE = "Thu, 01 Jan 1970 00:00:00 GMT";

type SessionRecord = Record<string, unknown>;

/**
 * Portable encrypted cookie session for these examples. Production apps should
 * prefer opaque server-side session storage when their framework offers it.
 */
export class EncryptedCookieCustomerSession {
  #data: SessionRecord;
  #origin: string;
  #secret: string;
  #isDirty = false;

  private constructor(data: SessionRecord, origin: string, secret: string) {
    this.#data = data;
    this.#origin = origin;
    this.#secret = secret;
  }

  static async init(request: Request, secret: string) {
    assertSessionSecret(secret);
    const cookieValue = getCookieValue(request.headers.get("cookie"), COOKIE_NAME);
    const data = cookieValue ? await decryptSessionCookie(cookieValue, secret) : {};
    return new EncryptedCookieCustomerSession(data, new URL(request.url).origin, secret);
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
      ? await serializeSessionCookie(await encryptSessionCookie(this.#data, this.#secret))
      : serializeExpiredSessionCookie();
    assertCookieFitsBrowserLimit(cookie);

    headers.set("Set-Cookie", cookie);
    this.#isDirty = false;
    return headers;
  }
}

async function encryptSessionCookie(data: SessionRecord, secret: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(AES_GCM_IV_LENGTH_IN_BYTES));
  const key = await deriveKey(secret);
  const plaintext = new TextEncoder().encode(JSON.stringify(data));
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: AES_GCM_ALGORITHM, iv }, key, plaintext),
  );

  return [COOKIE_VERSION, base64UrlEncodeBytes(iv), base64UrlEncodeBytes(ciphertext)].join(
    COOKIE_SEPARATOR,
  );
}

async function decryptSessionCookie(value: string, secret: string): Promise<SessionRecord> {
  try {
    const [version, iv, ciphertext] = value.split(COOKIE_SEPARATOR);
    if (version !== COOKIE_VERSION || !iv || !ciphertext) return {};

    const ivBytes = base64UrlDecodeBytes(iv);
    const ciphertextBytes = base64UrlDecodeBytes(ciphertext);
    const decrypted = await crypto.subtle.decrypt(
      { name: AES_GCM_ALGORITHM, iv: toArrayBuffer(ivBytes) },
      await deriveKey(secret),
      toArrayBuffer(ciphertextBytes),
    );
    const parsed = JSON.parse(new TextDecoder().decode(decrypted));
    return isSessionRecord(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

async function deriveKey(secret: string): Promise<CryptoKey> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret));
  return crypto.subtle.importKey("raw", digest, AES_GCM_ALGORITHM, false, ["encrypt", "decrypt"]);
}

async function serializeSessionCookie(value: string): Promise<string> {
  return serializeCookie(COOKIE_NAME, value, [
    `Path=${COOKIE_PATH}`,
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
  ]);
}

function serializeExpiredSessionCookie(): string {
  return serializeCookie(COOKIE_NAME, "", [
    `Path=${COOKIE_PATH}`,
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    "Max-Age=0",
    `Expires=${EXPIRED_COOKIE_DATE}`,
  ]);
}

function serializeCookie(name: string, value: string, attributes: string[]) {
  return [`${name}=${value}`, ...attributes].join("; ");
}

function assertCookieFitsBrowserLimit(cookie: string) {
  if (new TextEncoder().encode(cookie).byteLength <= MAX_COOKIE_LENGTH_IN_BYTES) return;

  throw new Error(
    `Customer Account session cookie exceeds ${MAX_COOKIE_LENGTH_IN_BYTES} bytes. Use opaque server-side session storage for production account sessions.`,
  );
}

function getCookieValue(cookieHeader: string | null, name: string): string | undefined {
  if (!cookieHeader) return undefined;

  for (const cookie of cookieHeader.split(";")) {
    const [cookieName, ...valueParts] = cookie.trim().split("=");
    if (cookieName === name) return valueParts.join("=");
  }
}

function base64UrlEncodeBytes(bytes: Uint8Array): string {
  const binary = bytesToBinary(bytes);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function base64UrlDecodeBytes(value: string): Uint8Array {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const paddingLength = (4 - (base64.length % 4)) % 4;
  const binary = atob(base64.padEnd(base64.length + paddingLength, "="));
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index++) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return buffer;
}

function bytesToBinary(bytes: Uint8Array): string {
  let binary = "";
  for (let index = 0; index < bytes.length; index += BYTE_CHUNK_SIZE) {
    binary += String.fromCharCode(...bytes.slice(index, index + BYTE_CHUNK_SIZE));
  }
  return binary;
}

function hasSessionData(data: SessionRecord) {
  return Object.keys(data).length > 0;
}

function isSessionRecord(value: unknown): value is SessionRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertSessionSecret(secret: string) {
  if (secret.length < SECRET_MIN_LENGTH) {
    throw new Error(`SESSION_SECRET must be at least ${SECRET_MIN_LENGTH} characters long.`);
  }
}
