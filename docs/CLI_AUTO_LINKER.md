# CLI Auto-linker

## What

The CLI auto-linker automatically links the local Hydrogen CLI plugin (`@shopify/cli-hydrogen`) when working within the Hydrogen monorepo. This ensures all Hydrogen commands use the local development version instead of globally installed or npm-published versions.

## Why

### The Core Problem: Circular Dependency

The Hydrogen CLI system has an inherent circular dependency that makes auto-linking essential:

```
@shopify/cli-hydrogen (packages/cli)
    ↓ bundles at build time
skeleton template (templates/skeleton)
    ↓ has devDependency on
@shopify/cli (version ~3.80.4)
    ↓ depends on
@shopify/cli-hydrogen (from npm)
    ↓ which bundles
skeleton template (circular!)
```

### Critical Issue: Skeleton Template Bundling

1. **Build-time bundling**: When `@shopify/cli-hydrogen` is built, it copies the entire skeleton template into `dist/assets/hydrogen/starter/`
2. **Version mismatch**: The skeleton template has `@shopify/cli: ~3.80.4` in devDependencies
3. **Wrong CLI used**: Without auto-linking, commands use the npm version of `@shopify/cli-hydrogen`, not local
4. **Stale skeleton**: New projects scaffold with outdated skeleton from npm, not current local version

### Real Impact

Without auto-linking:

- `shopify hydrogen init` creates projects with outdated skeleton template from npm
- Local skeleton changes aren't reflected when scaffolding new projects
- Testing CLI changes requires manual `shopify plugins link` in every project
- Different team members inadvertently test with different CLI versions
- CI/CD may use different versions than local development

## How

The auto-linker:

1. Detects if you're working within the Hydrogen monorepo by checking for npm workspaces
2. Creates/updates `.shopify-plugin-links.yml` in the target project
3. Links to the local `packages/cli` directory
4. Runs automatically via the init hook before every Hydrogen command

### Configuration

| Environment Variable        | Default     | Description                                           |
| --------------------------- | ----------- | ----------------------------------------------------- |
| `HYDROGEN_DISABLE_AUTOLINK` | `undefined` | Set to `"true"` to disable auto-linking               |
| `NODE_ENV`                  | `undefined` | Auto-linking disabled when `"production"` or `"test"` |

### Detection Logic

The auto-linker identifies the Hydrogen monorepo by:

1. Traversing up from current directory
2. Finding `package.json` with:
   - `name: "hydrogen"`
   - `workspaces` array containing `"packages/cli"`

## Command Behavior

### All Commands with Auto-linking Enabled

When auto-linking is enabled (default in monorepo), ALL commands use the local CLI:

| Command              | Behavior                               | Link File Created |
| -------------------- | -------------------------------------- | ----------------- |
| `hydrogen:init`      | Uses local CLI for project scaffolding | Yes               |
| `hydrogen:dev`       | Uses local dev server implementation   | Yes               |
| `hydrogen:build`     | Uses local build pipeline              | Yes               |
| `hydrogen:preview`   | Uses local preview server              | Yes               |
| `hydrogen:deploy`    | Uses local deployment logic            | Yes               |
| `hydrogen:check`     | Uses local diagnostic tools            | Yes               |
| `hydrogen:codegen`   | Uses local GraphQL codegen             | Yes               |
| `hydrogen:setup`     | Uses local setup wizards               | Yes               |
| `hydrogen:link`      | Uses local store linking               | Yes               |
| `hydrogen:unlink`    | Uses local store unlinking             | Yes               |
| `hydrogen:list`      | Uses local store listing               | Yes               |
| `hydrogen:login`     | Uses local auth flow                   | Yes               |
| `hydrogen:logout`    | Uses local auth cleanup                | Yes               |
| `hydrogen:shortcut`  | Uses local shortcut creation           | Yes               |
| `hydrogen:upgrade`   | Uses local upgrade logic               | Yes               |
| `hydrogen:g`         | Uses local generators                  | Yes               |
| `hydrogen:debug:cpu` | Uses local CPU profiling               | Yes               |

### All Commands with Auto-linking Disabled

When `HYDROGEN_DISABLE_AUTOLINK=true`, commands use the npm/global CLI version:

| Command      | Behavior                                   | Link File Created |
| ------------ | ------------------------------------------ | ----------------- |
| All commands | Uses npm-installed `@shopify/cli-hydrogen` | No                |

## Usage Examples

### Working in Monorepo Root

```bash
# From: /path/to/hydrogen
$ shopify hydrogen dev

# Auto-linker output (first run only):
Auto-linking Hydrogen CLI plugin for hydrogen → packages/cli

# Result: .shopify-plugin-links.yml created
@shopify/cli-hydrogen:
  path: /path/to/hydrogen/packages/cli
```

