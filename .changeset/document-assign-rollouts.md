---
"@shopify/hydrogen": minor
---

`assignRolloutsOnDocument()` assigns a buyer who has no Shopify session to the shop's checkout rollouts while a page request runs, so the HTML document that the request answers with already carries the buyer's session before client scripts run. Call it in root middleware before you render the page, and await `applySetCookies()` on the response headers after rendering: the method appends the `_shopify_essential` cookie that the `rolloutsAssign` mutation sets, and the request context then makes the response private and uncacheable. The helper only assigns an HTML document request from a browser, with a private Storefront API client, for a buyer with no session, and when the shop's cached `rolloutsAssignmentActive` field is true. It waits at most half a second and never throws, so a failed or slow assignment leaves the page unchanged.
