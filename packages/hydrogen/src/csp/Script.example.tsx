import {
  Links,
  LiveReload,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from '@remix-run/react';
import {useNonce, Script} from '@shopify/hydrogen';
export default function App() {
  const nonce = useNonce();

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        <Outlet />
        {/* Note you don't need to pass a nonce to the script component 
        because it's automatically added */}
        <Script src="https://some-custom-script.js" />
        {/* For security, nonce is not supported with `waitForHydration`.
        Instead you need to add the domain of the script directly to your
        Content Securitiy Policy directives. */}
        <Script
          waitForHydration
          src="https://domain.com/script-that-modifies-dom.js"
        />
        <ScrollRestoration nonce={nonce} />
        <Scripts nonce={nonce} />
        <LiveReload nonce={nonce} />
      </body>
    </html>
  );
}
