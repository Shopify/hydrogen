---
"@shopify/hydrogen": minor
---

`createProductFormRegister(selectedVariant)` now accepts no select function. Without one, `register("optionValue", ...)` returns only `{ name, value }`, typed as the new `ProductOptionValueAttributes`. Use it in frameworks whose renderer drops `onChange` and `onClick` function props, such as Remix 3, and call `store.selectOption()` from your own event listener. Before, the register function required a select function and returned handlers that such a renderer dropped without a warning, so spreading the props gave option controls that did nothing. Passing a select function works as before, and the React and Vue bindings are unchanged.
