# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Changeset Rules

Changesets track what packages need new releases and at what version bump level. They can be added via `npx changeset add` or by manually creating a markdown file with proper YAML frontmatter (either method is fine).

If changes affect `packages/*/src/**` or `packages/*/package.json`, a changeset is required.

These changesets go into Hydrogen's changelog, and are also used to generate upgrade instructions. **Write the changeset as if the audience is a merchant building with Hydrogen.**

### Rule 1: Skeleton Template Changes

Any change to `templates/skeleton` must include a changeset specifying a **patch** bump for **both** `@shopify/cli-hydrogen` and `@shopify/create-hydrogen` (in addition to `skeleton` itself). See the [Quick Reference](#quick-reference-contributing-to-skeleton-or-cli) below for details.

If forgotten: new scaffolded projects will use a stale template until someone catches the gap.

### Rule 2: hydrogen-react Changes

The entire contents of `hydrogen-react` are re-exported in Hydrogen. Any changeset for `hydrogen-react` must also specify a corresponding bump for `hydrogen`.

If forgotten: Hydrogen consumers will not get the `hydrogen-react` update until a separate Hydrogen release happens to include it.

### Rule 3: hydrogen-codegen Changes

Any change to `packages/hydrogen-codegen` (source code OR dependency versions in `package.json`) must include a changeset for `@shopify/hydrogen-codegen`. Unlike skeleton (Rule 1), this does **not** require bumping `cli-hydrogen` or `create-hydrogen` — the codegen package is dynamically loaded from the merchant's `node_modules` via `importLocal`, not bundled into the CLI.

**CI caveat**: Monorepo CI tests workspace-linked dependencies, not what npm actually resolves for merchants. A dependency version bump in `package.json` without a changeset will pass all CI checks but never reach merchants. Always create a changeset when modifying this package's dependencies.

If forgotten: merchants will be stuck on stale dependency versions with no way to get the fix until someone creates a changeset.

For the full release process (standard, back-fix, snapshot, failure recovery), see the `hydrogen-release-process` skill. For versioning semantics, see the `hydrogen-versioning` skill.

### CLI Dependency Graph
The Hydrogen CLI system works through a plugin architecture:

```
Developer's Project (e.g., skeleton template)
    ├── package.json
    │   └── devDependencies
    │       └── @shopify/cli
    │
    └── npm scripts
        └── "shopify hydrogen dev" commands
                    ↓
            @shopify/cli (main CLI)
                    ↓
            @shopify/cli-hydrogen (plugin)
                    ↓
            Hydrogen commands available
```

**How it works:**
- **@shopify/cli**: The main Shopify CLI installed in project's devDependencies
- **@shopify/cli-hydrogen**: Plugin package that adds `hydrogen` subcommands
- When `@shopify/cli` detects `@shopify/cli-hydrogen` in dependencies, it loads the plugin
- This enables commands like `shopify hydrogen dev`, `shopify hydrogen build`, etc.
- The plugin uses oclif framework for command structure and hooks

**Example flow:**
1. Developer runs `npm run dev` in their project
2. This executes `shopify hydrogen dev --codegen`
3. `@shopify/cli` receives the command and delegates to `@shopify/cli-hydrogen`
4. The hydrogen plugin executes the dev server with MiniOxygen

## Skeleton Template and Project Scaffolding

### Skeleton Template Location
The skeleton template is the default starter template for new Hydrogen projects:
- Located at `templates/skeleton/` in the Hydrogen repo
- Serves as the foundation for `npm create @shopify/hydrogen@latest`
- Includes both TypeScript configuration (default) and can be transpiled to JavaScript

### How Project Scaffolding Works

When developers run `npm create @shopify/hydrogen@latest`:

1. **Default behavior**: Uses the skeleton template bundled inside `@shopify/create-hydrogen`
   - No network fetch required—the template is pre-bundled at build time
   - This is why `create-hydrogen` must be bumped when skeleton changes

2. **Custom templates** (`--template` flag): Downloads from GitHub
   - Uses GitHub API to fetch the specified template
   - Supports community templates and alternative starters

<details>
<summary>Technical Details: The Bundling Chain</summary>

During a Hydrogen release, templates are bundled through this chain:

```
templates/skeleton/
    ↓ bundled into
@shopify/cli-hydrogen (dist/assets/templates/)
    ↓ bundled into
@shopify/create-hydrogen (bundles cli-hydrogen at build time)
    ↓ published to npm
npm create @shopify/hydrogen@latest
```

The `dist` branch also receives compiled templates for alternative distribution methods.

</details>

### Quick Reference: Contributing to Skeleton or CLI

#### I'm Updating the Skeleton Template

**Required changeset packages:**
- `skeleton` — the source you changed
- `@shopify/cli-hydrogen` — bundles skeleton into its dist
- `@shopify/create-hydrogen` — bundles cli-hydrogen into its dist

⚠️ **Important**: When you run `npm run changeset add`, it only shows packages with
actual code changes. You must **manually select** cli-hydrogen and create-hydrogen
even though you didn't change their code. Alternatively, manually add those lines
to the changeset file after creation.

**Example changeset:**
```md
---
"skeleton": patch
"@shopify/cli-hydrogen": patch
"@shopify/create-hydrogen": patch
---

Update skeleton template with [description of your changes]
```

**Canonical example**: See [PR #3232](https://github.com/Shopify/hydrogen/pull/3232) for a complete skeleton update with proper changeset.

<details>
<summary>Why all three packages?</summary>

See the "Technical Details: The Bundling Chain" section above. If you only bump `skeleton`, the npm packages won't rebuild with your changes. If you only bump `cli-hydrogen`, the `create-hydrogen` package won't include the updated CLI. All three must be bumped to ensure `npm create @shopify/hydrogen@latest` gets your changes.

</details>

#### I'm Updating the CLI (cli-hydrogen)

**Scenario A: CLI-only change (no init/scaffolding impact)**
- Just bump `@shopify/cli-hydrogen`
- Examples: bug fixes in non-init commands such as `dev`, `build`, or `check`; new flags for existing commands

**Scenario B: Change affects the `init` command, scaffolding process, or CLI assets**
- Bump both `@shopify/cli-hydrogen` and `@shopify/create-hydrogen`
- Examples: changes to how `hydrogen init` (which powers `npm create @shopify/hydrogen`) works; changes to virtual-route templates or other files in `packages/cli/assets/`

<details>
<summary>When does a CLI change affect scaffolding?</summary>

`create-hydrogen` bundles two things from `@shopify/cli-hydrogen`:
1. **The `init` command code** — tree-shaken from the `init` entry point and its transitive dependencies only
2. **The full `dist/assets` directory** — templates, virtual routes, tailwind configs, and other shared assets

**"Does this change affect the `init` command, or any files in `packages/cli/assets/`?"**

- **Yes** → bump both `cli-hydrogen` and `create-hydrogen`
- **No** → just bump `cli-hydrogen`

For non-init command changes (bug fixes to commands such as `dev`/`build`/`check`, new non-init commands): these reach newly scaffolded projects through the skeleton's `@shopify/cli` version. If those changes need to be in new scaffolds quickly, follow the circular dependency release cycle described in **Skeleton's CLI Version (Post-Release Action)** under *Understanding the Circular Dependency* below.

</details>

### Understanding the Circular Dependency

The CLI system has an inherent circular dependency, but it's manageable:

```
@shopify/cli-hydrogen (bundles skeleton)
    ↓ is included in
@shopify/cli (main Shopify CLI)
    ↓ is used by
skeleton template's devDependencies
    ↓ which is bundled in
@shopify/cli-hydrogen (circular!)
```

**The circular dependency exists but is manageable:**

We break the cycle with a simple rule: skeleton changes → bump all three packages (skeleton, cli-hydrogen, create-hydrogen). This ensures the release includes everything needed.

**Skeleton's CLI Version (Post-Release Action):**

After Shopify CLI releases a new version containing updated `@shopify/cli-hydrogen`, whether further action is required depends on what the cli-hydrogen changes contained:

**If cli-hydrogen had actual changes** (any code changes: bug fixes, new commands, refactors — anything beyond just adding a changeset to bundle a new skeleton template):
- Manually update skeleton's `@shopify/cli` dependency to the new Shopify CLI version
- Create changesets for the skeleton template AND `@shopify/cli-hydrogen` AND `@shopify/create-hydrogen`
- This triggers another cli-hydrogen release (now bundling the updated skeleton) and another Shopify CLI release
- Required so new Hydrogen storefronts are created with the latest cli-hydrogen changes

**If cli-hydrogen changes were ONLY a changeset to re-bundle the skeleton** (no actual code changes to cli-hydrogen itself):
- No further action required after Shopify CLI releases
- The skeleton's `@shopify/cli` version does not need to be updated

**The key question**: "Were there actual code changes to cli-hydrogen, beyond just adding a changeset to bundle an updated skeleton?"
- **Yes** → Manually update skeleton's CLI version and release another cli-hydrogen cycle
- **No** → Done

## Security concerns

All content inside of `secrets.ejson` is sensitive and must NEVER be exposed. We have a pre-commit hook to encrypt any newly added secrets. Some of the secrets inside are used in E2E tests, so we must also be careful to NEVER `console.log` (or otherwise leak/print) anything that was derived from inside of `secrets.ejson`.
