---
'skeleton': patch
---

Improve performance of predictive search:

- Change the request to be GET instead of POST to avoid Remix route revalidations.
- Add Cache-Control headers to the response to get quicker results when typing.

Aside from that, it now shows a loading state when fetching the results instead of "No results found.".
