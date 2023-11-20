---
'@shopify/hydrogen': patch
---

Fix the Pagination component to always restore scroll correctly on back/forth navigation. This has the side effect of causing a hydration error _only_ when the user refreshes an already paginated page. This is because during refresh the Paginated list is rendered with navigation state, _not_ the state returned by the server. Navigation state might contain many pages of data, so all of it is necessary to properly render the page height and restore scroll. The side effect of this is the hydration mismatch. We feel it isn't often the user would hard refresh the page, and when doing so, a hydration mismatch and flash of rendered content is an acceptable downside to accurately maintaining scroll location.
