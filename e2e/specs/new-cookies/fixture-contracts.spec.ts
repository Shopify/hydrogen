import {checkoutAnalyticsAllowed} from '../../fixtures/checkout-consent';
import {createServer} from 'node:http';
import type {AddressInfo} from 'node:net';
import {
  observeConsentDispatches,
  holdRequests,
  isPersistenceRequest,
  trackSuccessfulPersistence,
} from '../../fixtures/consent-test-controls';
import {test, expect} from '@playwright/test';
import {StorefrontPage, parseAnalyticsEvents} from '../../fixtures/storefront';

const SYNTHETIC_ORIGIN = 'https://storefront.example';
const CHECKOUT_ORIGIN = 'https://checkout.example';
const SESSION = {
  uniqueToken: '11111111-1111-4111-8111-111111111111',
  visitToken: '22222222-2222-4222-8222-222222222222',
};

function checkoutEvents(tokens: {uniqueToken?: string; visitToken?: string}) {
  return parseAnalyticsEvents(
    JSON.stringify({
      events: [
        {
          schema_id: 'web_pixels_manager_event_publish/1.7',
          payload: {
            event_name: 'page_viewed',
            surface: 'checkout-one',
            page_url: `${CHECKOUT_ORIGIN}/checkouts/test`,
          },
        },
        {
          schema_id: 'checkout_track/3.8',
          payload: {
            event_name: 'cart_information',
            tracking_unique: tokens.uniqueToken,
            tracking_visit: tokens.visitToken,
          },
        },
        {
          schema_id: 'checkout_lifecycle_events/7.7',
          payload: {
            event_name: 'checkout_progression',
            buyer_consent_analytics_allowed: true,
          },
        },
      ],
    }),
  );
}

test('checkout verifier accepts a complete checkout session', async ({
  page,
}) => {
  new StorefrontPage(page).expectCheckoutContinuesSession(
    checkoutEvents(SESSION),
    SESSION,
  );
});

for (const missing of ['uniqueToken', 'visitToken'] as const) {
  test(`checkout verifier rejects missing ${missing}`, async ({page}) => {
    const tokens = {...SESSION, [missing]: undefined};
    expect(() =>
      new StorefrontPage(page).expectCheckoutContinuesSession(
        checkoutEvents(tokens),
        SESSION,
      ),
    ).toThrow();
  });
}

test('denied checkout requires explicit consent evidence', async ({page}) => {
  const events = parseAnalyticsEvents(
    JSON.stringify({
      schema_id: 'web_pixels_manager_event_publish/1.7',
      payload: {
        event_name: 'page_viewed',
        surface: 'checkout-one',
        page_url: `${CHECKOUT_ORIGIN}/checkouts/test`,
      },
    }),
  );
  expect(() =>
    new StorefrontPage(page).expectCheckoutWithoutTracking(events),
  ).toThrow();
});

test('checkout verifier rejects storefront-only analytics', async ({page}) => {
  const events = parseAnalyticsEvents(
    JSON.stringify({
      schema_id: 'custom_storefront_customer_tracking/1.8',
      payload: {
        event_name: 'product_added_to_cart',
        unique_token: SESSION.uniqueToken,
        deprecated_visit_token: SESSION.visitToken,
        analytics_allowed: true,
      },
    }),
  );
  expect(() =>
    new StorefrontPage(page).expectCheckoutContinuesSession(events, SESSION),
  ).toThrow();
});

test('client-side navigation rejects a full document anchor', async ({
  page,
}) => {
  await page.route(`${SYNTHETIC_ORIGIN}/**`, (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: '<a href="/collections/all">Catalog</a>',
    }),
  );
  await page.goto(SYNTHETIC_ORIGIN);
  await expect(
    new StorefrontPage(page).navigateClientSide('/collections/all'),
  ).rejects.toThrow();
});

