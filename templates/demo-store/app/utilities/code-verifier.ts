export async function generateCodeVerifier() {
  const rando = randomCode();
  return base64URLEncode(rando);
}

function randomCode() {
  let array = new Uint8Array(32);
  array = crypto.getRandomValues(array);
  return String.fromCharCode.apply(null, Array.from(array));
}

function base64URLEncode(str: string) {
  const b64 = btoa(str);
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function bufferToBase64UrlEncoded(hash: ArrayBuffer) {
  const uintArray = new Uint8Array(hash);
  const numberArray = Array.from(uintArray);
  const hashString = String.fromCharCode(...numberArray);
  return urlEncodeB64(btoa(hashString));
}

const urlEncodeB64 = (input: string) => {
  const b64Chars: {[index: string]: string} = {'+': '-', '/': '_', '=': ''};
  return input.replace(/[+/=]/g, (m: string) => b64Chars[m]);
};

export async function generateChallenge(codeVerifier: string) {
  const digestOp = await crypto.subtle.digest(
    {name: 'SHA-256'},
    new TextEncoder().encode(codeVerifier),
  );
  return bufferToBase64UrlEncoded(digestOp);
}
