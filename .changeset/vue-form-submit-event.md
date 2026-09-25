---
"@shopify/hydrogen": patch
---

Vue `useCartForm().formProps()` and `useProductForm().formProps()` now pass a `SubmitEvent` to `beforeSubmit` and `afterSubmit`, matching the React bindings. You can read `e.submitter` without casting. Existing callbacks typed as `(e: Event) => void` still work.

`CartActions` and `PredictiveSearchActions` are now also exported from `@shopify/hydrogen` for custom framework bindings. The React and Vue entries still export the same types.
