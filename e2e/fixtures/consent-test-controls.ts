import {expect, type Page, type Request} from '@playwright/test';

const REQUEST_HOLD_TIMEOUT_IN_MILLISECONDS = 15_000;
const PERSISTENCE_TIMEOUT_IN_MILLISECONDS = 15_000;

/** Hold before forwarding: route.fetch() would already apply Set-Cookie. */
export async function holdRequests(
  page: Page,
  matches: (request: Request) => boolean,
) {
  let release!: () => void;
  const released = new Promise<void>((resolve) => {
    release = resolve;
  });
  let heldCount = 0;
  let forwardedCount = 0;
  let disposed = false;
  const handler = async (route: import('@playwright/test').Route) => {
    if (!matches(route.request())) return route.fallback();
    heldCount++;
    await released;
    if (disposed) return route.abort();
    forwardedCount++;
    await route.continue();
  };
  await page.route('**/*', handler);
  return {
    async waitUntilHeld() {
      await expect
        .poll(() => heldCount, {
          message:
            'The request must reach the hold before testing pending activity',
          timeout: REQUEST_HOLD_TIMEOUT_IN_MILLISECONDS,
        })
        .toBeGreaterThan(0);
    },
    expectPending(expectedCount = 1) {
      expect(heldCount, 'Requests reached the hold').toBe(expectedCount);
      expect(forwardedCount, 'No held request has reached the backend').toBe(0);
    },
    release,
    async dispose() {
      disposed = true;
      release();
      await page.unroute('**/*', handler);
    },
  };
}

export function isConsentRequest(request: Request) {
  return (
    request.url().includes('graphql.json') &&
    request.method() === 'POST' &&
    /\bconsentManagement\b/.test(request.postData() ?? '')
  );
}

export function isPersistenceRequest(request: Request) {
  const url = new URL(request.url());
  return url.pathname.endsWith('graphql.json') && url.searchParams.has('_s');
}

/** Register before renewal; a request starting does not prove durable storage. */
export function trackSuccessfulPersistence(page: Page) {
  const completedVisitTokens: string[] = [];
  const record = async (response: import('@playwright/test').Response) => {
    if (!isPersistenceRequest(response.request()) || !response.ok()) return;
    try {
      if (await response.finished()) return;
      const body = await response.json();
      if (body.errors?.length || !body.data?.consentManagement?.cookies) return;
      completedVisitTokens.push(
        new URL(response.url()).searchParams.get('_s')!,
      );
    } catch {
      // An aborted response is not evidence of persistence.
    }
  };
  page.on('response', record);
  return {
    async waitFor(visitToken: string | null) {
      expect(Boolean(visitToken), 'Renewal must supply a visit token').toBe(
        true,
      );
      await expect
        .poll(() => completedVisitTokens.includes(visitToken!), {
          message:
            'Renewal persistence must finish successfully before reloading',
          timeout: PERSISTENCE_TIMEOUT_IN_MILLISECONDS,
        })
        .toBe(true);
    },
    stop() {
      page.off('response', record);
    },
  };
}

interface DispatchObservation {
  transport: string;
  consentLoaded: boolean;
  consentDiagnostic: boolean;
}

/** Runs in the page so consent is sampled synchronously at dispatch, not later in Node. */
function installDispatchObserver() {
  const observations: DispatchObservation[] = [];
  (window as any).__consentDispatches = observations;
  // The consent API emits its own diagnostics before publishing readiness.
  // Only its verified single-event schema is exempt; opaque and mixed bodies
  // remain observable so the exemption cannot hide storefront/PerfKit events.
  const isConsentDiagnostic = (body: unknown) => {
    if (typeof body !== 'string') return false;
    try {
      const event = JSON.parse(body) as {schema_id?: string; events?: unknown};
      return (
        event.schema_id === 'customer_privacy_api_events/2.0' &&
        event.events === undefined
      );
    } catch {
      return false;
    }
  };
  const record = (url: string, transport: string, body?: unknown) => {
    if (!/\/produce_batch|\/v1\/produce/.test(url)) return;
    const consentLoaded =
      (window as any).Shopify?.customerPrivacy?.consentStatus === 'loaded';
    observations.push({
      transport,
      consentLoaded,
      consentDiagnostic: isConsentDiagnostic(body),
    });
  };
  const fetch = window.fetch;
  window.fetch = function (input, init) {
    record(
      input instanceof Request ? input.url : String(input),
      'fetch',
      init?.body,
    );
    return fetch.call(this, input instanceof URL ? input.href : input, init);
  };
  const sendBeacon = navigator.sendBeacon;
  navigator.sendBeacon = function (url, data) {
    record(String(url), 'beacon', data);
    return sendBeacon.call(this, url, data);
  };
  const urls = new WeakMap<XMLHttpRequest, string>();
  XMLHttpRequest.prototype.open = new Proxy(XMLHttpRequest.prototype.open, {
    apply(target, xhr, args) {
      urls.set(xhr, String(args[1]));
      return Reflect.apply(target, xhr, args);
    },
  });
  XMLHttpRequest.prototype.send = new Proxy(XMLHttpRequest.prototype.send, {
    apply(target, xhr, args) {
      record(urls.get(xhr) ?? '', 'xhr', args[0]);
      return Reflect.apply(target, xhr, args);
    },
  });
}

export async function observeConsentDispatches(page: Page) {
  await page.addInitScript(installDispatchObserver);
  return {
    async expectNoPrematureAnalytics() {
      const observations: DispatchObservation[] = await page.evaluate(
        () => (window as any).__consentDispatches,
      );
      expect(
        observations,
        'Dispatch observation must be installed',
      ).toBeDefined();
      expect(
        observations.filter(
          (entry) => !entry.consentLoaded && !entry.consentDiagnostic,
        ),
        'No analytics may dispatch before consent loads',
      ).toEqual([]);
    },
  };
}
