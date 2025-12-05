!(function (n) {
  'use strict';
  const e = {
      TRACKING_ACCEPTED: 'trackingConsentAccepted',
      TRACKING_DECLINED: 'trackingConsentDeclined',
      MARKETING_ACCEPTED: 'firstPartyMarketingConsentAccepted',
      SALE_OF_DATA_ACCEPTED: 'thirdPartyMarketingConsentAccepted',
      ANALYTICS_ACCEPTED: 'analyticsConsentAccepted',
      PREFERENCES_ACCEPTED: 'preferencesConsentAccepted',
      MARKETING_DECLINED: 'firstPartyMarketingConsentDeclined',
      SALE_OF_DATA_DECLINED: 'thirdPartyMarketingConsentDeclined',
      ANALYTICS_DECLINED: 'analyticsConsentDeclined',
      PREFERENCES_DECLINED: 'preferencesConsentDeclined',
      CONSENT_COLLECTED: 'visitorConsentCollected',
      CONSENT_TRACKING_API_LOADED: 'consentTrackingApiLoaded',
    },
    t = '2.1',
    o = '3',
    r = {
      ACCEPTED: 'yes',
      DECLINED: 'no',
      NO_INTERACTION: 'no_interaction',
      NO_VALUE: '',
    },
    i = {NO_VALUE: '', ACCEPTED: '1', DECLINED: '0'},
    c = {PREFERENCES: 'p', ANALYTICS: 'a', MARKETING: 'm', SALE_OF_DATA: 't'},
    a = {MARKETING: 'm', ANALYTICS: 'a', PREFERENCES: 'p', SALE_OF_DATA: 's'},
    s = {
      MARKETING: 'marketing',
      ANALYTICS: 'analytics',
      PREFERENCES: 'preferences',
      SALE_OF_DATA: 'sale_of_data',
      EMAIL: 'email',
    },
    u = {
      HEADLESS_STOREFRONT: 'headlessStorefront',
      ROOT_DOMAIN: 'rootDomain',
      CHECKOUT_ROOT_DOMAIN: 'checkoutRootDomain',
      STOREFRONT_ROOT_DOMAIN: 'storefrontRootDomain',
      STOREFRONT_ACCESS_TOKEN: 'storefrontAccessToken',
      IS_EXTENSION_TOKEN: 'isExtensionToken',
      METAFIELDS: 'metafields',
    };
  function l(n, e, t) {
    return (
      (e = (function (n) {
        var e = (function (n, e) {
          if ('object' != typeof n || !n) return n;
          var t = n[Symbol.toPrimitive];
          if (void 0 !== t) {
            var o = t.call(n, e);
            if ('object' != typeof o) return o;
            throw new TypeError('@@toPrimitive must return a primitive value.');
          }
          return ('string' === e ? String : Number)(n);
        })(n, 'string');
        return 'symbol' == typeof e ? e : e + '';
      })(e)) in n
        ? Object.defineProperty(n, e, {
            value: t,
            enumerable: !0,
            configurable: !0,
            writable: !0,
          })
        : (n[e] = t),
      n
    );
  }
  function d(n, e) {
    var t = Object.keys(n);
    if (Object.getOwnPropertySymbols) {
      var o = Object.getOwnPropertySymbols(n);
      (e &&
        (o = o.filter(function (e) {
          return Object.getOwnPropertyDescriptor(n, e).enumerable;
        })),
        t.push.apply(t, o));
    }
    return t;
  }
  function E(n) {
    for (var e = 1; e < arguments.length; e++) {
      var t = null != arguments[e] ? arguments[e] : {};
      e % 2
        ? d(Object(t), !0).forEach(function (e) {
            l(n, e, t[e]);
          })
        : Object.getOwnPropertyDescriptors
          ? Object.defineProperties(n, Object.getOwnPropertyDescriptors(t))
          : d(Object(t)).forEach(function (e) {
              Object.defineProperty(
                n,
                e,
                Object.getOwnPropertyDescriptor(t, e),
              );
            });
    }
    return n;
  }
  function f(n, e) {
    if (null === n) return 'null';
    if (Array.isArray(n)) {
      const e = n.map((n) => f(n, !0)).join(',');
      return '['.concat(e, ']');
    }
    if ('object' == typeof n) {
      let t = [];
      for (const e in n)
        n.hasOwnProperty(e) &&
          void 0 !== n[e] &&
          t.push(''.concat(e, ':').concat(f(n[e], !0)));
      const o = t.join(',');
      return e ? '{'.concat(o, '}') : o;
    }
    return 'string' == typeof n ? '"'.concat(n, '"') : ''.concat(n);
  }
  function A(n) {
    try {
      return decodeURIComponent(n);
    } catch (n) {
      return '';
    }
  }
  const p = () => !1;
  class C {}
  ((C.warn = (n) => {
    p() || console.warn(n);
  }),
    (C.error = (n) => {
      p() || console.error(n);
    }),
    (C.info = (n) => {
      p() || console.info(n);
    }),
    (C.debug = (n) => {
      p() || console.debug(n);
    }),
    (C.trace = (n) => {
      p() || console.trace(n);
    }));
  const _ = C,
    g = '_tracking_consent';
  function T(n) {
    let e = arguments.length > 1 && void 0 !== arguments[1] && arguments[1];
    const t = (function () {
      try {
        return document.cookie;
      } catch (n) {
        return !1;
      }
    })()
      ? document.cookie.split('; ')
      : [];
    for (let e = 0; e < t.length; e++) {
      const [o, r] = t[e].split('=');
      if (n === A(o)) {
        return A(r);
      }
    }
    if (
      e &&
      '_tracking_consent' === n &&
      !window.localStorage.getItem('tracking_consent_fetched')
    ) {
      if (p()) return;
      return (
        console.debug('_tracking_consent missing'),
        (function () {
          let n =
            arguments.length > 0 && void 0 !== arguments[0]
              ? arguments[0]
              : '/';
          const e = new XMLHttpRequest();
          (e.open('HEAD', n, !1), (e.withCredentials = !0), e.send());
        })(),
        window.localStorage.setItem('tracking_consent_fetched', 'true'),
        T(n, !1)
      );
    }
  }
  function h(n) {
    return n === encodeURIComponent(A(n));
  }
  function m(n, e, t, o) {
    if (!h(o))
      throw new TypeError('Cookie value is not correctly URI encoded.');
    if (!h(n)) throw new TypeError('Cookie name is not correctly URI encoded.');
    let r = ''.concat(n, '=').concat(o);
    ((r += '; path=/'),
      e && (r += '; domain='.concat(e)),
      (r += '; expires='.concat(
        new Date(new Date().getTime() + t).toUTCString(),
      )),
      (document.cookie = r));
  }
  const y = '_cmp';
  const N = '_cs';
  function S() {
    const n =
      (function () {
        var n, e;
        const t =
          null === (n = window.Shopify) ||
          void 0 === n ||
          null === (e = n.customerPrivacy) ||
          void 0 === e
            ? void 0
            : e.cachedConsent;
        return t ? A(t) : void 0;
      })() ||
      new URLSearchParams(window.location.search).get(N) ||
      void 0 ||
      T(g) ||
      (function () {
        try {
          var n;
          const [e] =
              null === (n = performance) || void 0 === n
                ? void 0
                : n.getEntriesByType('navigation'),
            t = null == e ? void 0 : e.serverTiming.find((n) => n.name === y);
          let o = null == t ? void 0 : t.description;
          if (!o) return;
          try {
            o = decodeURIComponent(o);
          } catch (n) {}
          return o;
        } catch (n) {
          return;
        }
      })();
    if (void 0 !== n)
      return (function (n) {
        if ('%' == n.slice(0, 1))
          try {
            n = decodeURIComponent(n);
          } catch (n) {}
        const e = n.slice(0, 1);
        if ('{' == e)
          return (function (n) {
            var e;
            let o;
            try {
              o = JSON.parse(n);
            } catch (n) {
              return;
            }
            if (o.v !== t) return;
            if (null === (e = o.con) || void 0 === e || !e.CMP) return;
            return o;
          })(n);
        if ('3' == e)
          return (function (n) {
            const e = n.slice(1).split('_'),
              [t, r, s, u, l] = e;
            let d, E;
            try {
              d = e[5] ? JSON.parse(e.slice(5).join('_')) : void 0;
            } catch (n) {}
            if (l) {
              const n = l.replace(/\*/g, '/').replace(/-/g, '+'),
                e = Array.from(atob(n))
                  .map((n) => n.charCodeAt(0).toString(16).padStart(2, '0'))
                  .join('');
              E = [8, 13, 18, 23].reduce(
                (n, e) => n.slice(0, e) + '-' + n.slice(e),
                e,
              );
            }
            function f(n) {
              const e = t.split('.')[0];
              return e.includes(n.toLowerCase())
                ? i.DECLINED
                : e.includes(n.toUpperCase())
                  ? i.ACCEPTED
                  : i.NO_VALUE;
            }
            function A(n) {
              return t.includes(n.replace('t', 's').toUpperCase());
            }
            return {
              v: o,
              con: {
                CMP: {
                  [a.ANALYTICS]: f(a.ANALYTICS),
                  [a.PREFERENCES]: f(a.PREFERENCES),
                  [a.MARKETING]: f(a.MARKETING),
                  [a.SALE_OF_DATA]: f(a.SALE_OF_DATA),
                },
              },
              region: r || '',
              cus: d,
              purposes: {
                [c.ANALYTICS]: A(c.ANALYTICS),
                [c.PREFERENCES]: A(c.PREFERENCES),
                [c.MARKETING]: A(c.MARKETING),
                [c.SALE_OF_DATA]: A(c.SALE_OF_DATA),
              },
              sale_of_data_region: 't' == u,
              display_banner: 't' == s,
              consent_id: E,
            };
          })(n);
        return;
      })(n);
  }
  function w() {
    try {
      let n = S();
      if (!n) return;
      return n;
    } catch (n) {
      return;
    }
  }
  function v() {
    return {
      m: P(a.MARKETING),
      a: P(a.ANALYTICS),
      p: P(a.PREFERENCES),
      s: P(a.SALE_OF_DATA),
    };
  }
  function D() {
    return v()[a.SALE_OF_DATA];
  }
  function O() {
    let n =
      arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : null;
    return (null === n && (n = w()), void 0 === n);
  }
  function I(n) {
    switch (n) {
      case i.ACCEPTED:
        return r.ACCEPTED;
      case i.DECLINED:
        return r.DECLINED;
      default:
        return r.NO_VALUE;
    }
  }
  function R(n) {
    switch (n) {
      case a.ANALYTICS:
        return s.ANALYTICS;
      case a.MARKETING:
        return s.MARKETING;
      case a.PREFERENCES:
        return s.PREFERENCES;
      case a.SALE_OF_DATA:
        return s.SALE_OF_DATA;
    }
  }
  function P(n) {
    const e = w();
    if (!e) return i.NO_VALUE;
    const t = e.con.CMP;
    return t ? t[n] : i.NO_VALUE;
  }
  function L(n) {
    const e = S();
    console.log('nani', e);
    if (!e || !e.purposes) return !0;
    const t = e.purposes[n];
    console.log('wtf?', e);
    return 'boolean' != typeof t || t;
  }
  function k() {
    return L(c.PREFERENCES);
  }
  function b() {
    console.log('analyticsProcessingAllowed?');
    return L(c.ANALYTICS);
  }
  function M() {
    return L(c.MARKETING);
  }
  function F() {
    return L(c.SALE_OF_DATA);
  }
  function j() {
    const n = S();
    return !!n && 'boolean' == typeof n.display_banner && n.display_banner;
  }
  function K() {
    const n = S();
    return (n && n.sale_of_data_region) || !1;
  }
  function G() {
    const n = S();
    return (n && n.consent_id) || '';
  }
  const U = 'v0.2';
  function Y(n) {
    void 0 !== n.granular_consent &&
      (function (n) {
        const t = n[c.MARKETING],
          o = n[c.SALE_OF_DATA],
          r = n[c.ANALYTICS],
          i = n[c.PREFERENCES];
        !0 === t
          ? x(e.MARKETING_ACCEPTED)
          : !1 === t && x(e.MARKETING_DECLINED);
        !0 === o
          ? x(e.SALE_OF_DATA_ACCEPTED)
          : !1 === o && x(e.SALE_OF_DATA_DECLINED);
        !0 === r
          ? x(e.ANALYTICS_ACCEPTED)
          : !1 === r && x(e.ANALYTICS_DECLINED);
        !0 === i
          ? x(e.PREFERENCES_ACCEPTED)
          : !1 === i && x(e.PREFERENCES_DECLINED);
        const a = (function (n) {
          const e = {
            marketingAllowed: n[c.MARKETING],
            saleOfDataAllowed: n[c.SALE_OF_DATA],
            analyticsAllowed: n[c.ANALYTICS],
            preferencesAllowed: n[c.PREFERENCES],
            firstPartyMarketingAllowed: n[c.MARKETING],
            thirdPartyMarketingAllowed: n[c.SALE_OF_DATA],
          };
          return e;
        })(n);
        x(e.CONSENT_COLLECTED, a);
        const s = [r, i, t, o];
        s.every((n) => !0 === n) && x(e.TRACKING_ACCEPTED);
        s.every((n) => !1 === n) && x(e.TRACKING_DECLINED);
      })({
        [c.PREFERENCES]: k(),
        [c.ANALYTICS]: b(),
        [c.MARKETING]: M(),
        [c.SALE_OF_DATA]: F(),
      });
  }
  function x(n, e) {
    document.dispatchEvent(new CustomEvent(n, {detail: e || {}}));
  }
  function q(n, e) {
    if (!n) return;
    const t = (function (n) {
      const e = new URL(n, window.location.origin),
        t = B(n) ? V(e) : V(e).replace(window.location.origin, '');
      return document.querySelectorAll('a[href^="'.concat(t, '"]'));
    })(n);
    if (!t.length) return;
    const o = G(),
      r = (function (n) {
        const e = n();
        if (!e) return null;
        if (!('analytics' in e && 'marketing' in e && 'preferences' in e))
          return null;
        const t = H(e.analytics),
          o = H(e.marketing),
          r = H(e.preferences);
        return '' === t && '' === o && '' === r
          ? null
          : 'a'.concat(t, 'm').concat(o, 'p').concat(r);
      })(e);
    for (const e of Array.from(t)) {
      const t = e.getAttribute('href');
      if (!t) continue;
      const i = new URL(t, window.location.origin);
      if (
        (o && i.searchParams.set('consent_id', o),
        r && i.searchParams.set('consent', r),
        o || r)
      ) {
        const t = B(n)
          ? i.toString()
          : i.toString().replace(window.location.origin, '');
        e.setAttribute('href', t);
      }
    }
  }
  function V(n) {
    return ''.concat(n.origin).concat(n.pathname.replace(/\/$/, ''));
  }
  function B(n) {
    return n.startsWith('http://') || n.startsWith('https://');
  }
  function H(n) {
    switch (n) {
      case r.ACCEPTED:
        return '1';
      case r.DECLINED:
        return '0';
      default:
        return '';
    }
  }
  const J = '_landing_page',
    X = '_orig_referrer';
  function W(n) {
    const e = n.granular_consent,
      t = f(
        E(
          E(
            {
              visitorConsent: E(
                {
                  marketing: e.marketing,
                  analytics: e.analytics,
                  preferences: e.preferences,
                  saleOfData: e.sale_of_data,
                },
                e.metafields && {metafields: e.metafields},
              ),
            },
            e.email && {visitorEmail: e.email},
          ),
          {},
          {origReferrer: n.referrer, landingPage: n.landing_page},
        ),
      );
    return {
      query: 'query { consentManagement { cookies('.concat(
        t,
        ') { trackingConsentCookie cookieDomain landingPageCookie origReferrerCookie } customerAccountUrl } }',
      ),
      variables: {},
    };
  }
  function $(n, e, t) {
    const o = e.granular_consent,
      r =
        o.storefrontAccessToken ||
        (function () {
          const n = document.documentElement.querySelector('#shopify-features'),
            e = 'Could not find liquid access token';
          if (!n) return void _.warn(e);
          const t = JSON.parse(n.textContent || '').accessToken;
          if (!t) return void _.warn(e);
          return t;
        })(),
      // i = o.checkoutRootDomain || window.location.host,
      [apiProtocol, apiDomain] = o.checkoutRootDomain
        ? ['https:', o.checkoutRootDomain]
        : [window.location.protocol, window.location.host],
      c = o.isExtensionToken
        ? 'Shopify-Storefront-Extension-Token'
        : 'x-shopify-storefront-access-token',
      a = {
        headers: E(
          {'content-type': 'application/json', [c]: r},
          p() ? {'x-test-payload': JSON.stringify(e)} : {},
        ),
        body: JSON.stringify(W(e)),
        method: 'POST',
      };
    return fetch(
      apiProtocol.concat(
        '//',
        apiDomain,
        '/api/unstable/graphql.json?fast_storefront_renderer=staging-central',
      ),
      a,
    )
      .then((n) => {
        if (n.ok) return n.json();
        throw new Error('Server error');
      })
      .then((r) => {
        var i, c;
        const a = 31536e6,
          s = 12096e5,
          u = r.data.consentManagement.cookies.cookieDomain,
          l = u || o.checkoutRootDomain || window.location.hostname,
          d = o.storefrontRootDomain || u || window.location.hostname,
          E = r.data.consentManagement.cookies.trackingConsentCookie,
          f = r.data.consentManagement.cookies.landingPageCookie,
          A = r.data.consentManagement.cookies.origReferrerCookie,
          p =
            null !==
              (i =
                null === (c = r.data.consentManagement) || void 0 === c
                  ? void 0
                  : c.customerAccountUrl) && void 0 !== i
              ? i
              : '';
        return (
          E &&
            (function (n) {
              var e;
              ((null !== (e = window.Shopify) &&
                void 0 !== e &&
                e.customerPrivacy) ||
                ((window.Shopify = window.Shopify || {}),
                (window.Shopify.customerPrivacy = {})),
                (window.Shopify.customerPrivacy.cachedConsent = n));
            })(E),
          o.headlessStorefront &&
            (m(g, l, a, E),
            f && A && (m(J, l, s, f), m(X, l, s, A)),
            d !== l &&
              (m(g, d, a, E), f && A && (m(J, d, s, f), m(X, d, s, A)))),
          Y(e),
          q(p, n),
          void 0 !== t && t(null, r),
          r
        );
      })
      .catch((n) => {
        const e = 'Error while setting storefront API consent: ' + n.message;
        if (void 0 === t) throw {error: e};
        t({error: e});
      });
  }
  class z {
    constructor() {
      let n = arguments.length > 0 && void 0 !== arguments[0] && arguments[0];
      if (((this.useInstrumentation = !1), z.instance)) return z.instance;
      ((z.instance = this), (this.useInstrumentation = n));
    }
    instrumentationEnabled() {
      return this.useInstrumentation;
    }
    setUseInstrumentation(n) {
      this.useInstrumentation = n;
    }
    produce(n, e) {
      if (this.instrumentationEnabled() && b())
        try {
          const t = {
              schema_id: 'customer_privacy_api_events/2.0',
              payload: {
                shop_domain: window.location.host,
                method_name: n,
                call_details: e || null,
              },
            },
            o = {
              accept: '*/*',
              'accept-language': 'en-GB,en-US;q=0.9,en;q=0.8',
              'content-type': 'application/json; charset=utf-8',
              'x-monorail-edge-event-created-at-ms': String(Date.now()),
              'x-monorail-edge-event-sent-at-ms': String(Date.now()),
            };
          if (!window.location.host.endsWith('spin.dev'))
            return fetch('https://monorail-edge.shopifysvc.com/v1/produce', {
              headers: o,
              body: JSON.stringify(t),
              method: 'POST',
              mode: 'cors',
              credentials: 'omit',
            });
          console.log('Monorail event from consent API:', o, t);
        } catch (n) {}
    }
  }
  function Q(n, e) {
    if (
      (new z().produce('setTrackingConsent', U),
      (function (n) {
        if ('boolean' != typeof n && 'object' != typeof n)
          throw TypeError(
            'setTrackingConsent must be called with a boolean or object consent value',
          );
        if ('object' == typeof n) {
          const e = Object.keys(n);
          if (0 === e.length)
            throw TypeError('The submitted consent object is empty.');
          const t = [
            s.MARKETING,
            s.ANALYTICS,
            s.PREFERENCES,
            s.SALE_OF_DATA,
            s.EMAIL,
            u.ROOT_DOMAIN,
            u.CHECKOUT_ROOT_DOMAIN,
            u.STOREFRONT_ROOT_DOMAIN,
            u.STOREFRONT_ACCESS_TOKEN,
            u.HEADLESS_STOREFRONT,
            u.IS_EXTENSION_TOKEN,
            u.METAFIELDS,
          ];
          for (const n of e)
            if (!t.includes(n))
              throw TypeError(
                'The submitted consent object should only contain the following keys: '
                  .concat(t.join(', '), '. Extraneous key: ')
                  .concat(n, '.'),
              );
        }
      })(n),
      void 0 !== e && 'function' != typeof e)
    )
      throw TypeError(
        'setTrackingConsent must be called with a callback function if the callback argument is provided',
      );
    const t = (function (n) {
        if (!n) return null;
        return en() ? document.referrer : '';
      })(n.analytics),
      o = (function (n) {
        if (!n) return null;
        return en() ? window.location.pathname + window.location.search : '/';
      })(n.analytics);
    return $(
      un,
      E(
        E({granular_consent: n}, null !== t && {referrer: t}),
        null !== o && {landing_page: o},
      ),
      e,
    );
  }
  function Z() {
    if ((new z().produce('getTrackingConsent', U), O())) return r.NO_VALUE;
    const n = v();
    return n[a.MARKETING] === i.ACCEPTED && n[a.ANALYTICS] === i.ACCEPTED
      ? r.ACCEPTED
      : n[a.MARKETING] === i.DECLINED || n[a.ANALYTICS] === i.DECLINED
        ? r.DECLINED
        : r.NO_INTERACTION;
  }
  function nn() {
    return (function () {
      const n = w();
      return O(n) ? '' : n.region || '';
    })();
  }
  function en() {
    if ('' === document.referrer) return !0;
    const n = document.createElement('a');
    return (
      (n.href = document.referrer),
      window.location.hostname != n.hostname
    );
  }
  function tn() {
    return !!O() || (M() && b());
  }
  function on() {
    return K()
      ? 'string' == typeof navigator.globalPrivacyControl
        ? '1' !== navigator.globalPrivacyControl
        : 'boolean' == typeof navigator.globalPrivacyControl
          ? !navigator.globalPrivacyControl
          : null
      : null;
  }
  function rn() {
    return j() && Z() === r.NO_INTERACTION;
  }
  function cn() {
    return !1 === on()
      ? r.DECLINED
      : ((n = D()),
        O() ? r.NO_VALUE : n === i.NO_VALUE ? r.NO_INTERACTION : I(n));
    var n;
  }
  function an() {
    return !0;
  }
  function sn(n) {
    return (function (n) {
      const e = w();
      if (O(e) || !e.cus) return;
      const t = e.cus[encodeURIComponent(n)];
      return t ? decodeURIComponent(t) : t;
    })(n);
  }
  function un() {
    const n = {},
      e = v();
    for (const t of Object.keys(e)) n[R(t)] = I(e[t]);
    return n;
  }
  function ln() {
    return G();
  }
  z.instance = void 0;
  const dn = '95ba910bcec4542ef2a0b64cd7ca666c';
  function En(n, e, t) {
    try {
      var o;
      !(function (n) {
        const e = new XMLHttpRequest();
        (e.open(
          'POST',
          'https://error-analytics-production.shopifysvc.com',
          !0,
        ),
          e.setRequestHeader('Content-Type', 'application/json'),
          e.setRequestHeader('Bugsnag-Api-Key', dn),
          e.setRequestHeader('Bugsnag-Payload-Version', '5'));
        const t = (function (n) {
          const e = (function (n) {
              return n.stackTrace || n.stack || n.description || n.name;
            })(n.error),
            [t, o] = (e || 'unknown error').split('\n')[0].split(':');
          return JSON.stringify({
            payloadVersion: 5,
            notifier: {name: 'ConsentTrackingAPI', version: 'latest', url: '-'},
            events: [
              {
                exceptions: [
                  {
                    errorClass: (t || '').trim(),
                    message: (o || '').trim(),
                    stacktrace: [
                      {
                        file: 'consent-tracking-api.js',
                        lineNumber: '1',
                        method: e,
                      },
                    ],
                    type: 'browserjs',
                  },
                ],
                context: 'general',
                app: {id: 'ConsentTrackingAPI', version: 'latest'},
                metaData: {
                  request: {shopId: n.shopId, shopUrl: window.location.href},
                  device: {userAgent: window.navigator.userAgent},
                  'Additional Notes': n.notes,
                },
                unhandled: !1,
              },
            ],
          });
        })(n);
        e.send(t);
      })({
        error: n,
        context: null != e ? e : '',
        shopId:
          An() ||
          (null === (o = window.Shopify) || void 0 === o ? void 0 : o.shop),
        notes: null != t ? t : '',
      });
    } catch (n) {}
  }
  function fn(n) {
    return function () {
      try {
        return n(...arguments);
      } catch (n) {
        throw (En(n), n);
      }
    };
  }
  function An() {
    try {
      var n;
      const e =
        null === (n = document.getElementById('shopify-features')) ||
        void 0 === n
          ? void 0
          : n.textContent;
      return e ? JSON.parse(e).shopId : null;
    } catch (n) {
      return null;
    }
  }
  function pn() {
    return M();
  }
  function Cn() {
    return F();
  }
  const _n = (n) => {
    let {useBugsnagReporting: e, useInstrumentation: t} = n;
    D() != i.DECLINED && !1 === on() && Q({sale_of_data: !1}, () => !1);
    const o = {
      analyticsProcessingAllowed: b,
      currentVisitorConsent: un,
      doesMerchantSupportGranularConsent: an,
      firstPartyMarketingAllowed: pn,
      getCCPAConsent: cn,
      getRegion: nn,
      getTrackingConsent: Z,
      getTrackingConsentMetafield: sn,
      marketingAllowed: pn,
      preferencesProcessingAllowed: k,
      saleOfDataAllowed: Cn,
      saleOfDataRegion: K,
      setTrackingConsent: Q,
      shouldShowBanner: j,
      shouldShowGDPRBanner: rn,
      thirdPartyMarketingAllowed: Cn,
      userCanBeTracked: tn,
      consentId: ln,
      unstable: {},
      __metadata__: {
        name: '@shopify/consent-tracking-api',
        version: U,
        description: 'Shopify Consent Tracking API',
      },
    };
    if ((new z(t), !e)) return o;
    const r = ['unstable'];
    for (const n in o)
      o.hasOwnProperty(n) && (o[n] = r.includes(n) ? o[n] : fn(o[n]));
    return o;
  };
  function gn() {
    return _n(
      arguments.length > 0 && void 0 !== arguments[0]
        ? arguments[0]
        : {useBugsnagReporting: !1, useInstrumentation: !1},
    );
  }
  function Tn() {
    var n, t, o, r, i;
    const c = gn({useBugsnagReporting: !0, useInstrumentation: !0});
    if (
      (null === (n = window.Shopify.trackingConsent) || void 0 === n
        ? void 0
        : n.__metadata__) ||
      (null === (t = window.Shopify.customerPrivacy) || void 0 === t
        ? void 0
        : t.__metadata__)
    ) {
      const n =
          null ===
            (r =
              null === (o = window.Shopify.customerPrivacy) || void 0 === o
                ? void 0
                : o.__metadata__) || void 0 === r
            ? void 0
            : r.version,
        e = null === (i = c.__metadata__) || void 0 === i ? void 0 : i.version,
        t = `Multiple versions of Shopify.trackingConsent or Shopify.customerPrivacy loaded -  Version '${n}' is already loaded but replacing with version '${e}'.\n\nThis could result in unexpected behavior. See documentation https://shopify.dev/docs/api/customer-privacy for more information.`,
        a =
          'Shopify.trackingConsent or Shopify.customerPrivacy already exists.\n\nLoading multiple versions could result in unexpected behavior. See documentation https://shopify.dev/docs/api/customer-privacy for more information.';
      console.warn(n && e ? t : a);
    }
    const a = Object.assign(
      Object.assign({}, window.Shopify.customerPrivacy),
      c,
    );
    ((window.Shopify.customerPrivacy = window.Shopify.trackingConsent = a),
      x(e.CONSENT_TRACKING_API_LOADED));
  }
  ((window.Shopify = window.Shopify ? window.Shopify : {}),
    Tn(),
    (n.default = gn),
    (n.setGlobalObject = Tn),
    Object.defineProperty(n, '__esModule', {value: !0}));
})({});
//# sourceMappingURL=consent-tracking-api.js.map