for (const transport of ['fetch', 'xhr', 'beacon'] as const) {
  test(`dispatch observer rejects an early ${transport} even if consent loads in the same task`, async ({
    page,
  }) => {
    const dispatches = await observeConsentDispatches(page);
    await page.route(`${SYNTHETIC_ORIGIN}/**`, (route) =>
      route.fulfill({
        contentType: 'text/html',
        body: '<main>Storefront</main>',
      }),
    );
    await page.goto(SYNTHETIC_ORIGIN);
    await page.evaluate((transport) => {
      (window as any).Shopify = {customerPrivacy: {consentStatus: 'loading'}};
      const endpoint = '/produce_batch';
      if (transport === 'fetch')
        void fetch(endpoint, {method: 'POST', body: '{}'});
      if (transport === 'beacon') navigator.sendBeacon(endpoint, '{}');
      if (transport === 'xhr') {
        const request = new XMLHttpRequest();
        request.open('POST', endpoint);
        request.send('{}');
      }
      (window as any).Shopify.customerPrivacy.consentStatus = 'loaded';
    }, transport);
    await expect(dispatches.expectNoPrematureAnalytics()).rejects.toThrow(
      'No analytics may dispatch',
    );
  });
}

test('dispatch observer accepts analytics after consent loads', async ({
  page,
}) => {
  const dispatches = await observeConsentDispatches(page);
  await page.route(`${SYNTHETIC_ORIGIN}/**`, (route) =>
    route.fulfill({contentType: 'text/html', body: '<main>Storefront</main>'}),
  );
  await page.goto(SYNTHETIC_ORIGIN);
  await page.evaluate(async () => {
    (window as any).Shopify = {customerPrivacy: {consentStatus: 'loaded'}};
    await fetch('/produce_batch', {method: 'POST', body: '{}'});
  });
  await dispatches.expectNoPrematureAnalytics();
});

test('client-side navigation preserves the document', async ({page}) => {
  await page.route(`${SYNTHETIC_ORIGIN}/**`, (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: '<a href="/collections/all" onclick="event.preventDefault(); history.pushState({},\'\',this.href)">Catalog</a>',
    }),
  );
  await page.goto(SYNTHETIC_ORIGIN);
  await new StorefrontPage(page).navigateClientSide('/collections/all');
});

test('a retained page view cannot satisfy a new destination assertion', async ({
  page,
}) => {
  const storefront = new StorefrontPage(page);
  storefront.monorailRequests.push({
    url: '/produce_batch',
    postData: JSON.stringify({
      events: [
        {
          schema_id: 'custom_storefront_customer_tracking/1.8',
          payload: {
            event_name: 'page_rendered',
            event_source_url: `${SYNTHETIC_ORIGIN}/collections/all`,
          },
        },
      ],
    }),
  });
  await expect(
    storefront.waitForPageViewAfter(
      storefront.monorailRequests.length,
      '/collections/all',
    ),
  ).rejects.toThrow();
});

test('unrelated checkout publish telemetry cannot prove a checkout page view', async ({
  page,
}) => {
  const events = checkoutEvents(SESSION);
  events[0].eventName = 'unrelated_publish';
  expect(() =>
    new StorefrontPage(page).expectCheckoutContinuesSession(events, SESSION),
  ).toThrow();
});

