# Transaction Cart Store Proof of Concept

## Goal

Build an isolated transaction-based cart store that can satisfy the behavior contract in `packages/hydrogen/src/core/cart/cart.test.ts` without replacing or being exported beside the current store.

The proof of concept must:

- preserve the `CartStore` and observable `CartState` behavior consumed by React and Vue;
- derive visible state from settled state, pending transactions, and keyed error projections;
- make cancellation, rollback, stale-result handling, and request ownership explicit;
- preserve references for unchanged cart lines;
- add no runtime dependency; and
- include a minified and gzip size comparison with the current cart store.

## Agreed Constraints

- Runtime implementation goes in a new internal file. The current `cart.ts` remains unchanged and remains the production implementation.
- The proof of concept is not exported from `core/cart/index.ts` or any package entry point.
- Mutation errors never enter settled state or remain in the transaction list. Business and network failures create separate keyed error projections that preserve the existing `CartState.errors` contract.
- Transaction key functions receive the current visible state and the transaction payload.
- Combined-domain Standard Action payloads, such as one request changing lines, note, and discount codes together, are outside this proof of concept.
- One transaction owns one transport promise. Promise sharing is outside this proof of concept.
- `add_to_cart` is one relative transaction whose payload contains an array of merchandise additions. It has no keyed cancellation signal.
- `change_line_quantity` is one absolute transaction for exactly one line. Its payload cannot contain multiple lines.
- Runtime schema validation is outside this proof of concept. TypeScript types and narrow form/event adapters define transaction payload shape.

## Model

The store owns four distinct forms of state:

1. **Settled state**: the latest accepted cart data and loading metadata. It contains no mutation errors and is never exposed directly.
2. **Pending transactions**: ordered immutable records containing transaction type, payload, sequence, cached keys, promise, and lifecycle generation.
3. **Projected errors**: keyed domain or network error projections owned independently from transactions.
4. **Visible state**: a cached projection produced by applying pending payload projections and keyed error projections to settled state.

The invariant is:

```text
visible = projectErrors(derivePending(projectPayloads(settled, pending), pending), errors)
```

Every enqueue, fulfillment, rejection, hydration, reset, or destruction computes and publishes at most one new visible snapshot.

## Transaction Registry

Define a typed internal registry in the new implementation file. Each entry contains:

- `payload`: a type-only payload marker used by `defineTransactionTypes` to derive the payload lookup from the registry key;
- `transport(payload, signal)`: starts the Standard Action transport and returns its promise;
- `projectPayload(state, payload)`: applies the optimistic payload with structural sharing;
- `projectPromise(state, result, payload, addError)`: applies only the transaction-owned server scope to settled state and registers domain error projections through `addError`;
- `getSignalKeys(state, payload)`: optional cancellation keys;
- `getPendingKeys(state, payload)`: optional pending keys, defaulting to signal keys; and
- `getErrorKeys(state, payload)`: optional error ownership keys, defaulting to signal keys; and
- `removeSupersededPayload(olderPayload, successfulPayload)`: optional relative-transaction hook that removes only portions of an older batch proven represented by a newer successful response.

Use namespaced strings such as `line:<lineId>`, `merchandise:<merchandiseId>:<sellingPlanId>`, `discount-codes`, and `note`. Normalize a key result of `string | string[] | undefined` to an array once when the transaction is created.

`CART_TRANSACTION_TYPES = defineTransactionTypes({...})` is the sole source of truth for transaction names, payloads, and behavior. Transaction-name and payload lookup types are derived from its object keys and `payload` markers; no parallel key union or payload map is maintained.

Initial cart transaction definitions:

| Type | Payload cardinality | Signal behavior |
| --- | --- | --- |
| `add_to_cart` | one or more merchandise additions | global signal only; no keyed cancellation |
| `change_line_quantity` | exactly one line and target quantity | `line:<lineId>` |
| `set_discount_codes` | one complete code list | `discount-codes` |
| `set_note` | one note value | `note` |

`add_to_cart` may map merchandise to a settled line when projecting, but this does not turn it into an absolute mutation. Its pending keys include merchandise identity and any matching visible line identity. Public `CartPending` is derived from those internal keys and the projected lines, including optimistic line IDs when product detail permits an optimistic line.

## Transaction Semantics

### Enqueue

1. Read the cached visible state so relative form actions can derive their payload from what the user currently sees.
2. Compute and cache signal, pending, and error keys using that state.
3. Remove every existing error projection sharing at least one error key with the new transaction.
4. For each signal key, abort the currently owned controller before assigning the new transaction controller.
5. Compose the transaction controller, current lifecycle controller, and standard timeout with `AbortSignal.any`.
6. Append the transaction in monotonic sequence order, project visible state, publish once, and run its transport.

