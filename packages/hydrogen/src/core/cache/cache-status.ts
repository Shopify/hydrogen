export const HYDROGEN_CACHE_STATUS_PRODUCT = "Hydrogen";

export type HydrogenCacheStatus = "hit" | "miss" | "bypass";

export function getHydrogenCacheStatus(headers: Headers): HydrogenCacheStatus | undefined {
  const cacheStatus = headers.get("cache-status");
  if (!cacheStatus) return undefined;

  for (const member of cacheStatus.split(",")) {
    const [product, ...parameters] = member.split(";").map((part) => part.trim());
    if (product !== HYDROGEN_CACHE_STATUS_PRODUCT) continue;

    if (parameters.includes("hit")) return "hit";
    if (parameters.some((parameter) => parameter.startsWith("fwd=bypass"))) return "bypass";
    if (parameters.some((parameter) => parameter.startsWith("fwd="))) return "miss";
  }

  return undefined;
}
