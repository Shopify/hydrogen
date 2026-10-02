---
"@shopify/hydrogen": minor
---

Add `register("attributeValue", { key, value })` to `ProductFormRegister` for attaching line-item attributes (engraving text, gift messages, custom options) through the form-based add-to-cart path. Both client-side (`getAddPayload`) and server-side (`parseAddIntent`) now extract `attributes.*` entries from FormData. Exports two new types: `ProductAttributeValueProps` and `ProductAttributeDefaultValueProps`.
