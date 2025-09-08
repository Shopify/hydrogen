function stringifyForGraphQL(value: any, nested = false): string {
  if (value === null) return 'null';
  if (value === undefined) return '';

  if (Array.isArray(value)) {
    const items = value.map((v) => stringifyForGraphQL(v, true)).join(',');
    return `[${items}]`;
  }

  if (typeof value === 'object') {
    const pairs: string[] = [];
    for (const key in value) {
      if (value.hasOwnProperty(key) && value[key] !== undefined) {
        pairs.push(`${key}:${stringifyForGraphQL(value[key], true)}`);
      }
    }
    const content = pairs.join(',');
    return nested ? `{${content}}` : content;
  }

  if (typeof value === 'string') {
    return `"${value}"`;
  }

  return String(value);
}

export function buildConsentManagementQuery(params: {
  visitorConsent: {
    marketing: boolean;
    analytics: boolean;
    preferences: boolean;
    saleOfData: boolean;
    metafields?: Record<string, any>;
  };
  origReferrer?: string;
  landingPage?: string;
}): string {
  const queryParams: any = {
    visitorConsent: params.visitorConsent,
  };

  if (params.origReferrer !== undefined) {
    queryParams.origReferrer = params.origReferrer;
  }
  if (params.landingPage !== undefined) {
    queryParams.landingPage = params.landingPage;
  }

  const paramsStr = stringifyForGraphQL(queryParams);

  return `query { consentManagement { cookies(${paramsStr}) { trackingConsentCookie cookieDomain landingPageCookie origReferrerCookie } customerAccountUrl } }`;
}

export interface ConsentManagementResponse {
  consentManagement: {
    cookies: {
      trackingConsentCookie: string;
      cookieDomain: string;
      landingPageCookie?: string;
      origReferrerCookie?: string;
    };
    customerAccountUrl?: string;
  };
}
