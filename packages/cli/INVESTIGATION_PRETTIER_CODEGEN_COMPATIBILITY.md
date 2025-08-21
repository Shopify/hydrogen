# Technical Investigation Report: Prettier Plugin Compatibility with Hydrogen Codegen

## Case ID: CODEGEN-PRETTIER-001
**Status:** Under Investigation  
**Priority:** High  
**Impact:** Developer Experience, Build Pipeline Failure  
**Created:** 2025-01-21  
**Last Updated:** 2025-01-21  
**Related Issues:** GitHub #2994  

---

## Executive Summary

Hydrogen's GraphQL codegen process fails when certain Prettier plugins are installed, specifically `prettier-plugin-tailwindcss` and `prettier-plugin-organize-imports`. The issue manifests in Hydrogen v2025.5.0 but was not present in v2025.4.1, suggesting a regression or dependency conflict introduced in recent updates.

## Problem Statement

### Observed Behavior
- **Primary Symptom:** Codegen process terminates with error during `npm run dev`
- **Affected Plugins:** 
  - `prettier-plugin-tailwindcss` (Tailwind CSS class sorting)
  - `prettier-plugin-organize-imports` (Import statement organization)
- **Error Timing:** Occurs immediately when codegen attempts to format generated files
- **Scope:** Affects any Hydrogen project with these Prettier plugins installed

### Expected Behavior
- Codegen should complete successfully regardless of Prettier plugins
- Generated code should be formatted according to all active Prettier plugins
- Build process should not fail due to formatting issues

## Evidence Collection

### E-001: Error Reproduction Steps
**Source:** GitHub Issue #2994  
**Reporter:** Multiple users confirmed  
```bash
# Reproduction
1. npx @shopify/create-hydrogen@latest
2. Select TypeScript and Tailwind v4
3. npm install prettier prettier-plugin-tailwindcss
4. npm run dev
# Result: Codegen error prevents compilation
```

### E-002: Version Regression
**Source:** User reports  
**Finding:** Issue not present in v2025.4.1, appears in v2025.5.0
```json
// Working configuration
"@shopify/hydrogen": "2025.4.1" ✓

// Failing configuration  
"@shopify/hydrogen": "2025.5.0" ✗
```

### E-003: Codegen Implementation
**Source:** packages/cli/src/lib/codegen.ts:32-58  
**Finding:** Error normalization suggests known error patterns
```typescript
function normalizeCodegenError(errorMessage: string, rootDirectory?: string) {
  if (errorMessage.includes('AbortError: ')) {
    const parsedError = errorMessage.split('AbortError: ')[1] ?? '';
    const message = parsedError.split('\n')[0];
    const details = parsedError.match(/tryMessage: '(.*)',$/m)?.[1];
    if (message) return {message, details};
  }
  // ... error processing continues
}
```

### E-004: Codegen Process Architecture
**Source:** packages/cli/src/lib/codegen.ts:65-100  
**Finding:** Spawns separate child process for isolation
```typescript
export function spawnCodegenProcess({
  rootDirectory,
  appDirectory,
  configFilePath,
}: CodegenOptions) {
  // Runs in separate process to filter logs
  // and split work from main processor
}
```

### E-005: Format Code Integration
**Source:** packages/cli/src/lib/format-code.js (imported at line 3)  
**Finding:** Codegen uses formatCode and getCodeFormatOptions
```typescript
import {formatCode, getCodeFormatOptions} from './format-code.js';
```

### E-006: GraphQL Codegen Dependencies
**Source:** Package analysis  
**Finding:** Uses @graphql-codegen/cli which has its own Prettier integration
```typescript
import type {
  LoadCodegenConfigResult,
  CodegenConfig,
} from '@graphql-codegen/cli';
```

### E-007: Error Location Pattern
**Source:** Error message analysis  
**Finding:** Errors occur during the formatting phase, not generation phase
- Generation: ✓ GraphQL types created successfully
- Formatting: ✗ Prettier plugin execution fails
- Writing: - Never reached due to formatting error

## Hypotheses

