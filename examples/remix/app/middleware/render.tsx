import type { RemixNode } from "remix/component";
import {
  render as remixRender,
  renderWith,
  Renderer,
  type RenderFunction,
} from "remix/middleware/render";
import { createMiddleware } from "remix/router";

import { assets, type DocumentAssets } from "../assets.ts";
import { AppShell } from "../ui/app-shell.tsx";
import { LayoutContext, type LoadLayout } from "./layout.ts";
import { LocaleContext } from "./locale.ts";

/**
 * Remix's streaming renderer, wrapped so every `context.render(page)` call renders inside
 * the app shell: document assets, the active locale, and the layout data the page's
 * `<Document>` reads for its header, footer, cart, and analytics.
 */
export function render(documentAssets: DocumentAssets) {
  return createMiddleware(
    remixRender({ assets }),
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

        return renderNode(
          <AppShell
            assets={documentAssets}
            layout={layout}
            locale={context.get(LocaleContext)}
            pathname={context.url.pathname}
          >
            {node}
          </AppShell>,
          init,
        );
      };
    }),
  );
}
