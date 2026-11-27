// @refresh reload
import { defaultI18n } from "@shared/config";
import { createContentSecurityPolicy, getShopifyScriptTags } from "@shopify/hydrogen";
import { createHandler, StartServer } from "@solidjs/start/server";
import { For } from "solid-js";

export default createHandler(
  (event) => {
    const nonce = event.locals.csp?.nonce;
    if (!nonce) throw new Error("CSP nonce was not created for this document.");
    const storefront = event.locals.storefront;
    if (!storefront) throw new Error("Storefront mode was not resolved for this document.");
    const shopifyScriptTags = getShopifyScriptTags({
      ...storefront.shopIdentity,
      i18n: defaultI18n,
      nonce,
    });

    return (
      <StartServer
        document={({ assets, children, scripts }) => (
          <html lang="en">
            <head>
              <meta charset="utf-8" />
              <meta name="viewport" content="width=device-width, initial-scale=1" />
              <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
              <link rel="preconnect" href="https://fonts.googleapis.com" />
              <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
              <link
                href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap"
                rel="stylesheet"
              />
              <For each={shopifyScriptTags.tags}>
                {({ tagName, attributes, innerHTML }) =>
                  tagName === "link" ? (
                    <link {...attributes} />
                  ) : (
                    <script {...attributes} innerHTML={innerHTML} />
                  )
                }
              </For>
              {assets}
            </head>
            <body class="bg-white text-black">
              <div id="app">{children}</div>
              {scripts}
            </body>
          </html>
        )}
      />
    );
  },
  (event) => {
    const storeDomain = event.locals.storefront?.storeDomain;
    if (!storeDomain) throw new Error("Storefront mode was not resolved for this document.");
    const csp = createContentSecurityPolicy({
      shop: { storeDomain },
      directives: {
        styleSrc: ["https://fonts.googleapis.com"],
        fontSrc: ["https://fonts.gstatic.com"],
      },
    });
    event.locals.csp = csp;
    return { nonce: csp.nonce };
  },
);
