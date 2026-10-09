---
"@shopify/hydrogen": patch
---

Correct the `hydrogen-variant-form` skill's guidance for same-product option links. The skill said a hydrated click could run the registered handler and the link's own navigation together, and that the second navigation was a harmless no-op. It is not: the link's navigation refetches the loader that a resolved selection skipped, and a modifier click (new tab) also changes the current page. The skill and its React and Next.js references now run the registered handler only for a plain click and cancel the link's own navigation, so the provider's `onSelect` performs the only navigation. The skill also now requires focus to stay on the activated value across a combined-listing switch, and the React and Next.js references show how each framework keeps it.
