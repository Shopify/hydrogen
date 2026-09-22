# Analytics

Invoke the `hydrogen-analytics` skill. It owns configuration, consent gating, per-route events, cart tracking, and the framework shapes.

Setup-specific: request handlers (step 2) and Shopify runtime scripts (step 7) must already be in place. The analytics bus needs the same-origin SFAPI proxy to observe session cookies; without it, treat analytics as incomplete rather than working around it.

## Continue when

- [ ] Page view analytics events publish on route navigation, including client-side navigations
- [ ] Product, collection, search, and cart view events publish on their routes
- [ ] Cart update tracking publishes deltas when line items change
- [ ] Analytics events respect consent: no destination receives events before consent is granted where consent is required
