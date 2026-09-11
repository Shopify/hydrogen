export type CacheKeyPrimitive = string | number | boolean | null;

export type CacheKey = string | readonly CacheKeyPrimitive[];

const textEncoder = new TextEncoder();

export async function hashCacheKey(key: CacheKey): Promise<string> {
  const serialized = typeof key === "string" ? `string:${key}` : `array:${serializeArrayKey(key)}`;
  const bytes = await crypto.subtle.digest("SHA-256", textEncoder.encode(serialized));

  return `h2:${hexEncode(bytes)}`;
}

function serializeArrayKey(value: readonly unknown[]): string {
  const values: string[] = [];
  for (let index = 0; index < value.length; index++) {
    if (!(index in value)) {
      throw new TypeError("Cache key arrays cannot contain empty slots.");
    }

    values.push(serializeCacheKeyPrimitive(value[index]));
  }

  return `[${values.join(",")}]`;
}

function serializeCacheKeyPrimitive(value: unknown): string {
  if (value === null) return "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  throw new TypeError(
    `Cache key arrays must contain only primitive values. Received: ${typeof value}`,
  );
}

function hexEncode(bytes: ArrayBuffer): string {
  return [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
