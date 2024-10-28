---
'@shopify/mini-oxygen': minor
---

[**Breaking change**]

Support worker compatibility date that aligns with SFAPI release.

Starting from this major version, on each deploy to Oxygen, Hydrogen will be on Cloudflare worker compatibility date `2024-10-01`. Onwards, Hydrogen will update worker compatibility date on every SFAPI release.

There is no specific project update that needs to be done in order to get this feature. However, please ensure your project is working properly in an Oxygen deployment when updating to this Hydrogen version. ([#2380](https://github.com/Shopify/hydrogen/pull/2380))