Transactions with signal keys carry a complete target value. For example, a second `increase` reads the currently visible quantity and sends the folded absolute target. Removing the superseded transaction therefore cannot lose a click.

Unkeyed `add_to_cart` transactions remain concurrently visible because no keyed controller aborts them. A newer successful add result may supersede only overlapping merchandise portions of older pending add batches through `removeSupersededPayload`; non-overlapping additions remain pending. Fulfillments whose sequence is already superseded for all owned merchandise are ignored.

This rule assumes a newer successful Standard Action cart snapshot for the same merchandise reflects earlier accepted additions for that merchandise. Add tests that state this assumption directly. The proof of concept must not silently claim stronger server ordering guarantees.

### Fulfillment

1. Ignore the callback if its lifecycle generation is stale or the transaction no longer owns any applicable scope.
2. Run `projectPromise`; commit transaction-owned server cart data to settled state and let the definition call `addError` for domain warnings or user errors.
3. Store each emitted error as a separate projection keyed by `getErrorKeys`; do not retain the fulfilled transaction or write errors into settled state.
4. Treat `cart: null` as rollback while still allowing `projectPromise` to emit scoped errors.
5. For relative adds, trim or remove only overlapping portions of older pending batches after the newer result succeeds.
6. Remove the fulfilled transaction, reproject remaining transactions and errors, derive pending metadata, and publish once.
7. Accept shared cart-level snapshot fields such as cost and checkout URL only from a result newer than the last accepted result sequence. Pending UI continues to indicate that monetary data may be stale; no currency values are calculated client-side.

### Rejection And Cancellation

1. Ignore callbacks from stale lifecycle generations and transactions superseded by a newer key owner.
2. Remove the rejected transaction and reproject all remaining transactions. This performs rollback without mutable baselines.
3. For rejected business failures, invoke the same `projectPromise(..., addError)` path with a cart-null result so definitions own domain error mapping.
4. For non-abort transport failures, the interpreter creates a keyed network error projection and rethrows from `handleFormSubmit`.
5. Treat expected supersession, timeout, reset, and destroy aborts as rollback/cancellation rather than network errors, preserving current caller behavior.

### Lifecycle

- `connect()` remains idempotent and browser-only for listeners and initial loading.
- `destroy()` aborts the lifecycle controller, clears pending transactions, projected errors, and keyed ownership, detaches listeners, and invalidates all callbacks by generation.
- `reset()` performs the same cancellation/invalidation, creates a fresh lifecycle controller, and publishes empty state.
- Reconnection creates a fresh lifecycle controller without repeating an already-started initial load.
- External Standard Action events can register observed transactions with their attached promises, but combined-domain events and batched absolute line changes are explicitly unsupported in this proof of concept.

## Reference Stability

- Projectors clone `data.lines.nodes` only when membership, order, or an affected line changes.
- Projectors replace only affected line objects and return existing objects for unchanged values.
- Scoped result projection preserves unrelated line objects even when the transport returns a full cart snapshot.
- Note and discount transactions retain the existing lines array and every line reference.
- Tests assert both observable updates and `Object.is` stability for unchanged line objects and arrays where applicable.

## Implementation Steps

### 1. Establish The Behavior Baseline

- Install/use existing workspace dependencies if available, then run the current cart test file unchanged.
- Record any environmental blocker separately from implementation failures.
- Inventory the behavior groups in the current suite: lifecycle, hydration/fetch, form parsing, line/add/note/discount optimism, cancellation, timeout, errors, external events, reconciliation, and endpoint configuration.

### 2. Add The Internal Transaction Store

- Add `packages/hydrogen/src/core/cart/transaction-cart-store.ts`.
- Keep the transaction engine, signal ownership, cart definitions, and adapters in this file unless a split produces a demonstrably deeper module.
- Reuse existing cart state types, observable, quantity helpers, Standard Action types, and endpoint behavior without changing their production implementations.
- Do not export the proof of concept from package entry points.

### 3. Add Focused Model Tests

- Add `packages/hydrogen/src/core/cart/transaction-cart-store.test.ts`.
- Cover projection from settled plus pending transactions, successful settlement, rejection rollback, cart-null failure, stale generation callbacks, timeout, keyed absolute supersession, unkeyed relative concurrency, and scoped result application.
- Test `add_to_cart` with arrays, including partial overlap between older and newer batches.
- Test the explicit newer-add snapshot assumption and out-of-order success handling.
- Test that `change_line_quantity` accepts exactly one line at the type boundary and that separate line transactions do not cancel each other.
- Document in the test name and adjacent rationale that batching absolute keyed line changes would cause one overlapping key to abort unrelated work in the same request, so the transaction payload forbids it.
- Test unchanged line and lines-array references.
- Test that resolved domain warnings and rejected network errors persist as projections, survive unrelated transactions, and clear immediately when a transaction with an overlapping error key starts.

