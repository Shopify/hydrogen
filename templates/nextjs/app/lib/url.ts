import { headers } from "next/headers";

export type NextSearchParams = Record<string, string | string[] | undefined>;

export function toURLSearchParams(input: NextSearchParams) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(input)) {
    if (Array.isArray(value)) {
      for (const item of value) params.append(key, item);
    } else if (value != null) {
      params.set(key, value);
    }
  }
  return params;
}

export async function getRequestOrigin() {
  const requestHeaders = await headers();
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "http";
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  return `${protocol}://${host ?? "localhost:3000"}`;
}
