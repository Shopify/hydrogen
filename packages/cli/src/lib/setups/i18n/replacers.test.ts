import {fileURLToPath} from 'node:url';
import {describe, it, expect} from 'vitest';
import {
  inTemporaryDirectory,
  copyFile,
  readFile,
  writeFile,
} from '@shopify/cli-kit/node/fs';
import {joinPath} from '@shopify/cli-kit/node/path';
import {ts} from 'ts-morph';
import {getSkeletonSourceDir} from '../../build.js';
import {replaceRemixEnv, replaceServerI18n} from './replacers.js';
import {DEFAULT_COMPILER_OPTIONS} from '../../transpile/morph/index.js';

const remixDts = 'remix.env.d.ts';
const serverTs = 'server.ts';

const checkTypes = (content: string) => {
  const {diagnostics} = ts.transpileModule(content, {
    reportDiagnostics: true,
    compilerOptions: DEFAULT_COMPILER_OPTIONS,
  });

  if (diagnostics && diagnostics.length > 0) {
    throw new Error(
      ts.formatDiagnostics(
        diagnostics,
        ts.createCompilerHost(DEFAULT_COMPILER_OPTIONS),
      ),
    );
  }
};

describe('i18n replacers', () => {
  it('adds i18n type to remix.env.d.ts', async () => {
    await inTemporaryDirectory(async (tmpDir) => {
      const skeletonDir = getSkeletonSourceDir();
      await copyFile(
        joinPath(skeletonDir, remixDts),
        joinPath(tmpDir, remixDts),
      );

      await replaceRemixEnv(
        {rootDirectory: tmpDir},
        {},
        await readFile(
          fileURLToPath(new URL('./templates/domains.ts', import.meta.url)),
        ),
      );

      const newContent = await readFile(joinPath(tmpDir, remixDts));
      expect(() => checkTypes(newContent)).not.toThrow();

      expect(newContent).toMatchInlineSnapshot(`
        "/// <reference types="@remix-run/dev" />
        /// <reference types="@shopify/remix-oxygen" />
        /// <reference types="@shopify/oxygen-workers-types" />

        // Enhance TypeScript's built-in typings.
        import "@total-typescript/ts-reset";

        import type {
          Storefront,
          CustomerAccount,
          HydrogenCart,
          HydrogenSessionData,
        } from "@shopify/hydrogen";
        import type {
          LanguageCode,
          CountryCode,
        } from "@shopify/hydrogen/storefront-api-types";
        import type { AppSession } from "~/lib/session";

        declare global {
          /**
           * A global \`process\` object is only available during build to access NODE_ENV.
           */
          const process: { env: { NODE_ENV: "production" | "development" } };

          /**
           * Declare expected Env parameter in fetch handler.
           */
          interface Env {
            SESSION_SECRET: string;
            PUBLIC_STOREFRONT_API_TOKEN: string;
            PRIVATE_STOREFRONT_API_TOKEN: string;
            PUBLIC_STORE_DOMAIN: string;
            PUBLIC_STOREFRONT_ID: string;
            PUBLIC_CUSTOMER_ACCOUNT_API_CLIENT_ID: string;
            PUBLIC_CUSTOMER_ACCOUNT_API_URL: string;
            PUBLIC_CHECKOUT_DOMAIN: string;
          }

          /**
           * The I18nLocale used for Storefront API query context.
           */
          type I18nLocale = { language: LanguageCode; country: CountryCode };
        }

        declare module "@shopify/remix-oxygen" {
          /**
           * Declare local additions to the Remix loader context.
           */
          interface AppLoadContext {
            env: Env;
            cart: HydrogenCart;
            storefront: Storefront<I18nLocale>;
            customerAccount: CustomerAccount;
            session: AppSession;
            waitUntil: ExecutionContext["waitUntil"];
          }

          /**
           * Declare local additions to the Remix session data.
           */
          interface SessionData extends HydrogenSessionData {}
        }
        "
      `);
    });
  });

  it('adds i18n type to server.ts', async () => {
    await inTemporaryDirectory(async (tmpDir) => {
      const skeletonDir = getSkeletonSourceDir();

      await writeFile(
        joinPath(tmpDir, serverTs),
        // Remove the part that is not needed for this test (AppSession, Cart query, etc);
        (
          await readFile(joinPath(skeletonDir, serverTs))
        ).replace(/^};$.*/ms, '};'),
      );

      await replaceServerI18n(
        {rootDirectory: tmpDir, serverEntryPoint: serverTs},
        {},
        await readFile(
          fileURLToPath(new URL('./templates/domains.ts', import.meta.url)),
        ),
        false,
      );

      const newContent = await readFile(joinPath(tmpDir, serverTs));
      expect(() => checkTypes(newContent)).not.toThrow();

      expect(newContent).toMatchInlineSnapshot(`
        "// Virtual entry point for the app
        import * as remixBuild from "@remix-run/dev/server-build";
        import {
          cartGetIdDefault,
          cartSetIdDefault,
          createCartHandler,
          createStorefrontClient,
          storefrontRedirect,
          createCustomerAccountClient,
        } from "@shopify/hydrogen";
        import {
          createRequestHandler,
          getStorefrontHeaders,
          type AppLoadContext,
        } from "@shopify/remix-oxygen";
        import { AppSession } from "~/lib/session";
        import { CART_QUERY_FRAGMENT } from "~/lib/fragments";

        /**
         * Export a fetch handler in module format.
         */
        export default {
          async fetch(
            request: Request,
            env: Env,
            executionContext: ExecutionContext
          ): Promise<Response> {
            try {
              /**
               * Open a cache instance in the worker and a custom session instance.
               */
              if (!env?.SESSION_SECRET) {
                throw new Error("SESSION_SECRET environment variable is not set");
              }

              const waitUntil = executionContext.waitUntil.bind(executionContext);
              const [cache, session] = await Promise.all([
                caches.open("hydrogen"),
                AppSession.init(request, [env.SESSION_SECRET]),
              ]);

              /**
               * Create Hydrogen's Storefront client.
               */
              const { storefront } = createStorefrontClient({
                cache,
                waitUntil,
                i18n: getLocaleFromRequest(request),
                publicStorefrontToken: env.PUBLIC_STOREFRONT_API_TOKEN,
                privateStorefrontToken: env.PRIVATE_STOREFRONT_API_TOKEN,
                storeDomain: env.PUBLIC_STORE_DOMAIN,
                storefrontId: env.PUBLIC_STOREFRONT_ID,
                storefrontHeaders: getStorefrontHeaders(request),
              });

              /**
               * Create a client for Customer Account API.
               */
              const customerAccount = createCustomerAccountClient({
                waitUntil,
                request,
                session,
                customerAccountId: env.PUBLIC_CUSTOMER_ACCOUNT_API_CLIENT_ID,
                customerAccountUrl: env.PUBLIC_CUSTOMER_ACCOUNT_API_URL,
              });

              /*
               * Create a cart handler that will be used to
               * create and update the cart in the session.
               */
              const cart = createCartHandler({
                storefront,
                customerAccount,
                getCartId: cartGetIdDefault(request.headers),
                setCartId: cartSetIdDefault(),
                cartQueryFragment: CART_QUERY_FRAGMENT,
              });

              /**
               * Create a Remix request handler and pass
               * Hydrogen's Storefront client to the loader context.
               */
              const handleRequest = createRequestHandler({
                build: remixBuild,
                mode: process.env.NODE_ENV,
                getLoadContext: (): AppLoadContext => ({
                  session,
                  storefront,
                  customerAccount,
                  cart,
                  env,
                  waitUntil,
                }),
              });

              const response = await handleRequest(request);

              if (response.status === 404) {
                /**
                 * Check for redirects only when there's a 404 from the app.
                 * If the redirect doesn't exist, then \`storefrontRedirect\`
                 * will pass through the 404 response.
                 */
                return storefrontRedirect({ request, response, storefront });
              }

              return response;
            } catch (error) {
              // eslint-disable-next-line no-console
              console.error(error);
              return new Response("An unexpected error occurred", { status: 500 });
            }
          },
        };

        function getLocaleFromRequest(request: Request): I18nLocale {
          const defaultLocale: I18nLocale = { language: "EN", country: "US" };
          const supportedLocales = {
            ES: "ES",
            FR: "FR",
            DE: "DE",
            JP: "JA",
          } as Record<I18nLocale["country"], I18nLocale["language"]>;

          const url = new URL(request.url);
          const domain = url.hostname
            .split(".")
            .pop()
            ?.toUpperCase() as keyof typeof supportedLocales;

          return domain && supportedLocales[domain]
            ? { language: supportedLocales[domain], country: domain }
            : defaultLocale;
        }
        "
      `);
    });
  });
});
