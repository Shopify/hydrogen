# @shopify/hydrogen-api

## Skills ship with the package

`packages/hydrogen-api/skills/` is bundled into the published tarball (via `"files": ["dist", "skills"]`). LLMs and new developers read it as the contract for how to use the library. When a skill becomes stale, generated integrations break.

When you change `src/` or `package.json`, ask: does `skills/` still correctly describe **behaviour** and **recommended usage**? If not, update it in the same PR.

## What belongs in a skill

**Skills are not a re-listing of the type surface.** Anyone editing code against this package already has the TypeScript LSP — function signatures, option shapes, and return types come from TSDoc on the source. Skills cover what LSP cannot surface:

- Which entry point to reach for in a given situation (full client vs utilities, public vs private token, cache strategy choice).
- Setup steps that span multiple files (`codegen.ts` wiring, bundler configuration when something changes).
- Invariants and constraints (e.g., API version is pinned; internal queries are generated against it; `#graphql` prefix is required for `pluckConfig` to see a template literal).
- When to run tooling (when to regenerate types).
- Default behaviour that isn't encoded in a type (cache defaults, error forwarding, MCP routing).

If the fact is already encoded in a `.ts` signature, leave it to LSP. If the fact is a *decision* or a *recommendation*, it belongs in a skill.

## When to update a skill

Update if your change affects any of these:

- **Setup flow** (new env var, new token type, new bundler config, new client entry point) → `hydrogen-api-setup`.
- **Codegen flow** (new scalar, new preset option, new recommended `codegen.ts` shape, new trigger for regeneration) → `hydrogen-api-codegen`.
- **Grouping or recommendation** in the reference lookup (new cache strategy worth highlighting, new recommended error-handling path, removal of a formerly-public surface) → `hydrogen-api-reference`.
- **A documented default or behaviour** anywhere in the skills.

Skip skill updates for pure bug fixes to undocumented behaviour, internal refactors, TSDoc additions, or new minor exports whose behaviour is obvious from their types.

## Skills in this package

- `skills/hydrogen-api-setup/SKILL.md` — install, token choice, client choice, version pinning, first query.
- `skills/hydrogen-api-codegen/SKILL.md` — `graphql-codegen` wiring, `getSchema`, custom scalars, `#graphql` convention, when to regenerate.
- `skills/hydrogen-api-reference/SKILL.md` — grouped discovery lookup for the public API.
