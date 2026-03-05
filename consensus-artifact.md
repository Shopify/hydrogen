# PR Review: fix: inline useMachine hook to drop @xstate/react dependency (#3594)

**PR**: https://github.com/Shopify/hydrogen/pull/3594

---

## Comments

### blocking: `.changeset/inline-usemachine.md`

blocking: This should have a `@shopify/hydrogen: patch` as well.

### non-blocking: `packages/hydrogen-react/src/useMachine.ts` (file-level)

non-blocking: I think this deserves a `useMachine.test.ts`. State machine covers happy path, so this could be a follow up.

### question: `packages/hydrogen-react/src/useMachine.ts:43-48` (`getServiceState`)

question: this relies on xstate/fsm synchronously emitting state on subscribe - worth a comment?
