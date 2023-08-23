export function generateNonce(): string {
  return toHexString(randomUint8Array());
}

function randomUint8Array() {
  try {
    return crypto.getRandomValues(new Uint8Array(16));
  } catch (e) {
    return new Uint8Array(16).map(() => (Math.random() * 255) | 0);
  }
}

function toHexString(byteArray: Uint8Array) {
  return Array.from(byteArray, function (byte) {
    return ('0' + (byte & 0xff).toString(16)).slice(-2);
  }).join('');
}