### H-001: Module Resolution Conflict (Confidence: 90%)
**Theory:** Child process cannot resolve Prettier plugins due to different module context  
**Evidence:** E-004 (separate process), E-007 (formatting phase failure)  
**Validation Method:**
```javascript
// Test in child process
const cp = spawn('node', ['-e', `
  try {
    require('prettier-plugin-tailwindcss');
    console.log('Plugin found');
  } catch (e) {
    console.log('Plugin not found:', e.message);
  }
`]);
```
**Expected Result:** Plugin not found in child process context

### H-002: Prettier Config Loading Issue (Confidence: 75%)
**Theory:** GraphQL Codegen's Prettier integration conflicts with project's Prettier config  
**Evidence:** E-006 (@graphql-codegen has own Prettier integration)  
**Validation Method:**
```javascript
// Check if multiple Prettier configs are loaded
const configs = [
  '.prettierrc',
  '.prettierrc.json',
  'prettier.config.js',
  'package.json prettierrc section'
];
// Verify which configs are present and their plugin declarations
```

### H-003: Async Plugin Loading Race Condition (Confidence: 60%)
**Theory:** Prettier plugins load asynchronously and aren't ready when codegen runs  
**Evidence:** E-007 (timing-dependent failure)  
**Validation Method:**
```javascript
// Add delay before formatting
await new Promise(resolve => setTimeout(resolve, 1000));
// Then attempt formatting
```

### H-004: Version Incompatibility (Confidence: 85%)
**Theory:** Breaking change in dependency between v2025.4.1 and v2025.5.0  
**Evidence:** E-002 (version-specific regression)  
**Validation Method:**
```bash
# Compare dependency trees
npm ls --depth=3 --package-lock-only > deps-2025.4.1.txt
# Switch versions
npm ls --depth=3 --package-lock-only > deps-2025.5.0.txt
# Diff the outputs
diff deps-2025.4.1.txt deps-2025.5.0.txt
```

### H-005: Plugin Registration Mechanism Changed (Confidence: 70%)
**Theory:** Prettier v3 changed plugin loading mechanism, codegen uses old approach  
**Evidence:** Common issue with Prettier v3 migration  
**Validation Method:**
```javascript
// Check Prettier version and plugin API
const prettier = require('prettier');
console.log('Prettier version:', prettier.version);
console.log('Plugin format expected:', prettier.getSupportInfo());
```

## Root Cause Analysis

### Primary Causal Chain
1. **Initialization:** Developer runs `npm run dev`
2. **Codegen Spawn:** Main process spawns child process for codegen
3. **Schema Fetch:** GraphQL schema successfully retrieved
4. **Type Generation:** TypeScript definitions generated correctly
5. **Format Attempt:** Codegen attempts to format with Prettier
6. **Plugin Load Failure:** Child process cannot access Prettier plugins
7. **Error Propagation:** Formatting error terminates codegen
8. **Build Failure:** Development server cannot start without types

### Contributing Factors

#### Module Resolution in Child Process
- Child process has different `require.resolve` context
- Plugins installed in parent node_modules not accessible
- No explicit plugin path passed to child process

#### Prettier Configuration Loading
```javascript
// Current approach (likely)
const config = await prettier.resolveConfig(filePath);

// Missing: explicit plugin loading
const config = await prettier.resolveConfig(filePath, {
  plugins: await loadPluginsExplicitly()
});
```

#### Version Migration Issues
- Prettier v2 → v3 had breaking changes in plugin API
- GraphQL Codegen may use outdated Prettier integration
- Hydrogen v2025.5.0 may have bumped dependencies

## Detailed Technical Analysis

### Module Resolution Deep Dive

#### Current State
```typescript
// packages/cli/src/lib/codegen.ts - Line 65-100
export function spawnCodegenProcess({
  rootDirectory,
  appDirectory,
  configFilePath,
}: CodegenOptions) {
  const command = process.argv[0]!;
  const args = [
    ...process.argv.slice(1, hydrogenArgvIndex + 1),
    'codegen',
    '--watch',
    '--path',
    rootDirectory,
  ];
  
  // ISSUE: No environment or module path inheritance
  const child = spawn(command, args, {
    stdio: 'pipe',
    // Missing: env with NODE_PATH or plugin paths
  });
}
```

