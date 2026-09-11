---
name: pull-request-standards
description: >
  Writes clear PR descriptions for contributors of this repository. Always use when creating or
  updating pull request descriptions.
---

# Hydrogen PR Descriptions

Write functional PR descriptions that help reviewers quickly understand the change, intent, and impact.

## Style

- Use short paragraphs, clear headlines, and bullets.
- Write in understandable, simple language. Avoid complex jargon and explain in the simplest possible way
- Use **bold** only for important emphasis.
- Be specific and concise.
- Do not be punchy, sassy, commercial, or launch-y.
- Do not include the whole diff.
- Highlight only what this PR touches.
- The first section is the **Why** of the PR and does not need a title.
- Mention any issues closed by the PR at the beginning.

## Before Writing

Identify the intent behind the pull request via:

- **Conversation context**: the user request, issue, spec, linked PRs, review thread, or task notes that explain why the work exists.
- **Diff** between the branch this PR is merging into and this PR.
- **Why**: the problem, drift, missing source of truth, or developer pain.
- **Developer impact**: public APIs, exports, examples, skills, docs, generated types, or migration work.
- **UX impact**: routes, buttons, UI states, forms, navigation, copy, loading states, or accessibility behavior.
- **Before/after**: the smallest useful old/new code or behavior comparison.
- **Versioning**: whether a changeset is needed and why.
- **Manual testing**: the exact human workflow that proves the behavior works.
- **Boundaries and risk**: what was intentionally left out, known tradeoffs, or follow-up work deferred to later PRs.

## Template

Use only the sections that apply:

```md
Closes #[number]

TL;DR: [Short explanation of the problem and intent.]

## Before

[Short code snippet or behavior summary showing the previous state.]

## After

[Short code snippet or behavior summary showing the new state.]

## What this changes

- [Concrete change]
- [Concrete change]

## Developer impact

[Only if library users, examples, public exports, package skills, types, or migration paths change.]

## UX impact

[Only if UI, routes, forms, buttons, navigation, loading states, copy, or accessibility behavior changes.]

## Out of scope

[Only if there are intentional boundaries, known tradeoffs, or risks reviewers should know about.]

**Out of scope**
- [What this PR deliberately does not address]


## Risk

- [What could break, what we are accepting as a tradeoff, or what needs extra scrutiny]

## How to Test

[Human-facing manual steps. Include setup, folder changes, dev server commands, environment assumptions, and behavior to verify.]
```

Do not include categories that do not apply.

## Rules

- Never assume the reader will have full context of the situation
- Prefer **source-of-truth** framing when the PR aligns server handlers, examples, generated types, or agent skills.
- Use conversation context to recover intent; the diff usually shows what changed, not why it changed.
- If the why is not clear from the diff, issue, spec, linked PRs, review thread, or current conversation, ask the user before drafting.
- Use before/after snippets for API and example migrations.
- Keep snippets short and focused on the changed contract.
- Separate developer-facing impact from implementation details.
- Include UX impact for any visible route, UI, navigation, or interaction change.
- Call out direct public entrypoint changes separately from internal refactors.
- Explain changeset level when the diff touches `packages/hydrogen/src/**`, package exports, `packages/hydrogen/skills/**`, or examples that teach supported patterns. See **Versioning** below.
- Do not use linting, unit tests, integration tests, typechecks, or CI as `How to Test`.
- If there is no meaningful manual behavior to test, omit `How to Test`.
- `Out of scope` names what this PR does not try to solve. It is not a roadmap.
- `Risk` names what could go wrong, what we are knowingly accepting, or what deserves extra reviewer attention.

## Versioning

When the diff touches library code, exports, packaged skills, or teaching examples, say whether a changeset is included and why that bump level fits. Put this in **Developer impact** unless versioning is the whole point of the PR.

Use these levels for `@shopify/hydrogen`:

- **patch**: bug fixes, internal refactors, or skill/example hardening with no new public API
- **minor**: new exports, helpers, or supported patterns that are additive for consumers
- **major**: breaking changes to public exports or taught patterns

This is an example of the level of detail expected. Do not force every PR into this exact wording.

```md
## Developer impact

Includes a **patch** changeset for `@shopify/hydrogen`. Tightens cart drawer skill guidance and the Next.js example wiring. No new exports and no runtime contract changes.
```

```md
## Developer impact

Includes a **minor** changeset for `@shopify/hydrogen`. Adds predictive search helpers, server handlers, and framework bindings. Consumers can adopt the new API without breaking existing search routes.
```

If no changeset is needed, say why. Example-only or repo-local skill changes that do not ship in `@shopify/hydrogen` do not need a package bump.

## Manual Testing

`How to Test` is for local manual verification by a human. Assume a MacBook unless told otherwise.

Include every step needed to exercise the behavior:

This is an example of the level of detail expected. Do not force every PR into this exact flow.

```md
## How to Test

1. Run `pnpm install && pnpm build:pkgs` to rebuild the packages.
2. Run `pnpm dev:next` to start the Next.js example app.
3. Open `http://localhost:3000/collections/frontpage`.
4. Select a filter.
5. Confirm the URL updates and the product grid shows the filtered products.
6. Reload the page.
7. Confirm the same filter remains selected and the same products render.
```

## Anti-Patterns

- Do not write only a diff summary.
- Do not include headings that do not apply.
- Do not hide developer or UX impact in implementation bullets.
- Do not describe unrelated future work in `What this changes`. Use `Out of scope` only for boundaries of this PR.
- Do not use `pnpm lint`, `pnpm typecheck`, unit tests, or CI as manual testing instructions.
- Do not over-explain code that TypeScript or the diff already makes obvious.
