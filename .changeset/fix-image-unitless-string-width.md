---
'@shopify/hydrogen-react': patch
'@shopify/hydrogen': patch
---

Fix blurry images when the `Image` component receives a unitless string width, for example `width="500"`. The component now builds the srcset from the given width, so the browser loads an image that matches the display size.
