# Synchronize Customer Accounts with cart

Passing `customerSession` to `createCartServerHandlers` associates newly created carts with the currently authenticated customer and marks checkout URLs in authenticated cart GET responses with `logged_in=true`.

Existing carts need an application-owned synchronization policy. Use the Customer Account lifecycle hooks to attach the customer after authorization or token refresh and to clear the association after logout:

## Prerequisite: protected cart binding

The standard `/api/cart` handler does not create a protected server-side ownership binding for existing-cart synchronization. Before enabling these lifecycle hooks, the app must store the SFAPI-returned cart ID from its server-observed cart creation boundary in protected session storage. If the app delegates all creation directly to the standard route, wrap that server boundary or use an independently signed cart store; do not fall back to trusting the unsigned browser cart cookie.

```ts
import { gql, type ShopifyRouteHandlerContext } from "@shopify/hydrogen";
import { createCustomerAccountServerHandlers } from "@shopify/hydrogen/customer-account";

const CART_BUYER_IDENTITY_UPDATE = gql(`
  mutation CartBuyerIdentityUpdate(
    $cartId: ID!
    $buyerIdentity: CartBuyerIdentityInput!
  ) {
    cartBuyerIdentityUpdate(cartId: $cartId, buyerIdentity: $buyerIdentity) {
      cart { id }
      userErrors { message }
    }
  }
`);

const VERIFIED_CART_ID_SESSION_KEY = "verifiedCartId";
const CLEAR_CART_COOKIE_ON_COMMIT_SESSION_KEY = "clearCartCookieOnCommit";

const rememberVerifiedCartId = async (
  sessionManager: ShopifyRouteHandlerContext["sessionManager"],
  cartId: string,
) => {
  await sessionManager.setSessionItem(VERIFIED_CART_ID_SESSION_KEY, cartId);
};

const getVerifiedCartId = async (
  sessionManager: ShopifyRouteHandlerContext["sessionManager"],
) => {
  const cartId = await sessionManager.getSessionItem(VERIFIED_CART_ID_SESSION_KEY);
  return typeof cartId === "string" ? cartId : undefined;
};

const updateCartBuyerIdentity = async (
  context: ShopifyRouteHandlerContext,
  customerAccessToken: string | null,
) => {
  const { storefrontClient } = context;
  const cartId = await getVerifiedCartId(context.sessionManager);
  if (!cartId) return;

  const result = await storefrontClient.graphql(CART_BUYER_IDENTITY_UPDATE, {
    variables: {
      cartId,
      buyerIdentity: { customerAccessToken: customerAccessToken ?? null },
    },
  });

  if (result.errors || result.data?.cartBuyerIdentityUpdate?.userErrors.length) {
    throw new Error("Could not synchronize cart buyer identity");
  }
};

const attachCartBuyerIdentity = async (context: ShopifyRouteHandlerContext) => {
  const customerAccessToken = await customerSession.getAccessToken(
    context.sessionManager,
    context.requestContext,
  );
  if (!customerAccessToken) return;
  await updateCartBuyerIdentity(context, customerAccessToken);
};

const clearCartBuyerIdentity = async (context: ShopifyRouteHandlerContext) => {
  try {
    await updateCartBuyerIdentity(context, null);
  } catch (error) {
    await context.sessionManager.removeSessionItem(VERIFIED_CART_ID_SESSION_KEY);
    await context.sessionManager.setSessionItem(CLEAR_CART_COOKIE_ON_COMMIT_SESSION_KEY, true);
    throw error;
  }
};

const customerAccountHandlers = createCustomerAccountServerHandlers({
  customerSession,
  onAuthenticated: attachCartBuyerIdentity,
  onTokenRefresh: attachCartBuyerIdentity,
  onLogout: clearCartBuyerIdentity,
});
```

Call `rememberVerifiedCartId(sessionManager, cartId)` from that server-side cart creation boundary immediately after SFAPI returns the new cart ID, or after independently verifying ownership. Never populate it from client input. Do not register the synchronization hooks until this binding path is active. The hooks run before `sessionManager.commit()`. `onTokenRefresh` runs whenever the refresh route completes; a transient refresh can leave no usable access token while preserving a refreshable session, so it should not clear cart identity when `getAccessToken()` returns `undefined`. `onLogout` should explicitly send `customerAccessToken: null`.

Configure the app's session-manager `commit()` to translate `CLEAR_CART_COOKIE_ON_COMMIT_SESSION_KEY` into an expired `Set-Cookie` header for the browser cart cookie, then remove the marker. This makes logout cleanup fail-safe: an unconfirmed SFAPI disassociation removes both the protected binding and browser capability.

If a hook rejects, Hydrogen commits the updated session and returns a sanitized server error instead of the normal redirect. Hydrogen deliberately does not log the raw hook error because it can contain tokens; log allowlisted diagnostics inside the hook before throwing. Bound downstream work to an appropriate timeout and honor `context.request.signal`.

Lifecycle hooks are post-authentication integration points, not authorization guards. Rejecting `onAuthenticated` does not roll back the newly authenticated session.

## Cart ownership

Treat the cart ID used for customer association as a server-side capability:

- Prefer an opaque cart ID stored in the protected `sessionManager` or server-side session storage.
- A signed and validated `__Host-` cookie can be used when server-side storage is unavailable.
- Do not trust a cart ID from a client-readable unsigned cookie, query parameter, form field, or request body.
- Do not attach a customer token to a cart unless the server has verified that the current session owns that cart.
- On logout synchronization failure, clear both the browser cart capability and its protected server-side binding so another user cannot inherit the previous customer's cart.

Keep Customer Account tokens out of cart cookies, client state, responses, and logs. Log only allowlisted metadata such as an error class or request ID.
