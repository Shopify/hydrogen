# Analytics

Invoke the `hydrogen-analytics` skill to wire storefront analytics. This depends on the request handlers (scaffold step) and Shopify runtime scripts being in place. Read `../references/analytics.md` for the full consent and setup details when needed.

## Continue when

- [ ] Page view analytics events publish on route navigation, including client-side navigations
- [ ] Product, collection, search, and cart view events publish on their routes
- [ ] Cart update tracking publishes deltas when line items change
- [ ] Analytics events respect consent: no destination receives events before consent is granted where consent is required
