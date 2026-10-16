# ADR 0004: Cart line signifiers

- Status: Accepted for phase 1 of #1286 (2026-10-16)
- Issue: [#1286](https://github.com/Shopify/developer-tools-team/issues/1286)
- Decision: [accepted scope comment](https://github.com/Shopify/developer-tools-team/issues/1286#issuecomment-6206407780)
- Related: [ADR 0001](0001-standard-signifiers.md), [ADR 0002](0002-nuxt-signifier-coverage.md)

## Context

Cart tests find lines by product title and variant text, and controls by English labels. These matches fail when storefront copy or markup changes. A cart page can also render the same line in a hidden drawer.

Phase 1 adds signifiers only. The accepted scope keeps cart settlement/status waits, rendered quantity, removal, and optimistic rollback checks. It defers event-result assertions and does not change existing internal Hydrogen events.

## Decision

### Vocabulary and placement

| Signifier | Required state | Placement |
| --- | --- | --- |
| `cart-line` | `{ merchandiseId: string, quantity: number, pending: boolean }` | The container for one cart line |
| `cart-line-quantity` | `{}` | The native quantity input inside that container |
| `cart-line-increase` | `{}` | The increase control inside that container |
| `cart-line-decrease` | `{}` | The decrease control inside that container |
| `cart-line-remove` | `{}` | The remove control inside that container |

The merchandise ID is the product variant ID, not the cart line ID. The container can be a list item, a form, or another element. Keep all four controls within it, including a remove control in a separate form. Keep native form semantics, accessible labels, inline errors, focus management, and pending visuals.

One visible line for the requested merchandise must resolve. A hidden drawer copy does not make a visible cart-page line ambiguous. Multiple visible matches are errors, not a reason to choose the first match. Controls resolve within their line, not across the page. Missing-control errors explain misplaced controls and wrapper components that do not forward attributes.

### Helper API

- Core exports `getCartLineAttributes(line, cartState)` from `@shopify/hydrogen`. Its structural line input needs only `id`, `quantity`, and optional nullable `merchandise: { id }`. Its state input is `Pick<CartState, 'pending'>`.
- The getter reads `cartState.pending.lines.has(line.id)`. It returns `cart-line` attributes and adds `aria-busy: 'true'` only while pending. When idle, the key is absent. Quantity comes from the given line. Missing merchandise metadata produces `merchandiseId: ''`; it does not substitute a line ID.
- React and Vue add `lineProps(line)` to the existing `useCartForm()` result. It uses the core getter and a live pending-lines selector. It does not subscribe to the full cart data. Existing `formProps()` behavior stays unchanged.
- `createCartFormRegister()` adds the quantity signifier for all quantity overloads, including `defaultValue` and interactive inputs. `register('increase')`, `register('decrease')`, and `register('remove')` add their control signifiers. Other fields and intents do not get new signifiers. React's uncontrolled interactive input wrapper preserves the attributes.
- A storefront without cart bindings can call the core getter with its current state. A storefront without the cart store can use `signifier('cart-line', { merchandiseId, quantity, pending })` and the four stateless control signifiers directly. These helpers add no handlers, disabled state, links, providers, or mutation behavior.

### Runner and settlement

Discovery retains the selected variant ID. Cart tests match `cart-line` by `merchandiseId`, then require each control inside that line. Quantity checks read the native input and the line's quantity attribute. Removal checks require the merchandise line to be absent.

Cart line attachment and visibility share the existing 15-second appearance budget on both the cart page and overlay. The internal runner helper accepts a per-call timeout; its default and ambiguity rules stay unchanged. Final quantity attributes and native input values are checked after `pending: false`, not only during the optimistic projection.

`pending: false` is not proof that a mutation succeeded. Keep the existing `Updating cart totals` / `Cart totals updated` status contract and check the rendered quantity, removal, or stock rollback result. The finite-stock check keeps its request gate so it can observe the optimistic value before rollback. Setup uses buyer UI; discovery does not inject cart state. If no finite-stock fixture exists, the test is skipped and rollback remains unverified.

Drawer dialog/trigger discovery and cart status discovery remain semantic locators. The combined drawer/line allowlist entry is narrowed to dialog discovery; replaced line/control entries are removed. There are no new exception categories or inline exceptions. Checkout stays unchanged.

## Consequences

- Cart-page and drawer line containers in React Router, Next.js, and Nuxt share the same signifier contract without a layout redesign.
- Line identity no longer depends on English product/variant text or line IDs that can change after reconciliation.
- This phase does not add events, observers, readiness checks, checkout signifiers, or drawer behavior. A passing unit/type check does not establish live browser behavior.
- The minimum Hydrogen version is unreleased until this change is published.
