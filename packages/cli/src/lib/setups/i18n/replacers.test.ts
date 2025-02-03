import {describe, it, expect} from 'vitest';
import {
  inTemporaryDirectory,
  readFile,
  copyFile,
  fileExists,
} from '@shopify/cli-kit/node/fs';
import {joinPath, dirname} from '@shopify/cli-kit/node/path';
import {ts} from 'ts-morph';
import {getAssetsDir, getSkeletonSourceDir} from '../../build.js';
import {replaceContextI18n} from './replacers.js';
import {DEFAULT_COMPILER_OPTIONS} from '../../transpile/morph/index.js';

const contextTs = 'app/lib/context.ts';
const expectedI18nFileTs = 'app/lib/i18n.ts';

const contextJs = 'app/lib/context.js';
const expectedI18nFileJs = 'app/lib/i18n.js';

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
  it('adds i18n function call to context create file', async () => {
    await inTemporaryDirectory(async (tmpDir) => {
      const skeletonContextFilePath = joinPath(
        getSkeletonSourceDir(),
        contextTs,
      );
      const testContextFilePath = joinPath(tmpDir, contextTs);

      await copyFile(skeletonContextFilePath, testContextFilePath);

      await replaceContextI18n(
        {rootDirectory: tmpDir, contextCreate: contextTs},
        {},
        await getAssetsDir('i18n', 'domains.ts'),
      );

      const newContent = await readFile(testContextFilePath);
      expect(() => checkTypes(newContent)).not.toThrow();

      expect(newContent).toMatchInlineSnapshot(`
        "import { createHydrogenContext } from "@shopify/hydrogen";
        import { AppSession } from "~/lib/session";
        import { CART_QUERY_FRAGMENT } from "~/lib/fragments";
        import { getLocaleFromRequest } from "~/lib/i18n";

        /**
         * The context implementation is separate from server.ts
         * so that type can be extracted for AppLoadContext
         * */
        export async function createAppLoadContext(
          request: Request,
          env: Env,
          executionContext: ExecutionContext
        ) {
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

          return {
            ...hydrogenContext,
            // declare additional Remix loader context
          };
        }
        "
      `);
    });
  });

  it('adds i18n domains strategy to a file sitting next to the context file', async () => {
    await inTemporaryDirectory(async (tmpDir) => {
      const skeletonContextFilePath = joinPath(
        getSkeletonSourceDir(),
        contextTs,
      );
      const testContextFilePath = joinPath(tmpDir, contextTs);

      await copyFile(skeletonContextFilePath, testContextFilePath);

      await replaceContextI18n(
        {rootDirectory: tmpDir, contextCreate: contextTs},
        {},
        await getAssetsDir('i18n', 'domains.ts'),
      );

      const newContent = await readFile(joinPath(tmpDir, expectedI18nFileTs));
      expect(() => checkTypes(newContent)).not.toThrow();

      expect(newContent).toMatchInlineSnapshot(`
        "import type { I18nBase } from "@shopify/hydrogen";

        export function getLocaleFromRequest(request: Request): I18nBase {
          const defaultLocale: I18nBase = { language: "EN", country: "US" };
          const supportedLocales = {
            ES: "ES",
            FR: "FR",
            DE: "DE",
            JP: "JA",
          } as Record<I18nBase["country"], I18nBase["language"]>;

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

  it('adds i18n subdomains strategy to a file sitting next to the context file', async () => {
    await inTemporaryDirectory(async (tmpDir) => {
      const skeletonContextFilePath = joinPath(
        getSkeletonSourceDir(),
        contextTs,
      );
      const testContextFilePath = joinPath(tmpDir, contextTs);

      await copyFile(skeletonContextFilePath, testContextFilePath);

      await replaceContextI18n(
        {rootDirectory: tmpDir, contextCreate: contextTs},
        {},
        await getAssetsDir('i18n', 'subdomains.ts'),
      );

      const newContent = await readFile(joinPath(tmpDir, expectedI18nFileTs));
      expect(() => checkTypes(newContent)).not.toThrow();

      expect(newContent).toMatchInlineSnapshot(`
        "import type { I18nBase } from "@shopify/hydrogen";

        export function getLocaleFromRequest(request: Request): I18nBase {
          const defaultLocale: I18nBase = { language: "EN", country: "US" };
          const supportedLocales = {
            ES: "ES",
            FR: "FR",
            DE: "DE",
            JP: "JA",
          } as Record<I18nBase["country"], I18nBase["language"]>;

          const url = new URL(request.url);
          const firstSubdomain = url.hostname
            .split(".")[0]
            ?.toUpperCase() as keyof typeof supportedLocales;

          return supportedLocales[firstSubdomain]
            ? { language: supportedLocales[firstSubdomain], country: firstSubdomain }
            : defaultLocale;
        }
        "
      `);
    });
  });

  it('adds i18n subfolders strategy to a file sitting next to the context file', async () => {
    await inTemporaryDirectory(async (tmpDir) => {
      const skeletonContextFilePath = joinPath(
        getSkeletonSourceDir(),
        contextTs,
      );
      const testContextFilePath = joinPath(tmpDir, contextTs);

      await copyFile(skeletonContextFilePath, testContextFilePath);

      await replaceContextI18n(
        {rootDirectory: tmpDir, contextCreate: contextTs},
        {},
        await getAssetsDir('i18n', 'subfolders.ts'),
      );

      const newContent = await readFile(joinPath(tmpDir, expectedI18nFileTs));
      expect(() => checkTypes(newContent)).not.toThrow();

      expect(newContent).toMatchInlineSnapshot(`
        "import type { I18nBase } from "@shopify/hydrogen";

        export interface I18nLocale extends I18nBase {
          pathPrefix: string;
        }

        export function getLocaleFromRequest(request: Request): I18nLocale {
          const url = new URL(request.url);
          const firstPathPart = url.pathname.split("/")[1]?.toUpperCase() ?? "";

          type I18nFromUrl = [I18nLocale["language"], I18nLocale["country"]];

          let pathPrefix = "";
          let [language, country]: I18nFromUrl = ["EN", "US"];

          if (/^[A-Z]{2}-[A-Z]{2}$/i.test(firstPathPart)) {
            pathPrefix = "/" + firstPathPart;
            [language, country] = firstPathPart.split("-") as I18nFromUrl;
          }

          return { language, country, pathPrefix };
        }
        "
      `);
    });
  });

  it('does not add i18n strategy file if it already exist', async () => {
    await inTemporaryDirectory(async (tmpDir) => {
      const skeletonContextFilePath = joinPath(
        getSkeletonSourceDir(),
        contextTs,
      );
      const testContextFilePath = joinPath(tmpDir, contextTs);

      await copyFile(skeletonContextFilePath, testContextFilePath);

      await copyFile(
        await getAssetsDir('i18n', 'domains.ts'),
        joinPath(tmpDir, dirname(contextTs), 'i18n.ts'),
      );

      expect(async () => {
        await replaceContextI18n(
          {rootDirectory: tmpDir, contextCreate: contextTs},
          {},
          await getAssetsDir('i18n', 'domains.ts'),
        );
      }).rejects.toThrow();
    });
  });

  it('adds js i18n domains strategy to a file sitting next to the context file', async () => {
    await inTemporaryDirectory(async (tmpDir) => {
      const skeletonContextFilePath = joinPath(
        getSkeletonSourceDir(),
        contextTs,
      );
      const testContextFilePath = joinPath(tmpDir, contextJs);

      await copyFile(skeletonContextFilePath, testContextFilePath);

      await replaceContextI18n(
        {rootDirectory: tmpDir, contextCreate: contextJs},
        {},
        await getAssetsDir('i18n', 'domains.ts'),
      );

      expect(await fileExists(expectedI18nFileTs)).toBe(false);

      const newContent = await readFile(joinPath(tmpDir, expectedI18nFileJs));
      expect(() => checkTypes(newContent)).not.toThrow();

      expect(newContent).toMatchInlineSnapshot(`
        "/**
         * @param {Request} request
         * @return {I18nBase}
         */
        export function getLocaleFromRequest(request) {
          const defaultLocale = { language: "EN", country: "US" };
          const supportedLocales = {
            ES: "ES",
            FR: "FR",
            DE: "DE",
            JP: "JA",
          };

          const url = new URL(request.url);
          const domain = url.hostname.split(".").pop()?.toUpperCase();

          return domain && supportedLocales[domain]
            ? { language: supportedLocales[domain], country: domain }
            : defaultLocale;
        }

        /** @typedef {import('@shopify/hydrogen').I18nBase} I18nBase */
        "
      `);
    });
  });
});
