interface OpenIdConfiguration {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  jwks_uri: string;
  end_session_endpoint: string;
  [key: string]: any;
}

interface CustomerAccountApiConfiguration {
  graphql_api: string;
  mcp_api: string;
}

interface DiscoveryCache {
  openid?: {
    config: OpenIdConfiguration;
    timestamp: number;
  };
  customerApi?: {
    config: CustomerAccountApiConfiguration;
    timestamp: number;
  };
}

const DISCOVERY_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const DISCOVERY_TIMEOUT = 5000; // 5 seconds
const discoveryCache = new Map<string, DiscoveryCache>();

function getCacheKey(domain: string): string {
  return domain.toLowerCase();
}

function isValidCache(cacheEntry: {timestamp: number} | undefined): boolean {
  return Boolean(
    cacheEntry && Date.now() - cacheEntry.timestamp < DISCOVERY_CACHE_TTL,
  );
}

async function fetchWithTimeout(
  url: string,
  timeoutMs: number = DISCOVERY_TIMEOUT,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
      },
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

export async function discoverOpenIdConfiguration(
  storefrontDomain: string,
): Promise<OpenIdConfiguration | null> {
  const cacheKey = getCacheKey(storefrontDomain);
  const cached = discoveryCache.get(cacheKey)?.openid;

  if (isValidCache(cached)) {
    return cached!.config;
  }

  try {
    const discoveryUrl = `https://${storefrontDomain}/.well-known/openid-configuration`;
    const response = await fetchWithTimeout(discoveryUrl);

    if (!response.ok) {
      console.warn(
        `[h2:warn:discovery] OpenID configuration discovery failed for ${storefrontDomain}: ${response.status}`,
      );
      return null;
    }

    const config = (await response.json()) as OpenIdConfiguration;

    // Validate required fields
    if (
      !config.authorization_endpoint ||
      !config.token_endpoint ||
      !config.end_session_endpoint
    ) {
      console.warn(
        `[h2:warn:discovery] Invalid OpenID configuration for ${storefrontDomain}: missing required endpoints`,
      );
      return null;
    }

    // Update cache
    const existingCache = discoveryCache.get(cacheKey) || {};
    discoveryCache.set(cacheKey, {
      ...existingCache,
      openid: {
        config,
        timestamp: Date.now(),
      },
    });

    return config;
  } catch (error) {
    console.warn(
      `[h2:warn:discovery] OpenID configuration discovery failed for ${storefrontDomain}:`,
      error,
    );
    return null;
  }
}

export async function discoverCustomerAccountApi(
  storefrontDomain: string,
): Promise<CustomerAccountApiConfiguration | null> {
  const cacheKey = getCacheKey(storefrontDomain);
  const cached = discoveryCache.get(cacheKey)?.customerApi;

  if (isValidCache(cached)) {
    return cached!.config;
  }

  try {
    const discoveryUrl = `https://${storefrontDomain}/.well-known/customer-account-api`;
    const response = await fetchWithTimeout(discoveryUrl);

    if (!response.ok) {
      console.warn(
        `[h2:warn:discovery] Customer Account API discovery failed for ${storefrontDomain}: ${response.status}`,
      );
      return null;
    }

    const config = (await response.json()) as CustomerAccountApiConfiguration;

    // Validate required fields
    if (!config.graphql_api || !config.mcp_api) {
      console.warn(
        `[h2:warn:discovery] Invalid Customer Account API configuration for ${storefrontDomain}: missing required endpoints`,
      );
      return null;
    }

    // Update cache
    const existingCache = discoveryCache.get(cacheKey) || {};
    discoveryCache.set(cacheKey, {
      ...existingCache,
      customerApi: {
        config,
        timestamp: Date.now(),
      },
    });

    return config;
  } catch (error) {
    console.warn(
      `[h2:warn:discovery] Customer Account API discovery failed for ${storefrontDomain}:`,
      error,
    );
    return null;
  }
}

export function clearDiscoveryCache(storefrontDomain?: string): void {
  if (storefrontDomain) {
    discoveryCache.delete(getCacheKey(storefrontDomain));
  } else {
    discoveryCache.clear();
  }
}

export interface DiscoveredEndpoints {
  graphqlApiUrl?: string;
  authorizationUrl?: string;
  tokenUrl?: string;
  logoutUrl?: string;
}

export async function discoverCustomerAccountEndpoints(
  storefrontDomain: string,
): Promise<DiscoveredEndpoints> {
  if (!storefrontDomain) {
    console.warn(
      '[h2:warn:discovery] No storefront domain provided for endpoint discovery',
    );
    return {};
  }

  try {
    const [openidConfig, customerApiConfig] = await Promise.all([
      discoverOpenIdConfiguration(storefrontDomain),
      discoverCustomerAccountApi(storefrontDomain),
    ]);

    const endpoints = {
      graphqlApiUrl: customerApiConfig?.graphql_api,
      authorizationUrl: openidConfig?.authorization_endpoint,
      tokenUrl: openidConfig?.token_endpoint,
      logoutUrl: openidConfig?.end_session_endpoint,
    };

    // Log success if we discovered at least one endpoint
    const discoveredCount = Object.values(endpoints).filter(Boolean).length;
    if (discoveredCount > 0) {
      console.log(
        `[h2:info:discovery] Discovered ${discoveredCount}/4 Customer Account endpoints for ${storefrontDomain}`,
      );
    } else {
      console.warn(
        `[h2:warn:discovery] No Customer Account endpoints discovered for ${storefrontDomain}`,
      );
    }

    return endpoints;
  } catch (error) {
    console.warn(
      `[h2:warn:discovery] Failed to discover Customer Account endpoints for ${storefrontDomain}:`,
      error,
    );
    return {};
  }
}
