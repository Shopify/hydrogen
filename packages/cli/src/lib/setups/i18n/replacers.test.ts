import {describe, it, expect} from 'vitest';
import {
  inTemporaryDirectory,
  copyFile,
  readFile,
  writeFile,
} from '@shopify/cli-kit/node/fs';
import {joinPath} from '@shopify/cli-kit/node/path';
import {ts} from 'ts-morph';
import {getAssetsDir, getSkeletonSourceDir} from '../../build.js';
import {replaceServerI18n} from './replacers.js';
import {DEFAULT_COMPILER_OPTIONS} from '../../transpile/morph/index.js';

const envDts = 'env.d.ts';
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
        await readFile(await getAssetsDir('i18n', 'domains.ts')),
        false,
      );

      const newContent = await readFile(joinPath(tmpDir, serverTs));
      expect(() => checkTypes(newContent)).not.toThrow();

      expect(newContent).toMatchInlineSnapshot(`
        "// @ts-ignore
        // Virtual entry point for the app
        import * as remixBuild from "virtual:remix/server-build";
        import { storefrontRedirect, createHydrogenContext } from "@shopify/hydrogen";
        import {
          createRequestHandler,
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

              const hydrogenContext = createHydrogenContext({
                env,
                request,
                cache,
                waitUntil,
                session,
                i18n: getLocaleFromRequest(request),
                cart: {
                  queryFragment: CART_QUERY_FRAGMENT,
                },
              });

              /**
               * Create a Remix request handler and pass
               * Hydrogen's Storefront client to the loader context.
               */
              const handleRequest = createRequestHandler({
                build: remixBuild,
                mode: process.env.NODE_ENV,
                getLoadContext: (): AppLoadContext => ({
                  ...hydrogenContext,
                  // declare additional Remix loader context here
                }),
              });

              const response = await handleRequest(request);

              if (session.isPending) {
                response.headers.set("Set-Cookie", await session.commit());
              }

              if (response.status === 404) {
                /**
                 * Check for redirects only when there's a 404 from the app.
                 * If the redirect doesn't exist, then \`storefrontRedirect\`
                 * will pass through the 404 response.
                 */
                return storefrontRedirect({
                  request,
                  response,
                  storefront: hydrogenContext.storefront,
                });
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
