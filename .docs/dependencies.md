# Documentation Dependencies

Quick lookup: "I changed X, what docs do I update?"

## Hydrogen Logging Contract

**Code**: `packages/hydrogen/src/core/logging/`, `packages/hydrogen/src/core/index.ts`, serialized-script import chains and other direct `consoleLogger` call sites, runtime call sites that use `getLogger` or `configureLogging`, and `.oxlintrc.json` when changing console policy.

**Docs to Update**:
- `skills/error-reporting/SKILL.md` - internal policy, call conventions, and test expectations.
- `packages/hydrogen/docs/tech-debt.md` - status for related tech-debt entries.
- `.changeset/*.md` - public release impact for behavior, API, or lint-policy changes.
- `packages/hydrogen/src/core/logging/logging.ts` - TSDoc for public configuration and console sink behavior.
- `packages/hydrogen/src/core/logging/types.ts` - TSDoc for public logger and context types.

## Storefront API Version Guidance

**Code**: `packages/hydrogen/src/client/types.ts`.

**Docs to Update**:
- `packages/hydrogen/docs/tech-debt.md` - status for API-version override decisions.
- Public TSDoc on `CommonOptions.apiVersion` - supported pattern and limitations.
