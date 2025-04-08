---
'skeleton': patch
'@shopify/cli-hydrogen': patch
---

Fix an issue with our starter template where duplicate content can exist on URLs that use internationalized handles. For example, if you have a product handle in english of `the-havoc` and translate it to `das-chaos` in German, duplicate content exists at both:

1. https://hydrogen.shop/de-de/products/das-chaos
2. https://hydrogen.shop/de-de/products/the-havoc

We've changed the starter template to make the second redirect to the first.
