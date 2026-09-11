function normalizeHost(host: string): string {
  const withoutProtocol = host.replace(/^https?:\/\//, "");
  return withoutProtocol.split("/")[0]?.split(":")[0]?.replace(/^\./, "").toLowerCase() ?? "";
}

function isIpAddress(host: string): boolean {
  return /^\d{1,3}(?:\.\d{1,3}){3}$/.test(host) || host.includes(":");
}

function canUseDomainCookie(domain: string): boolean {
  if (typeof document === "undefined") return false;

  const name = `hydrogen_domain_probe_${Math.random().toString(36).slice(2)}`;
  const value = "1";
  const nameValuePair = `${name}=${value}`;
  const cookie = `${nameValuePair}; domain=${domain}; path=/; SameSite=Lax`;
  const cleanup = `${name}=; domain=${domain}; path=/; max-age=0; SameSite=Lax`;

  try {
    document.cookie = cookie;
    const found = document.cookie.split(";").some((part) => part.trim() === nameValuePair);
    document.cookie = cleanup;
    return found;
  } catch {
    return false;
  }
}

/**
 * Finds the broadest wildcard cookie domain the current document can set for a
 * host. Browsers reject public suffixes like `.com` and `.co.uk`, so probing is
 * the only reliable way to find the earliest usable wildcard without shipping a
 * public suffix list.
 */
export function findWritableCookieDomain(
  host: string,
  probe: (domain: string) => boolean = canUseDomainCookie,
): string {
  const normalizedHost = normalizeHost(host);
  if (!normalizedHost || normalizedHost === "localhost" || isIpAddress(normalizedHost)) return "";

  const parts = normalizedHost.split(".").filter(Boolean);
  if (parts.length < 2) return "";

  for (let index = parts.length - 2; index >= 0; index--) {
    const domain = `.${parts.slice(index).join(".")}`;
    if (probe(domain)) return domain;
  }

  return "";
}