### Working in Example Project

```bash
# From: /path/to/hydrogen/examples/b2b
$ npm run dev

# Auto-linker output (first run only):
Auto-linking Hydrogen CLI plugin for b2b → ../../packages/cli

# Result: examples/b2b/.shopify-plugin-links.yml created
@shopify/cli-hydrogen:
  path: /path/to/hydrogen/packages/cli
```

### Working in Template

```bash
# From: /path/to/hydrogen/templates/skeleton
$ shopify hydrogen build

# Auto-linker output (first run only):
Auto-linking Hydrogen CLI plugin for skeleton → ../../packages/cli

# Result: templates/skeleton/.shopify-plugin-links.yml created
@shopify/cli-hydrogen:
  path: /path/to/hydrogen/packages/cli
```

### External Project via --path Flag

```bash
# From: /path/to/hydrogen
$ shopify hydrogen dev --path /external/my-hydrogen-app

# Auto-linker output (first run only):
Auto-linking Hydrogen CLI plugin for my-hydrogen-app → /path/to/hydrogen/packages/cli

# Result: /external/my-hydrogen-app/.shopify-plugin-links.yml created
@shopify/cli-hydrogen:
  path: /path/to/hydrogen/packages/cli
```

### Disabling Auto-linking

```bash
# Disable for single command
$ HYDROGEN_DISABLE_AUTOLINK=true shopify hydrogen dev

# No auto-linking output
# No .shopify-plugin-links.yml created or modified
# Uses npm-installed CLI version
```

## File Structure Impact

### Link File Location

The `.shopify-plugin-links.yml` file is created in the project root:

```
project-root/
├── .shopify-plugin-links.yml  # Created by auto-linker
├── package.json
├── app/
└── ...
```

### Link File Format

```yaml
@shopify/cli-hydrogen:
  path: /absolute/path/to/hydrogen/packages/cli
```

## Performance

| Operation                                | Time     | Notes               |
| ---------------------------------------- | -------- | ------------------- |
| First run (monorepo detection + linking) | ~20-50ms | File I/O operations |
| Subsequent runs (cached)                 | <5ms     | Memory cache hit    |
| Disabled via env var                     | 0ms      | Early return        |

## Troubleshooting

### Auto-linking Not Working

| Issue                  | Cause                          | Solution                                                 |
| ---------------------- | ------------------------------ | -------------------------------------------------------- |
| No link file created   | Not in monorepo                | Ensure you're in Hydrogen monorepo with valid workspaces |
| Wrong CLI version used | Link file points to wrong path | Delete `.shopify-plugin-links.yml` and run command again |
| Command fails          | CLI not built                  | Run `npm run build` in `packages/cli`                    |
| Auto-linking in CI     | CI environment detected        | Expected behavior - auto-linking disabled in CI          |

### Manual Override

```bash
# Remove auto-created link
$ rm .shopify-plugin-links.yml

# Manually link different CLI
$ shopify plugins link /path/to/other/cli

# Auto-linker will respect manual links unless file is deleted
```

## Implementation Details

### Hook Integration

Auto-linking runs in the `init` hook (`packages/cli/src/hooks/init.ts`):

```typescript
const hook: Hook<'init'> = async function (options) {
  if (!options.id?.startsWith('hydrogen:')) {
    return; // Only for Hydrogen commands
  }

  if (process.env.HYDROGEN_DISABLE_AUTOLINK !== 'true') {
    await ensureMonorepoPluginLinked({
      command: options.id,
      args: options.argv,
      workingDirectory: cwd(),
    });
  }
  // ... rest of init hook
};
```

### Cache Strategy

Two-level caching for performance:

1. **Monorepo root cache**: Stores monorepo detection results
2. **Link status cache**: Stores linking status per project+args combination

### Project Path Resolution

```bash
# Direct execution
$ shopify hydrogen dev
# Uses: current working directory

# Via --path flag
$ shopify hydrogen dev --path ../other-project
# Uses: resolved path from flag

# Via npm script
$ npm run dev
# Uses: package.json directory
```

## Architecture Details

### Package Relationships

| Package                    | Purpose                         | Publishes to npm | Depends on                                     |
| -------------------------- | ------------------------------- | ---------------- | ---------------------------------------------- |
| `@shopify/cli`             | Main Shopify CLI framework      | Yes              | `@shopify/cli-hydrogen` (from npm)             |
| `@shopify/cli-hydrogen`    | Hydrogen plugin for Shopify CLI | Yes              | None (but bundles skeleton)                    |
| `@shopify/create-hydrogen` | Wrapper for `npm create`        | Yes              | `@shopify/cli-hydrogen/commands/hydrogen/init` |
| `skeleton` template        | Default starter template        | No (bundled)     | `@shopify/cli` as devDependency                |