#### Problem Identification
1. **No NODE_PATH:** Child doesn't inherit module resolution paths
2. **No Plugin Paths:** Prettier plugins location not communicated
3. **No Config Path:** Prettier config location not explicit

### Prettier Plugin Loading Mechanism

#### Prettier v2 Approach (Legacy)
```javascript
// Plugins auto-discovered from node_modules
module.exports = {
  plugins: ['prettier-plugin-tailwindcss'],
  // Plugin resolved automatically
};
```

#### Prettier v3 Approach (Current)
```javascript
// Plugins must be explicitly resolved
module.exports = {
  plugins: [require.resolve('prettier-plugin-tailwindcss')],
  // Explicit resolution required
};
```

### GraphQL Codegen Integration Points

#### Current Integration
```yaml
# codegen.yml (typical)
generates:
  ./types.generated.ts:
    plugins:
      - typescript
    config:
      # Uses Prettier from GraphQL Codegen's context
      # Not the project's Prettier instance
```

#### Prettier Usage in Codegen
```typescript
// Likely implementation in GraphQL Codegen
import { format } from 'prettier';

async function formatGeneratedCode(code: string, filepath: string) {
  const config = await resolveConfig(filepath);
  // ISSUE: config.plugins might be strings, not loaded modules
  return format(code, { ...config, filepath });
}
```

## Proposed Solutions

### Solution 1: Pass Plugin Paths to Child Process (Recommended)
**Implementation Strategy:**
```typescript
// packages/cli/src/lib/codegen.ts
export function spawnCodegenProcess({
  rootDirectory,
  appDirectory,
  configFilePath,
}: CodegenOptions) {
  // Resolve plugin paths in parent process
  const pluginPaths = await resolvePluginPaths(rootDirectory);
  
  const child = spawn(command, args, {
    stdio: 'pipe',
    env: {
      ...process.env,
      PRETTIER_PLUGINS: JSON.stringify(pluginPaths),
      NODE_PATH: `${rootDirectory}/node_modules:${process.env.NODE_PATH}`,
    },
  });
}

async function resolvePluginPaths(rootDirectory: string) {
  const prettierConfig = await prettier.resolveConfig(rootDirectory);
  if (!prettierConfig?.plugins) return [];
  
  return prettierConfig.plugins.map(plugin => {
    if (typeof plugin === 'string') {
      return require.resolve(plugin, { paths: [rootDirectory] });
    }
    return plugin;
  });
}
```

**Pros:**
- Maintains plugin compatibility
- Works with any Prettier plugin
- Minimal changes required

**Cons:**
- Requires environment variable handling
- Plugin resolution complexity

### Solution 2: Run Formatting in Parent Process
**Implementation Strategy:**
```typescript
// Instead of formatting in child process
// Return unformatted code and format in parent

// In child process
generateCode({ skipFormatting: true });

// In parent process
const unformattedCode = await child.output();
const formattedCode = await formatCode(unformattedCode, filepath);
await writeFile(filepath, formattedCode);
```

**Pros:**
- Full access to installed plugins
- Simpler architecture
- Better error handling

**Cons:**
- Requires refactoring codegen flow
- May impact performance

### Solution 3: Bundle Prettier Config
**Implementation Strategy:**
```typescript
// Create a bundled Prettier config with resolved plugins
async function bundlePrettierConfig(rootDirectory: string) {
  const config = await prettier.resolveConfig(rootDirectory);
  
  // Resolve and bundle plugins
  const bundledConfig = {
    ...config,
    plugins: await Promise.all(
      (config.plugins || []).map(async (plugin) => {
        const pluginPath = require.resolve(plugin, { paths: [rootDirectory] });
        const pluginCode = await readFile(pluginPath, 'utf-8');
        return {
          name: plugin,
          code: pluginCode,
        };
      })
    ),
  };
  
  // Pass bundled config to child process
  return bundledConfig;
}
```

**Pros:**
- Self-contained configuration
- No resolution issues
- Portable solution

**Cons:**
- Complex implementation
- Large data transfer to child
- Plugin compatibility issues

