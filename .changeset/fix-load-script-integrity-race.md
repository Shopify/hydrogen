---
"@shopify/hydrogen-react": patch
"@shopify/hydrogen": patch
---

Fix a race condition in `loadScript` where the browser could begin fetching a script before integrity or other security attributes were applied. Attributes are now set before the element is inserted into the DOM.
