/* eslint-disable no-undef */
import {
  createRequestHandler,
  logDevReady,
  createCookieFactory,
  createCookieSessionStorageFactory,
} from '@remix-run/server-runtime';
import {createStorefrontClient, InMemoryCache} from '@shopify/hydrogen';
import {resolve} from 'node:path';
import build from './build';

if (Bun.env.NODE_ENV === 'development') logDevReady(build);

const env = Bun.env;

export default {
  port: Bun.env.PORT || 3000,
  async fetch(request) {
    let {pathname} = new URL(request.url);

    let file = Bun.file(resolve(__dirname, './public', `./${pathname}`));

    if (await file.exists()) return new Response(file);

    return await createRequestHandler(build, 'development')(
      request,
      await getContext(request),
    );
  },
};

async function getContext(req) {
  const session = await HydrogenSession.init(req, [env.SESSION_SECRET]);

  const {storefront} = createStorefrontClient({
    // A [`cache` instance](https://developer.mozilla.org/en-US/docs/Web/API/Cache) is necessary for sub-request caching to work.
    // We provide only an in-memory implementation
    cache: new InMemoryCache(),
    // `waitUntil` is only needed on worker environments. For Express/Node, it isn't applicable
    waitUntil: null,
    i18n: {language: 'EN', country: 'US'},
    publicStorefrontToken: env.PUBLIC_STOREFRONT_API_TOKEN,
    privateStorefrontToken: env.PRIVATE_STOREFRONT_API_TOKEN,
    storeDomain: env.PUBLIC_STORE_DOMAIN,
    storefrontId: env.PUBLIC_STOREFRONT_ID,
    storefrontHeaders: {
      requestGroupId: req.headers.get('request-id'),
      buyerIp: req.headers.get('oxygen-buyer-ip'),
      cookie: req.headers.get('cookie'),
    },
  });

  return {session, storefront, env};
}

class HydrogenSession {
  constructor(sessionStorage, session) {
    this.sessionStorage = sessionStorage;
    this.session = session;
  }

  static async init(request, secrets) {
    const createCookie = createCookieFactory({sign, unsign});

    const storage = createCookieSessionStorageFactory(createCookie)({
      cookie: {
        name: 'session',
        httpOnly: true,
        path: '/',
        sameSite: 'lax',
        secrets,
      },
    });

    const session = await storage.getSession(request.headers.get('Cookie'));

    return new this(storage, session);
  }

  get(key) {
    return this.session.get(key);
  }

  destroy() {
    return this.sessionStorage.destroySession(this.session);
  }

  flash(key, value) {
    this.session.flash(key, value);
  }

  unset(key) {
    this.session.unset(key);
  }

  set(key, value) {
    this.session.set(key, value);
  }

  commit() {
    return this.sessionStorage.commitSession(this.session);
  }
}

const encoder = new TextEncoder();

const sign = async (value, secret) => {
  const data = encoder.encode(value);
  const key = await createKey(secret, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', key, data);
  const hash = btoa(String.fromCharCode(...new Uint8Array(signature))).replace(
    /=+$/,
    '',
  );

  return value + '.' + hash;
};

const unsign = async (cookie, secret) => {
  const value = cookie.slice(0, cookie.lastIndexOf('.'));
  const hash = cookie.slice(cookie.lastIndexOf('.') + 1);

  const data = encoder.encode(value);
  const key = await createKey(secret, ['verify']);
  const signature = byteStringToUint8Array(atob(hash));
  const valid = await crypto.subtle.verify('HMAC', key, signature, data);

  return valid ? value : false;
};

async function createKey(secret, usages) {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    {name: 'HMAC', hash: 'SHA-256'},
    false,
    usages,
  );

  return key;
}

function byteStringToUint8Array(byteString) {
  const array = new Uint8Array(byteString.length);

  for (let i = 0; i < byteString.length; i++) {
    array[i] = byteString.charCodeAt(i);
  }

  return array;
}
