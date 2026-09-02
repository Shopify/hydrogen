const NONCE_BYTE_LENGTH = 16;

export function generateNonce(): string {
  return toHexString(randomUint8Array());
}

function randomUint8Array() {
  try {
    return crypto.getRandomValues(new Uint8Array(NONCE_BYTE_LENGTH));
  } catch (e) {
    return new Uint8Array(NONCE_BYTE_LENGTH).map(() => (Math.random() * 255) | 0);
  }
}

function toHexString(byteArray: Uint8Array) {
  return Array.from(byteArray, function (byte) {
    return ("0" + (byte & 0xff).toString(16)).slice(-2);
  }).join("");
}