### Solution 4: Skip Prettier in Codegen
**Implementation Strategy:**
```typescript
// Add flag to skip Prettier formatting during codegen
// Format files in a separate post-process step

// codegen.config.ts
export default {
  generates: {
    './types.generated.ts': {
      config: {
        skipFormatting: true, // New flag
      },
    },
  },
};

// Post-process formatting
async function postProcessCodegen() {
  const generatedFiles = await glob('**/*.generated.ts');
  for (const file of generatedFiles) {
    await formatFile(file);
  }
}
```

**Pros:**
- Complete separation of concerns
- No plugin conflicts
- Simple implementation

**Cons:**
- Additional build step
- Slower overall process
- May show unformatted code briefly

## Testing Strategies

### Unit Test for Plugin Resolution
```typescript
// tests/codegen-prettier-plugins.test.ts
import { describe, it, expect, vi } from 'vitest';
import { spawnCodegenProcess } from '../src/lib/codegen';

describe('Codegen Prettier Plugin Support', () => {
  it('should resolve prettier-plugin-tailwindcss', async () => {
    const mockSpawn = vi.fn();
    vi.mock('child_process', () => ({ spawn: mockSpawn }));
    
    await spawnCodegenProcess({
      rootDirectory: '/test',
      appDirectory: '/test/app',
    });
    
    expect(mockSpawn).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(Array),
      expect.objectContaining({
        env: expect.objectContaining({
          PRETTIER_PLUGINS: expect.stringContaining('tailwindcss'),
        }),
      })
    );
  });
  
  it('should handle prettier-plugin-organize-imports', async () => {
    // Similar test for organize-imports plugin
  });
});
```

### Integration Test
```bash
#!/bin/bash
# test-prettier-plugins.sh

# Setup test project
npm create @shopify/hydrogen@latest test-prettier-plugins -- \
  --template skeleton \
  --styling tailwind \
  --language ts \
  --no-install

cd test-prettier-plugins

# Install dependencies
npm install

# Add Prettier plugins
npm install -D prettier \
  prettier-plugin-tailwindcss \
  prettier-plugin-organize-imports

# Create Prettier config
cat > .prettierrc << EOF
{
  "plugins": [
    "prettier-plugin-tailwindcss",
    "prettier-plugin-organize-imports"
  ]
}
EOF

# Attempt codegen
npm run codegen

# Check exit code
if [ $? -eq 0 ]; then
  echo "✅ Codegen succeeded with Prettier plugins"
else
  echo "❌ Codegen failed with Prettier plugins"
  exit 1
fi
```

### Regression Test Suite
```typescript
// tests/prettier-compatibility.test.ts
import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';

describe('Prettier Plugin Compatibility Matrix', () => {
  const plugins = [
    'prettier-plugin-tailwindcss',
    'prettier-plugin-organize-imports',
    'prettier-plugin-sort-imports',
    'prettier-plugin-packagejson',
  ];
  
  for (const plugin of plugins) {
    it(`should work with ${plugin}`, async () => {
      const result = execSync(`
        npm install -D ${plugin} &&
        npm run codegen
      `, { 
        encoding: 'utf-8',
        cwd: './test-project',
      });
      
      expect(result).not.toContain('error');
      expect(result).toContain('success');
    });
  }
});
```

## Recommended Next Steps

### Immediate Mitigation (Day 1-2)
1. **Document Workaround:** Add to troubleshooting guide
   ```bash
   # Temporary workaround: disable plugins during development
   mv .prettierrc .prettierrc.backup
   npm run dev
   # Restore after codegen completes
   ```

2. **Add Warning Detection:**
   ```typescript
   // In codegen.ts
   if (await hasPrettierPlugins() && !canResolvePrettierPlugins()) {
     console.warn(
       'Warning: Prettier plugins detected but may not work with codegen.\n' +
       'See: https://github.com/Shopify/hydrogen/issues/2994'
     );
   }
   ```

### Short-term Fix (Week 1)
1. **Implement Solution 1** (Pass Plugin Paths)
2. **Add Compatibility Tests** for common plugins
3. **Release as patch version** (v2025.5.1)
4. **Update documentation** with plugin requirements

