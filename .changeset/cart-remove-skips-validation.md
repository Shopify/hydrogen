---
"@shopify/hydrogen": patch
---

`register("remove")` now returns `formNoValidate: true`, typed as the new `RemoveButtonAttributes`. Before, invalid text in a cart line's quantity input, such as letters, made the browser cancel the Remove button's submit, so the customer couldn't remove the line until they fixed the quantity. Removing a line reads only the line ID, so the button now skips form validation. If you spread `register("remove")` onto a component whose props don't accept `formNoValidate`, add the prop to the component.