### 4. Run The Existing Cart Contract Against The New Store

- Exercise the existing `cart.test.ts` behavior against `createTransactionCartStore` without changing the production import or replacing `createCartStore`.
- During the proof of concept, use a test-only copy or generated test fixture that changes only the subject import; do not add runtime selection logic.
- Any intentional unsupported scope must have an explicit focused test and must not be disguised as a passing contract case.
- The gate passes only when the unchanged behavior assertions pass against both implementations, except for a user-approved test change reflecting the agreed unkeyed add semantics.

### 5. Verify Quality And Size

- Run formatting, lint, Hydrogen typecheck, focused transaction tests, the existing cart test, and the dual-store contract run.
- Build both stores as isolated equivalent entry points with the repository's existing toolchain and report raw, minified, and gzip byte counts.
- Confirm no runtime dependency or package export was added.
- Inspect the diff for magic numbers, nesting deeper than three levels, obvious comments, suppressed lint/type errors, and accidental changes to the current store.

### 6. Implementation Review Gate (BLOCKING)

**INSTRUCTION FOR EXECUTING AGENT**: This is a BLOCKING gate. Before proceeding to any subsequent steps, invoke the following agents for code review using the Task tool. Do not proceed until all agents approve.

**PARALLELISM RULE**: Invoke ALL agents in parallel at once. Collect feedback from ALL agents BEFORE making any code changes.

**Agents to Invoke**:

| Agent | Task subagent_type (use this) | Approval Criteria | Status |
| --- | --- | --- | --- |
| design-reviewer | `design-reviewer` | Transaction model is coherent, interfaces are hard to misuse, scopes do not leak, and complexity is lower than the current baseline approach. | [ ] Pending |
| code-guardian | `code-guardian` | Lint configuration and production reliability are sound, including cancellation ownership, timeout, cleanup, stale callbacks, rejection handling, and reference stability. | [ ] Pending |
| verification-guardian | `verification-guardian` | Every completion claim is evidenced by tests/build/size output, the original contract genuinely runs against the new store, and no checks are suppressed or bypassed. | [ ] Pending |

**Re-approval Rule**: If ANY agent requests changes, make all changes after collecting the complete round, then re-invoke ALL agents above. All must approve the SAME final version. Stop after at most five complete rounds and declare the gate failed if unanimous explicit approval is not obtained.

**Review Summary** (fill in during execution):

| Agent | Verdict | Summary |
| --- | --- | --- |
| design-reviewer | Failed | Task backend returned `no such column: replacement_seq` before review. |
| code-guardian | Failed | Task backend returned `no such column: replacement_seq` before review. |
| verification-guardian | Failed | Task backend returned `no such column: replacement_seq` before review. |

**Completion**: This step is complete only when every agent explicitly says `APPROVE`, `APPROVED`, `LGTM`, `I sign off on this`, `Looks good`, `Ship it`, `No objections`, or `No remaining concerns` without qualification.

**FAILURE**: Silence, timeout, conditional approval, ambiguous approval, or any requested change fails this gate. Stop, declare `APPROVAL GATE FAILED`, identify the non-approving agents, and escalate to the user without calling the task complete.

### 7. Report Findings Without Integrating

- Summarize contract compatibility, unresolved semantic assumptions, measured size, and implementation complexity compared with `cart.ts`.
- Leave the current store and package exports unchanged.
- Treat any production integration, public API, mixed-domain transaction support, or migration as a separate user-approved plan.

## Agent Plan Review Gate

**Reviewing Agents** (must all approve before presenting this plan to the user):

| Agent | Task subagent_type | Approval Criteria |
| --- | --- | --- |
| design-reviewer | `design-reviewer` | The plan defines a coherent, minimal transaction model with deep internal modules, explicit race semantics, and hard-to-misuse transaction shapes. |
| code-guardian | `code-guardian` | The plan covers production reliability risks that tests and lint commonly miss, especially cancellation ownership, stale results, timeout, cleanup, errors, and reference stability. |
| verification-guardian | `verification-guardian` | The plan makes compatibility and size claims independently verifiable and does not allow test substitution, suppression, or unproven completion claims. |

### Review Summary

| Agent | Verdict | Summary |
| --- | --- | --- |
| design-reviewer | Pending |  |
| code-guardian | Pending |  |
| verification-guardian | Pending |  |

## Assumptions Requiring Validation During The Proof Of Concept

- Standard Action mutation events are emitted early enough for optimistic transaction registration to remain synchronous from the caller's perspective.
- A newer successful add response for the same merchandise includes earlier accepted relative additions for that merchandise.
- The original contract does not require external batched absolute line updates or combined-domain payloads in this proof of concept.
- Bundle comparison can be performed with existing repository tooling without adding a dependency.
