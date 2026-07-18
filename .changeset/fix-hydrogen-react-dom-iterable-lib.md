---
"@shopify/hydrogen-react": patch
---

Add `DOM.Iterable` to `lib` in `tsconfig.json` so `URLSearchParams` (and other DOM iterables) type-check correctly, and remove the workaround `@ts-ignore` and `eslint-disable` lines in `useSelectedOptionInUrlParam`.
