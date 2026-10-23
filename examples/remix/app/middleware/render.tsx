import type { RemixNode } from "remix/component";
import {
  render as remixRender,
  renderWith,
  Renderer,
  type RenderFunction,
} from "remix/middleware/render";
import { createContextKey, createMiddleware, type Middleware } from "remix/router";

import { assets, type DocumentAssets } from "../assets.ts";
import { BROWSING } from "../lib/cache-control.ts";
import { AppShell } from "../ui/app-shell.tsx";
import { allowBrowsingCache } from "./browsing-cache.ts";
import { LayoutContext, type LoadLayout } from "./layout.ts";
import { LocaleContext } from "./locale.ts";

export const FragmentRendererContext = createContextKey<RenderFunction>();
const fragmentRendererProperty = { property: "renderFragment" } as const;

/**
 * Remix's streaming renderer, wrapped so every `context.render(page)` call renders inside
 * the app shell: document assets, the active locale, and the layout data the page's
 * `<Document>` reads for its header, footer, cart, and analytics.
 *
 * `context.renderFragment(node)` renders without the shell or its layout data, for
 * routes that a `<Frame>` streams into a page.
 */
export function render(documentAssets: DocumentAssets) {
  return createMiddleware(
    remixRender({ assets }),
    fragmentRenderer(),
    renderWith((context) => {
      // Capture Remix's renderer before `renderWith` installs this wrapper.
      const renderNode = context.get(Renderer) as RenderFunction;

      return async function renderPage(node: RemixNode, init?: ResponseInit) {
        const status = init?.status ?? 200;
        const loadLayout = context.get(LayoutContext) as LoadLayout | undefined;
        const layout = loadLayout
          ? await loadLayout().catch((error: unknown) => {
              // An error page still renders when the shell's own data is unavailable.
              if (status >= 400) return null;
              throw error;
            })
          : null;

        // `BROWSING_HEADERS` opts the page in; `browsingCache()` decides whether the response
        // keeps the policy, after Hydrogen's response headers.
        const headers = new Headers(init?.headers);
        if (headers.get("Cache-Control") === BROWSING) {
          headers.delete("Cache-Control");
          allowBrowsingCache(context);
        }

        return renderNode(
          <AppShell
            assets={documentAssets}
            layout={layout}
            locale={context.get(LocaleContext)}
            pathname={context.url.pathname}
          >
            {node}
          </AppShell>,
          { ...init, headers },
        );
      };
    }),
  );
}

function fragmentRenderer(): Middleware<{
  key: typeof FragmentRendererContext;
  value: RenderFunction;
  property: "renderFragment";
}> {
  return (context, next) => {
    context.set(
      FragmentRendererContext,
      context.get(Renderer) as RenderFunction,
      fragmentRendererProperty,
    );
    return next();
  };
}
