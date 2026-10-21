import {
  getShopifyScriptTags,
  type ShopifyScriptTagDescriptor,
  type ShopifyScriptTagDescriptors,
} from "@shopify/hydrogen";
import { unsafeHTML, type Handle, type RemixNode } from "remix/component";
import { ImportMap } from "remix/component/server";

import { CartAside } from "../assets/public/cart.tsx";
import { MobileMenuAside } from "../assets/public/mobile-menu.tsx";
import { SearchAside } from "../assets/public/search-aside.tsx";
import type { Layout } from "../lib/layout.ts";
import { toHtmlLang } from "../lib/public/i18n.ts";
import { AppShell } from "./app-shell.tsx";
import { Footer } from "./footer.tsx";
import { Header, headerMenuLinks } from "./header.tsx";

export type DocumentProps = {
  title: string;
  description?: string | null;
  /** A canonical path such as `/products/hat`, resolved against the request origin. */
  canonicalPath?: string;
  children?: RemixNode;
};

/** The full HTML document every page renders: head, header, asides, main, and footer. */
export function Document(handle: Handle<DocumentProps>) {
  return () => {
    const { assets, layout, locale, pathname } = handle.context.get(AppShell);
    const { canonicalPath, children, description, title } = handle.props;
    const shopifyScripts = getScripts(layout);

    return (
      <html lang={toHtmlLang(locale)} data-path-prefix={locale.pathPrefix || undefined}>
        <head>
          <meta charSet="utf-8" />
          <meta name="viewport" content="width=device-width,initial-scale=1" />
          <title>{title}</title>
          {description ? <meta name="description" content={description} /> : null}
          {canonicalPath ? <link rel="canonical" href={canonicalPath} /> : null}
          <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
          {assets.stylesheets.map((href) => (
            <link key={href} rel="stylesheet" href={href} />
          ))}
          <ImportMap value={assets.scriptEntry.importMap} />
          {assets.scriptEntry.preloads.map((href) => (
            <link key={href} rel="modulepreload" href={href} />
          ))}
          {shopifyScripts.links.map((descriptor) => (
            <ShopifyTag descriptor={descriptor} />
          ))}
          {/* Shopify's scripts set globals that the browser entry reads, so they come first. */}
          {shopifyScripts.scripts.map((descriptor) => (
            <ShopifyTag descriptor={descriptor} />
          ))}
          <script type="module" src={assets.scriptEntry.href} />
        </head>
        <body>
          {layout ? (
            <>
              <CartAside initialData={layout.cart} pathPrefix={locale.pathPrefix} />
              <SearchAside pathPrefix={locale.pathPrefix} />
              <MobileMenuAside
                links={headerMenuLinks(layout, locale.pathPrefix)}
                pathPrefix={locale.pathPrefix}
              />
              <Header layout={layout} pathname={pathname} />
            </>
          ) : null}
          <main>{children}</main>
          {layout ? <Footer layout={layout} /> : null}
        </body>
      </html>
    );
  };
}

const NO_SCRIPTS: ShopifyScriptTagDescriptors = { links: [], scripts: [], tags: [] };

/**
 * Shopify's runtime scripts: Standard Actions (which the cart store requires), consent,
 * and analytics. The browser entry calls `initializeShopifyScripts` with the same routes.
 */
function getScripts(layout: Layout | null): ShopifyScriptTagDescriptors {
  if (!layout) return NO_SCRIPTS;
  return getShopifyScriptTags({
    consent: { mode: "no-banner" },
    i18n: {
      country: layout.locale.country,
      language: layout.locale.language,
      pathPrefix: layout.locale.pathPrefix,
      ...(layout.currency ? { currency: layout.currency } : {}),
    },
    shop: layout.shop,
  });
}

function ShopifyTag(handle: Handle<{ descriptor: ShopifyScriptTagDescriptor }>) {
  return () => {
    const { descriptor } = handle.props;
    if (descriptor.tagName === "link") {
      const { crossorigin, ...attributes } = descriptor.attributes;
      return <link {...attributes} crossOrigin={crossorigin || undefined} />;
    }
    const { crossorigin, ...attributes } = descriptor.attributes ?? {};
    return (
      <script
        {...attributes}
        crossOrigin={crossorigin || undefined}
        innerHTML={
          descriptor.innerHTML === undefined ? undefined : unsafeHTML(descriptor.innerHTML)
        }
      />
    );
  };
}
