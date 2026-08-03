# Documentation Dependencies

Quick lookup: "I changed X, what docs do I update?"

## Hydrogen Logging Contract

**Code**: `packages/hydrogen/src/core/logging/`, `packages/hydrogen/src/core/index.ts`, and runtime call sites that use `getLogger` or `configureLogging`.

**Docs to Update**:
- `skills/error-reporting/SKILL.md` - internal policy, call conventions, and test expectations.
- `packages/hydrogen/docs/tech-debt.md` - status for related tech-debt entries.
- `.changeset/*.md` - public release impact for behavior, API, or lint-policy changes.
- Public TSDoc on logging exports - API defaults and runtime behavior.
