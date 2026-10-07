# ADR 0001: Standard signifiers

- Status: Accepted for the first slice (#1282)
- Parent issue: #1280
- Scope of this record: the `product-add-to-cart` signifier only

## Source limitation

The planning document `plans/standard-signifiers/README.md` on branch `fb-standard-signifiers-scoping` was not available when we wrote this record. The GitHub API returned 404 for that branch, and no local ref had the file. This record does not use that document.

This record uses only the design points in issues #1280 and #1282. If the planning document has different decisions, compare it with this record and amend this record.

## Context

The storefront E2E suite finds controls through labels, roles, and link paths. These locators break when a storefront changes copy or markup. They also cannot tell two similar controls apart.

A signifier is a stable attribute that a storefront puts on a control. A signifier tells the test runner what the control is and what state it has. The storefront owns the signifier. The test runner reads it.

## Direction from #1280

These points set the long-term direction. This slice does not implement all of them.

- Checks will eventually use Shopify standard events to know what happened.
- Runner actions use signifiers to know where to act: a `data-h3` attribute plus `data-h3-*` state attributes.
- Hydrogen core `register()` adds signifier attributes automatically.
- Future headless helpers will add signifiers to controls that Hydrogen does not render.
- Signifiers are always present, also in production builds. They are not test-only attributes.

## Decisions for #1282

### Vocabulary

- The first entry is `product-add-to-cart`.
- Its state is `{ variantId: string; available: boolean }`. Both fields are required.
- Signifier names are append-only. Do not rename or remove a name after release.
- Do not add a signifier unless a spec consumes it.
- One element has one signifier. State narrows the match. Do not put two signifiers on one element.

### Public API

All names are named exports from the root entry point `@shopify/hydrogen`.

| Export | Purpose |
| --- | --- |
| `SIGNIFIER_ATTRIBUTE` | The attribute name: `'data-h3'`. |
| `SIGNIFIER_NAMES` | The list of signifier names. It is derived from the schema. |
| `SignifierStates` | The type that maps each name to its state shape. |
| `signifier(name, state)` | Returns the attributes for one element. |
| `SignifierAttributes<Name>` | The type of the object that `signifier()` returns. |
| `signifierSelector(name, partialState)` | Returns a CSS selector. State fields are optional and narrow the match. |

### Serialization

There is one shared serialization for writing and reading:

- The attribute value of `data-h3` is the signifier name.
- A camelCase state key becomes a kebab-case attribute: `variantId` becomes `data-h3-variant-id`.
- A boolean becomes the string `'true'` or `'false'`.
- A number becomes its string form.

Example output:

```html
<button data-h3="product-add-to-cart" data-h3-variant-id="gid://shopify/ProductVariant/1" data-h3-available="true">
  Add to cart
</button>
```

### Binding path

React, Vue, and core `register('addToCart', {})` add the attributes. The attributes are live: they change when the selected variant changes. When `selectedVariant` is `null`, the state is `variantId = ''` and `available = false`.

### Non-binding path

A storefront that does not use the Hydrogen form bindings spreads the helper on its own control:

```tsx
<button type="submit" {...signifier('product-add-to-cart', { variantId, available })}>
  Add to cart
</button>
```

`signifier()` returns only the signifier attributes. It does not add form semantics such as `type="submit"`.

### Runner

- The runner module `src/signifiers.ts` in this package exports the `h3` and `requireH3` helpers. These helpers build all signifier locators through `signifierSelector`. They do not build selectors by hand.
- Match rules use attached elements:
  - If one element among several matches is visible, that element wins.
  - If no element is visible and exactly one is attached, that element wins. A visually hidden (`sr-only`) control is usable.
  - If more than one element is visible, or no element is visible and more than one is attached, the runner reports a structured ambiguity error.
- Missing and ambiguity errors name the signifier and the route. They give the binding fix and the non-binding fix. They also name a possible cause: a wrapper component that does not forward props to the rendered element.
- Errors link to [the contract entry](../storefront-contract.md#product-add-to-cart).

Visibility uses Playwright's definition. A clipped, one-pixel `sr-only` element can count as visible. A single such element resolves; it does not get an exemption from the ambiguity rule.

### Minimum Hydrogen version

The minimum Hydrogen version is unreleased. It becomes known when the first changeset with signifiers is published. Do not claim that an existing preview release has signifiers.

### Guardrail

One concrete allowlist records the specs and helpers that still use non-signifier locators. The list can only shrink. Later slices remove entries when they move to signifiers.

The check runs in `test:unit`. Its allowlist is `src/selector-ratchet-allowlist.json`; `src/selector-ratchet.test.ts` checks for new and stale entries.

### Readiness

Readiness is a placeholder in this slice. Task 03 will check the `shopify:page:view` event. This slice does not implement readiness or event checks.

## Out of scope for #1282

- No template restructuring.
- Nuxt CI coverage belongs to task 02.

## Deferred follow-ups

These items are decided as direction but not implemented in this slice:

- More signifier names for product results, variant options, cart lines, and checkout summaries.
- Checks based on Shopify standard events.
- Readiness through `shopify:page:view` (task 03).
- Headless helpers for controls that Hydrogen does not render.
- Shrinking the guardrail allowlist.

## Consequences

- Storefronts get a stable, documented contract for the add-to-cart control.
- Storefront markup has extra `data-h3*` attributes in production.
- Hydrogen must keep names stable. A wrong name stays forever because names are append-only.