### Build Process

```bash
# packages/cli/tsup.config.ts copies skeleton during build:
await copy(getSkeletonSourceDir(), starterOutDir, {
  force: true,
  recursive: true,
  filter: (filepath) => !/node_modules|\.shopify|\.cache/gi.test(filepath)
});
```

This means:

- Every `@shopify/cli-hydrogen` npm package contains a snapshot of skeleton
- The skeleton in npm might be weeks/months old
- Without auto-linking, `hydrogen init` uses this stale skeleton

### Command Flow

```
Developer runs: npm create @shopify/hydrogen@latest
    ↓
Executes: @shopify/create-hydrogen
    ↓
Imports: @shopify/cli-hydrogen/commands/hydrogen/init
    ↓
Uses: bundled skeleton from dist/assets/hydrogen/starter/
    ↓
Problem: This is the npm version, not local!
```

With auto-linking:

```
Developer runs: shopify hydrogen init (in monorepo)
    ↓
Auto-linker creates: .shopify-plugin-links.yml
    ↓
Points to: /path/to/hydrogen/packages/cli
    ↓
Uses: Local CLI with current skeleton
```

## Testing

### Unit Tests

Run unit tests for auto-linker:

```bash
$ cd packages/cli
$ npm test -- plugin-autolinker.test.ts
```

### End-to-End Tests

The E2E test definitively proves that auto-linking makes the local CLI execute instead of the npm version:

```bash
# Run the proof test that validates local CLI execution
$ node packages/cli/e2e-test-autolink.cjs
```

What the E2E test proves:
1. **Creates a test command** that only exists in the local CLI code
2. **Builds the CLI** with this test command
3. **Executes in monorepo**: Command works, proving local CLI is used
4. **Executes outside monorepo**: Command not found, proving npm version doesn't have it
5. **With HYDROGEN_DISABLE_AUTOLINK=true**: Command fails, proving auto-linking can be disabled

The E2E test is also integrated into the test suite:

```bash
# Runs both unit tests (32) and E2E test (1)
$ npm test -- plugin-autolinker
```

### Manual Verification

```bash
# 1. Create test project
$ mkdir /tmp/test-hydrogen && cd /tmp/test-hydrogen
$ echo '{"name":"test","dependencies":{"@shopify/hydrogen":"*"}}' > package.json

# 2. Run command from monorepo
$ /path/to/hydrogen/packages/cli/bin/run.js hydrogen dev --help

# 3. Verify link file created
$ cat .shopify-plugin-links.yml
@shopify/cli-hydrogen:
  path: /path/to/hydrogen/packages/cli

# 4. Test with auto-linking disabled
$ rm .shopify-plugin-links.yml
$ HYDROGEN_DISABLE_AUTOLINK=true /path/to/hydrogen/packages/cli/bin/run.js hydrogen dev --help

# 5. Verify no link file created
$ ls .shopify-plugin-links.yml
ls: .shopify-plugin-links.yml: No such file or directory
```

## Migration Guide

### For Existing Developers

No action required. Auto-linking activates automatically when:

1. Working in the Hydrogen monorepo
2. Running any Hydrogen command
3. Not explicitly disabled

### For CI/CD Systems

Auto-linking is automatically disabled when:

- `NODE_ENV=production`
- `NODE_ENV=test`
- `CI=true`
- `GITHUB_ACTIONS=true`

### Removing Manual Links

If you previously used manual linking:

```bash
# Find all manual link files
$ find . -name ".shopify-plugin-links.yml" -type f

# Remove them to allow auto-linking
$ find . -name ".shopify-plugin-links.yml" -type f -delete
```

## Related Files

| File                                                | Purpose                                       |
| --------------------------------------------------- | --------------------------------------------- |
| `packages/cli/src/lib/plugin-autolinker.ts`        | Core auto-linking implementation             |
| `packages/cli/src/lib/plugin-autolinker.test.ts`   | Unit tests (32 tests)                        |
| `packages/cli/src/lib/plugin-autolinker.e2e.test.ts` | E2E test runner for vitest integration     |
| `packages/cli/e2e-test-autolink.cjs`               | E2E proof test that validates local execution |
| `packages/cli/src/hooks/init.ts`                   | Hook integration point                       |
| `templates/skeleton/.gitignore`                    | Contains `.shopify-plugin-links.yml` entry   |
| `.shopify-plugin-links.yml`                        | Generated link file (git-ignored)            |
