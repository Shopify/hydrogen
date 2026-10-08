---
"@shopify/hydrogen": patch
---

Vue `useCollectionForm().formProps()` now passes a `SubmitEvent` to `beforeSubmit` and `afterSubmit`, matching the React binding. You can read `e.submitter` without casting. Existing callbacks typed as `(e: Event) => void` still work.

`CollectionActions` is now also exported from `@shopify/hydrogen` for custom framework bindings. The React and Vue entries still export the same type.
