# Cookie / consent banner core notes

Frozen visual/design source for the privacy/cookie consent banner. It exists so the
React Router (and other) examples can add Shopify Customer Privacy analytics with a
consistent, on-brand consent UI. Per the architecture, **all design lives in CORE** —
the published library and generated apps stay design-neutral and reuse these classes.

## Design intent

A bottom-anchored surface **card** (not a full-bleed bar) that floats above page
content: a short privacy message + a privacy-policy link, and a row of actions. It
reads clearly as part of the CORE system because it reuses the same surface /
on-surface / border tokens, the `--shadow-lg` elevation, the `--spacing-margin` /
`--spacing-page` layout rhythm, the `--radius-lg` corner, and the semantic button
classes. Centered and horizontal on desktop (`>= 48rem`), stacked on mobile.

## Semantic classes (verbatim — the skill wires behavior to these)

- `.consent-banner` — the bottom-anchored card container. Bundles `position: fixed`
  bottom + centered max-width (`min(100% - 2·--spacing-margin, --spacing-page)`) +
  `background: --color-surface` / `color: --color-on-surface` /
  `border: 1px solid --color-border` / `box-shadow: --shadow-lg` /
  `border-radius: --radius-lg` / padding / `z-index: 60`. Stacks on mobile, becomes a
  row with `justify-content: space-between` at `>= 48rem`.
- `.consent-banner-actions` — the actions row. Column (stacked) on mobile, row on
  `>= 48rem`. Holds the buttons.

No new design tokens were added — elevation reuses the existing `--shadow-lg`.

## Actions (use the CORE semantic button classes)

- **Accept all** → `.button-primary` (the affirmative, highest-emphasis action).
- **Decline** → `.button-outline` (secondary/lower-emphasis).
- **Manage preferences** → `.button-ghost` (tertiary; opens a preferences UI).
- **Privacy Policy** → a `text-accent` underlined link inside the message.

All buttons are authored with `h-11` (= `--spacing-touch-target`, 44px), a
`focus-visible:outline-accent` ring, and `rounded-button`, matching the other
reference pages. Contrast meets WCAG AA (maroon `--color-interactive` fill behind
white text; black text on white; accent link on white).

## Behavior is the SKILL's job, not core's

Core only owns the **visual treatment**. The following are explicitly out of scope here
and must be implemented by the skill / generated app:

- Show/hide logic (e.g. hidden until consent is required, dismissed after a choice).
- Persisting the visitor's choice and re-opening via "Manage preferences".
- Wiring Accept / Decline / preferences to Shopify **Customer Privacy** /
  consent + analytics APIs.
- Making consent + analytics configuration available to trackers before tracker
  effects publish. Trackers must not poll or `setTimeout`-retry while waiting for
  the banner/preferences code to initialize; the generated app should initialize
  the analytics bus from client-safe config synchronously or pass an explicit
  ready dependency.
- `role="region"` + `aria-label` are shown in the reference as a starting point;
  the skill decides final landmark/live-region semantics and focus management.

## Without JavaScript (deliberate exclusion)

The consent banner is **intentionally JavaScript-only** — the one sanctioned exception to the whole-site no-JS contract (engineering.md §F4 and its Known-deferred note). With scripting disabled it does not render, and that is acceptable **because it gates nothing else**: show/hide, persisting the visitor's choice, and the Customer Privacy / analytics wiring all require client code, and with no JS there is no consent to capture and no analytics to gate. No content or navigation depends on the banner, so its absence degrades nothing. Do not add a `<noscript>` consent form; record this as a deliberate exclusion, not a gap to close.

## Reference

`reference/consent-banner.html` renders the banner standalone via the
`@tailwindcss/browser` CDN. Because that CDN does **not** fetch external `@import`, the
full `tokens.css` (including `.consent-banner` / `.consent-banner-actions` and the tokens
they use) is **auto-inlined** into that file's `<style>` block between the
`AUTO-GENERATED` markers by `scripts/inline-core-tokens.ts` — exactly like every other
reference page. Don't hand-edit the inlined copy: edit `tokens.css` and run
`pnpm tokens:inline` (CI drift-checks it with `--check`). Verified at desktop (1280) —
centered card, message left / actions right — and mobile (390) — stacked, full-width
Decline/Accept buttons.
