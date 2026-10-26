const NONCE_BYTE_LENGTH = 16;

export function generateNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(NONCE_BYTE_LENGTH));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}
