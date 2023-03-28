export async function generateCodeVerifier(): Promise<string> {
  const rando = randomCode();
  const encoded = base64URLEncode(rando);
  console.log(`Code Verifier strings random: ${rando} | encoded: ${encoded}`);
  return encoded;
}

function randomCode(): string {
  let array = new Uint8Array(32);
  array = globalThis.crypto.getRandomValues(array);
  return String.fromCharCode.apply(null, Array.from(array));
}

function base64URLEncode(str: string): string {
  const b64 = btoa(str);
  const encoded = b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  return encoded;
}

const sha256 = async (str: string): Promise<string> => {
  const digestOp = await crypto.subtle.digest(
    {name: 'SHA-256'},
    new TextEncoder().encode(str),
  );
  return bufferToBase64UrlEncoded(digestOp);
};

const bufferToBase64UrlEncoded = (hash: ArrayBuffer): string => {
  const uintArray = new Uint8Array(hash);
  const numberArray = Array.from(uintArray);
  const hashString = String.fromCharCode(...numberArray);
  return urlEncodeB64(btoa(hashString));
};

const urlEncodeB64 = (input: string) => {
  const b64Chars: {[index: string]: string} = {'+': '-', '/': '_', '=': ''};
  return input.replace(/[+/=]/g, (m: string) => b64Chars[m]);
};

export async function generateChallenge(
  codeVerifierString: string,
): Promise<string> {
  const sha = await sha256(codeVerifierString);
  console.log(`generated sha ${sha} for codeVerifier ${codeVerifierString}`);
  return sha;
}
