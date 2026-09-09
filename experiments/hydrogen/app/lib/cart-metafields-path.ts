// Client-safe route path for the app-owned cart metafields endpoint.
//
// This lives apart from the handler module (cart-metafields.server.ts) so the
// client form can reference the path without importing that module. The handler
// runs gql() at module scope and imports Hydrogen server-only helpers; importing
// it from client code would pull those documents and helpers into the browser
// bundle.
export const CART_METAFIELDS_PATH = "/api/cart/metafields";