test('hold prevents backend work and Set-Cookie until explicitly released', async ({
  page,
}) => {
  let forwardedRequests = 0;
  const server = createServer((request, response) => {
    if (request.url?.includes('graphql.json')) {
      forwardedRequests++;
      response.setHeader(
        'Set-Cookie',
        'held_cookie=persisted; Path=/; HttpOnly',
      );
      response.end(
        JSON.stringify({
          data: {consentManagement: {cookies: {cookieDomain: 'localhost'}}},
        }),
      );
      return;
    }
    response.setHeader('Content-Type', 'text/html');
    response.end(
      "<button onclick=\"fetch('/graphql.json?_s=renewed', {method: 'POST'})\">Renew</button>",
    );
  });
  const OS_ASSIGNED_PORT = 0;
  await new Promise<void>((resolve) =>
    server.listen(OS_ASSIGNED_PORT, '127.0.0.1', resolve),
  );
  const {port} = server.address() as AddressInfo;
  const hold = await holdRequests(page, isPersistenceRequest);
  const persistence = trackSuccessfulPersistence(page);
  try {
    await page.goto(`http://127.0.0.1:${port}`);
    await page.getByRole('button', {name: 'Renew'}).click();
    await hold.waitUntilHeld();
    hold.expectPending();
    expect(forwardedRequests).toBe(0);
    expect(
      (await page.context().cookies()).some(
        (cookie) => cookie.name === 'held_cookie',
      ),
    ).toBe(false);
    let completed = false;
    const persisted = persistence.waitFor('renewed').then(() => {
      completed = true;
    });
    await page.getByRole('button', {name: 'Renew'}).focus();
    expect(completed).toBe(false);
    hold.release();
    await persisted;
    expect(forwardedRequests).toBe(1);
    expect(
      (await page.context().cookies()).some(
        (cookie) => cookie.name === 'held_cookie',
      ),
    ).toBe(true);
  } finally {
    await hold.dispose();
    persistence.stop();
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});

for (const missing of [
  'uniqueToken',
  'visitToken',
  'analyticsAllowed',
] as const) {
  test(`a checkout reload cannot repair missing initial ${missing}`, async ({
    page,
  }) => {
    const initial = checkoutEvents(SESSION).map((event) => ({
      ...event,
      phase: 'initial' as const,
      [missing]: undefined,
    }));
    const reload = checkoutEvents(SESSION).map((event) => ({
      ...event,
      phase: 'reload' as const,
    }));
    expect(() =>
      new StorefrontPage(page).expectCheckoutContinuesSession(
        [...initial, ...reload],
        SESSION,
      ),
    ).toThrow();
  });
}

async function serveCheckout(
  context: import('@playwright/test').BrowserContext,
  options: {unrelated?: boolean; leakOnFocus?: boolean},
) {
  const publish = {
    schema_id: 'web_pixels_manager_event_publish/1.7',
    payload: {
      surface: 'checkout-one',
      event_name: options.unrelated ? 'unrelated_publish' : 'page_viewed',
      page_url: `${CHECKOUT_ORIGIN}/checkouts/test`,
    },
  };
  const events = [
    publish,
    {...publish, payload: {...publish.payload, event_name: 'checkout_started'}},
    {
      schema_id: 'checkout_lifecycle_events/7.7',
      payload: {buyer_consent_analytics_allowed: false},
    },
  ];
  const leak = {
    schema_id: 'checkout_track/3.8',
    payload: {
      tracking_unique: SESSION.uniqueToken,
      tracking_visit: SESSION.visitToken,
    },
  };
  const html = `<input type="email" aria-label="Email"><button>Continue</button>
    <script>
      window.Shopify = {customerPrivacy: {injectedConsent: '3amp.S_CAON_f_f'}};
      const send = (events) => fetch('/produce_batch', {method: 'POST', body: JSON.stringify({events})});
      send(${JSON.stringify(events)});
      document.querySelector('input').addEventListener('focus', () => {
        if (${Boolean(options.leakOnFocus)}) send([${JSON.stringify(leak)}]);
      });
    </script>`;
  await context.route(`${CHECKOUT_ORIGIN}/**`, (route) =>
    route.fulfill({
      contentType:
        route.request().method() === 'POST' ? 'application/json' : 'text/html',
      body: route.request().method() === 'POST' ? '{}' : html,
    }),
  );
}

test('checkout collection retains a tracking leak triggered after initial readiness', async ({
  page,
  context,
}) => {
  await serveCheckout(context, {leakOnFocus: true});
  const storefront = new StorefrontPage(page);
  await expect(
    storefront.collectCheckoutAnalytics(`${CHECKOUT_ORIGIN}/checkouts/test`, {
      expectTokens: false,
    }),
  ).rejects.toThrow('Denied checkout must not report tracking tokens');
  expect(context.pages()).toHaveLength(1);
});

test('checkout collector rejects unrelated publish telemetry and closes its tab on failure', async ({
  page,
  context,
}) => {
  await serveCheckout(context, {unrelated: true});
  await expect(
    new StorefrontPage(page).collectCheckoutAnalytics(
      `${CHECKOUT_ORIGIN}/checkouts/test`,
      {expectTokens: false},
    ),
  ).rejects.toThrow();
  expect(context.pages()).toHaveLength(1);
});

for (const {name, consent, allowed} of [
  {name: 'accepted analytics', consent: '3AMP.S_CAON_f_f', allowed: true},
  {name: 'denied analytics', consent: '3amp.S_CAON_f_f', allowed: false},
  {
    name: 'analytics allowed but marketing denied',
    consent: '3AmP.S_CAON_f_f',
    allowed: true,
  },
  {name: 'default-denied analytics', consent: '3.S_CAON_t_f', allowed: false},
  {
    name: 'encoded consent',
    consent: encodeURIComponent('3AMP.S_CAON_f_f'),
    allowed: true,
  },
]) {
  test(`checkout consent decoder reads ${name}`, () => {
    expect(checkoutAnalyticsAllowed(consent)).toBe(allowed);
  });
}

for (const consent of [
  undefined,
  null,
  '',
  {},
  '4amp.S_CAON_f_f',
  '3',
  '3_bad',
  '3aa.S_CAON_f_f',
  '3._CAON_f_f',
  '3amp.S_CAON_f_f__{broken',
  '3garbage_CAON_f_f',
  '3amp.S_CAON_unknown_f',
  '%malformed',
  '3amp.S_CAON_f_f_invalid-id',
]) {
  test(`checkout consent decoder rejects unavailable or malformed evidence ${JSON.stringify(consent)}`, () => {
    expect(checkoutAnalyticsAllowed(consent)).toBeUndefined();
  });
}

test('general trackability=false does not prove analytics denial', async ({
  page,
}) => {
  const events = checkoutEvents(SESSION).map((event) => ({
    ...event,
    uniqueToken: undefined,
    visitToken: undefined,
    userCanBeTracked: false,
    analyticsAllowed: checkoutAnalyticsAllowed('3AmP.S_CAON_f_f'),
  }));
  expect(() =>
    new StorefrontPage(page).expectCheckoutWithoutTracking(events),
  ).toThrow();
});

for (const transport of ['fetch', 'xhr', 'beacon'] as const) {
  test(`dispatch observer permits verified CTA diagnostics before consent via ${transport}`, async ({
    page,
  }) => {
    const dispatches = await observeConsentDispatches(page);
    await page.route(`${SYNTHETIC_ORIGIN}/**`, (route) =>
      route.fulfill({
        contentType: 'text/html',
        body: '<main>Storefront</main>',
      }),
    );
    await page.goto(SYNTHETIC_ORIGIN);
    await page.evaluate((transport) => {
      (window as any).Shopify = {customerPrivacy: {consentStatus: 'loading'}};
      const endpoint = '/v1/produce';
      const body = JSON.stringify({
        schema_id: 'customer_privacy_api_events/2.0',
        payload: {method_name: 'hydrogenVisitorState'},
      });
      if (transport === 'fetch') void fetch(endpoint, {method: 'POST', body});
      if (transport === 'beacon') navigator.sendBeacon(endpoint, body);
      if (transport === 'xhr') {
        const request = new XMLHttpRequest();
        request.open('POST', endpoint);
        request.send(body);
      }
    }, transport);
    await dispatches.expectNoPrematureAnalytics();
  });
}

for (const body of [
  {schema_id: 'perf_kit_on_interaction/3.2', payload: {}},
  {schema_id: 'perf_kit_on_unload/3.5', payload: {}},
  {schema_id: 'customer_privacy_api_events/unknown', payload: {}},
  {
    schema_id: 'customer_privacy_api_events/2.0',
    events: [
      {
        schema_id: 'custom_storefront_customer_tracking/1.8',
        payload: {event_name: 'page_rendered'},
      },
    ],
  },
]) {
  test(`dispatch observer still rejects pre-consent produce payload ${JSON.stringify(body)}`, async ({
    page,
  }) => {
    const dispatches = await observeConsentDispatches(page);
    await page.route(`${SYNTHETIC_ORIGIN}/**`, (route) =>
      route.fulfill({
        contentType: 'text/html',
        body: '<main>Storefront</main>',
      }),
    );
    await page.goto(SYNTHETIC_ORIGIN);
    await page.evaluate((body) => {
      (window as any).Shopify = {customerPrivacy: {consentStatus: 'loading'}};
      void fetch('/v1/produce', {method: 'POST', body: JSON.stringify(body)});
      (window as any).Shopify.customerPrivacy.consentStatus = 'loaded';
    }, body);
    await expect(dispatches.expectNoPrematureAnalytics()).rejects.toThrow(
      'No analytics may dispatch',
    );
  });
}

test('actual checkout click can wait for persistence without collecting storefront traffic', async ({
  page,
}) => {
  const server = createServer((request, response) => {
    if (
      request.url?.includes('graphql.json') ||
      request.url === '/produce_batch'
    ) {
      response.setHeader('Content-Type', 'application/json');
      response.end(
        JSON.stringify({
          data: {consentManagement: {cookies: {cookieDomain: 'localhost'}}},
        }),
      );
      return;
    }
    response.setHeader('Content-Type', 'text/html');
    if (request.url === '/checkouts/test') {
      response.end(`<input type="email" aria-label="Email"><button>Continue</button><script>
        window.Shopify = {customerPrivacy: {injectedConsent: '3amp.S_CAON_f_f'}};
        fetch('/produce_batch', {method: 'POST', body: JSON.stringify({events: [
          {schema_id: 'web_pixels_manager_event_publish/1.7', payload: {event_name: 'page_viewed', surface: 'checkout-one', page_url: location.href}},
          {schema_id: 'web_pixels_manager_event_publish/1.7', payload: {event_name: 'checkout_started', surface: 'checkout-one', page_url: location.href}},
        ]})});
      </script>`);
      return;
    }
    response.end(`<a href="/checkouts/test">Continue to Checkout</a><script>
      document.querySelector('a').addEventListener('click', async (event) => {
        event.preventDefault();
        await fetch('/produce_batch', {method: 'POST', body: JSON.stringify({events: [{schema_id: 'custom_storefront_customer_tracking/1.8', payload: {event_name: 'product_added_to_cart', unique_token: '${SESSION.uniqueToken}', deprecated_visit_token: '${SESSION.visitToken}'}}]})});
        await fetch('/graphql.json?_s=renewed', {method: 'POST'});
        location.href = '/checkouts/test';
      });
    </script>`);
  });
  const OS_ASSIGNED_PORT = 0;
  await new Promise<void>((resolve) =>
    server.listen(OS_ASSIGNED_PORT, '127.0.0.1', resolve),
  );
  const {port} = server.address() as AddressInfo;
  const hold = await holdRequests(page, isPersistenceRequest);
  try {
    await page.goto(`http://127.0.0.1:${port}`);
    const storefront = new StorefrontPage(page);
    const handoff = storefront.collectCheckoutAnalyticsFromCart({
      expectTokens: false,
    });
    await hold.waitUntilHeld();
    hold.expectPending();
    expect(new URL(page.url()).pathname).toBe('/');
    hold.release();
    const events = await handoff;
    storefront.expectCheckoutWithoutTracking(events);
    expect(
      events.some((event) => event.eventName === 'product_added_to_cart'),
    ).toBe(false);
  } finally {
    await hold.dispose();
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});