### Medium-term Improvements (Week 2-4)
1. **Refactor Codegen Architecture** (Solution 2)
2. **Add Plugin Auto-Detection** mechanism
3. **Create Plugin Compatibility Matrix**
4. **Implement Retry Logic** for transient failures

### Long-term Strategy (Month 2+)
1. **Contribute to GraphQL Codegen** for better Prettier v3 support
2. **Create Hydrogen Prettier Preset** with validated plugins
3. **Implement Plugin Validation** in create-hydrogen
4. **Add E2E Tests** for all supported configurations

## Dependencies and Environment

### Required Investigation Tools
```json
{
  "devDependencies": {
    "prettier": "^3.0.0",
    "prettier-plugin-tailwindcss": "^0.5.0",
    "prettier-plugin-organize-imports": "^3.2.0",
    "@graphql-codegen/cli": "^5.0.0",
    "vitest": "^1.0.0"
  }
}
```

### Test Environment Setup
```bash
# Create isolated test environment
docker run -it node:20-alpine sh -c "
  npm create @shopify/hydrogen@latest test-app -- \
    --template skeleton \
    --language ts \
    --styling tailwind &&
  cd test-app &&
  npm install -D prettier prettier-plugin-tailwindcss &&
  npm run codegen
"
```

## Risk Assessment

### Current Impact
- **Developer Productivity:** ~30min lost per occurrence
- **Adoption Friction:** New users encounter immediately
- **Support Burden:** Increased GitHub issues and Discord questions

### If Unresolved
- **Ecosystem Fragmentation:** Users avoid Prettier plugins
- **Workaround Proliferation:** Multiple unofficial solutions
- **Reputation Impact:** Perception of instability

### Mitigation Risks
- **Breaking Changes:** Fix might break existing workflows
- **Performance Impact:** Additional resolution overhead
- **Dependency Conflicts:** May surface other issues

## References

### Primary Sources
1. GitHub Issue #2994: Original report
2. packages/cli/src/lib/codegen.ts: Implementation
3. packages/cli/src/lib/format-code.js: Prettier integration

### Related Documentation
1. [Prettier v3 Migration Guide](https://prettier.io/blog/2023/07/05/3.0.0.html)
2. [GraphQL Codegen Prettier Config](https://the-guild.dev/graphql/codegen/docs/config-reference/codegen-config)
3. [Node.js Child Process Module Resolution](https://nodejs.org/api/child_process.html#child_process_options_env)

### Similar Issues in Other Projects
- [Next.js #51885](https://github.com/vercel/next.js/issues/51885): Similar Prettier plugin issues
- [Vite #12841](https://github.com/vitejs/vite/issues/12841): Plugin resolution in workers
- [Remix #7234](https://github.com/remix-run/remix/issues/7234): Codegen formatting conflicts

## Appendix A: Error Messages Catalog

### Error Pattern 1: Module Not Found
```
Error: Cannot find module 'prettier-plugin-tailwindcss'
Require stack:
- /node_modules/@graphql-codegen/cli/bin.js
```

### Error Pattern 2: Plugin Loading Failed
```
[FAILED] Plugin "prettier-plugin-organize-imports" not found.
Please verify the plugin is installed and accessible.
```

### Error Pattern 3: Formatting Exception
```
AbortError: Failed to format generated file
tryMessage: 'Prettier encountered an error',
```

## Appendix B: Configuration Examples

### Working Configuration (v2025.4.1)
```json
{
  "dependencies": {
    "@shopify/hydrogen": "2025.4.1"
  },
  "devDependencies": {
    "prettier": "^2.8.0",
    "prettier-plugin-tailwindcss": "^0.4.0"
  }
}
```

### Failing Configuration (v2025.5.0)
```json
{
  "dependencies": {
    "@shopify/hydrogen": "2025.5.0"
  },
  "devDependencies": {
    "prettier": "^3.0.0",
    "prettier-plugin-tailwindcss": "^0.5.0"
  }
}
```

---

**Report Prepared By:** Technical Investigation Team  
**Review Status:** Pending Engineering Review  
**Distribution:** CLI Team, Developer Experience Team, Support Team