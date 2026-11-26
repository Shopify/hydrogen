import { startTransition, StrictMode } from "react";
import { hydrateRoot } from "react-dom/client";
import { HydratedRouter } from "react-router/dom";

import { NonceProvider } from "~/lib/csp";

if (!window.location.origin.includes("webcache.googleusercontent.com")) {
  const nonce = document.querySelector<HTMLScriptElement>("script[nonce]")?.nonce;

  startTransition(() => {
    hydrateRoot(
      document,
      <StrictMode>
        <NonceProvider value={nonce}>
          <HydratedRouter />
        </NonceProvider>
      </StrictMode>,
    );
  });
}
