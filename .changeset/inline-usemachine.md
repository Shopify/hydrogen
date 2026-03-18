---
'@shopify/hydrogen-react': patch
---

Inline `useMachine` hook from `@xstate/react/fsm`, removing the `@xstate/react` dependency

The `@xstate/react` package had no version supporting both React 19 and `@xstate/fsm`. By inlining the
React binding from `@xstate/react/fsm`, we eliminate this dependency (and its React version peer dep constraint) while
keeping `@xstate/fsm` and the cart state machine definition completely unchanged.

This also removes `use-sync-external-store` and `use-isomorphic-layout-effect` (which existed solely
as transitive deps of `@xstate/react`) and cleans up the Vite config workarounds that were needed
because `@xstate/react/fsm` had broken ESM resolution.
