import type { RemixNode } from "remix/component";
import { createElement } from "remix/component";
import { auth, requireAuth, type AuthScheme } from "remix/middleware/auth";
import { Renderer } from "remix/middleware/render";
import { redirect } from "remix/response/redirect";

import { LoginFailedPage } from "../actions/account/pages.tsx";
import { localizePath } from "../lib/public/i18n.ts";
import { requireContext } from "./context.ts";
import { LocaleContext } from "./locale.ts";
import { ShopifyContext } from "./shopify.ts";

/** The signed-in customer, as account actions read it from `context.auth.identity`. */
export type CustomerIdentity = {
  /** A usable Customer Account API access token, refreshed when it had expired. */
  accessToken: string;
};

/**
 * Resolves the customer from Hydrogen's Customer Account session. Hydrogen's OAuth
 * handlers own login and logout; this only reads the result, refreshing the access token
 * when needed. Without a usable token the request is anonymous.
 */
const customerAccountScheme: AuthScheme<CustomerIdentity> = {
  name: "customer-account",
  async authenticate(context) {
    const { customerAccount } = requireContext(context, ShopifyContext, "shopify");
    const accessToken = await customerAccount.session.getOrRefreshAccessToken(
      customerAccount.sessionManager,
      customerAccount.requestContext,
    );
    return accessToken ? { status: "success", identity: { accessToken } } : undefined;
  },
};

/** Resolves `context.auth` from the Customer Account session. */
export function customerAuth() {
  return auth({ schemes: [customerAccountScheme] });
}

/**
 * Requires a signed-in customer. Anonymous requests go to Hydrogen's `/account/login`
 * handler, which starts Shopify's OAuth flow and returns here afterwards. After a failed
 * login, Hydrogen redirects to `/account?login=failed`, which renders the failure page.
 */
export function requireCustomer() {
  return requireAuth<CustomerIdentity>({
    onFailure(context) {
      const { pathPrefix } = context.get(LocaleContext);

      if (context.url.searchParams.get("login") === "failed") {
        // SAFETY: The app renderer runs before this middleware; Remix's generic
        // `Renderer` key erases its input type.
        const renderPage = context.get(Renderer) as (
          node: RemixNode,
          init?: ResponseInit,
        ) => Promise<Response>;
        return renderPage(createElement(LoginFailedPage, { pathPrefix }), {
          status: 401,
          headers: { "Cache-Control": "no-cache, no-store, must-revalidate" },
        });
      }

      const url = new URL(context.request.url);
      const loginPath = localizePath("/account/login", pathPrefix);
      const returnTo = encodeURIComponent(`${url.pathname}${url.search}`);
      return redirect(`${loginPath}?return_to=${returnTo}`);
    },
  });
}
