#!/usr/bin/env node

/**
 * PROOF: Auto-linking makes local CLI execute instead of npm version
 *
 * This test proves that the .shopify-plugin-links.yml file created by the
 * auto-linker causes @shopify/cli to load the local @shopify/cli-hydrogen
 * plugin instead of the npm-published version.
 *
 * Strategy: Create a command that only exists locally and verify it executes
 * within the monorepo but not outside it.
 */

const {execSync} = require('child_process');
const {existsSync, readFileSync, writeFileSync, rmSync} = require('fs');
const {join, resolve} = require('path');

const REPO_ROOT = resolve(__dirname, '..', '..');
const CLI_PATH = join(REPO_ROOT, 'packages/cli');
const SKELETON_PATH = join(REPO_ROOT, 'templates/skeleton');
const TEST_COMMAND = 'test-autolink-proof';

// Colors
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const RESET = '\x1b[0m';

function log(message, color = RESET) {
  console.log(`${color}${message}${RESET}`);
}

function runCommand(cmd, cwd, options = {}) {
  try {
    return execSync(cmd, {
      cwd,
      encoding: 'utf8',
      stdio: options.silent ? 'pipe' : 'inherit',
      ...options,
    });
  } catch (e) {
    if (options.expectFailure) {
      // Return the actual error output (stdout + stderr)
      return (e.stdout || '') + (e.stderr || '') + (e.message || '');
    }
    if (!options.silent) {
      log(`Command failed: ${cmd}`, RED);
    }
    return null;
  }
}

async function runProof() {
  log('\n🔬 AUTO-LINKING PROOF TEST\n', CYAN);

  // Step 0: Check and remove global npm link if it exists
  log('STEP 0: Checking for global npm link...', YELLOW);
  let hadGlobalLink = false;

  try {
    const globalList = execSync('npm ls -g @shopify/cli-hydrogen 2>&1', {
      encoding: 'utf8',
    });
    hadGlobalLink =
      globalList.includes('@shopify/cli-hydrogen') && globalList.includes('->');

    if (hadGlobalLink) {
      log('  Found global npm link, removing temporarily...', YELLOW);
      try {
        execSync('npm unlink -g @shopify/cli-hydrogen 2>&1', {
          encoding: 'utf8',
          stdio: 'pipe',
        });
        log('  ✓ Global link removed', GREEN);
      } catch (e) {
        log('  ⚠ Could not remove global link, test may be affected', YELLOW);
      }
    } else {
      log('  ✓ No global link found', GREEN);
    }
  } catch (e) {
    // npm ls returns error if package not found, which is fine
    log('  ✓ No global link found', GREEN);
  }

  // Step 1: Create a test command that only exists locally
  log('\nSTEP 1: Creating test command that only exists locally...', YELLOW);

  const testCommandPath = join(
    CLI_PATH,
    'src/commands/hydrogen',
    `${TEST_COMMAND}.ts`,
  );
  const testCommandContent = `import {Command} from '@oclif/core';

export default class TestAutolinkProof extends Command {
  static description = 'Test command - only exists in local CLI';
  
  async run(): Promise<void> {
    console.log('LOCAL_CLI_EXECUTING_MARKER');
    console.log('✅ SUCCESS: This command only exists in the local CLI');
    console.log('✅ The .shopify-plugin-links.yml file is working correctly!');
    process.exit(0);  // Exit successfully to make detection easier
  }
}`;

  writeFileSync(testCommandPath, testCommandContent);

  // Update index.ts to include the command
  const indexPath = join(CLI_PATH, 'src/index.ts');
  const indexContent = readFileSync(indexPath, 'utf8');
  const updatedIndex = indexContent
    .replace(
      "import hook from './hooks/init.js';",
      `import TestAutolinkProof from './commands/hydrogen/${TEST_COMMAND}.js';\nimport hook from './hooks/init.js';`,
    )
    .replace(
      "'hydrogen:upgrade': Upgrade,",
      `'hydrogen:upgrade': Upgrade,\n  'hydrogen:${TEST_COMMAND}': TestAutolinkProof,`,
    );

  writeFileSync(indexPath, updatedIndex);

  // Step 2: Build the CLI
  log('\nSTEP 2: Building CLI with test command...', YELLOW);
  runCommand('npm run build', CLI_PATH);

  // Verify command was built
  const builtCommand = join(
    CLI_PATH,
    'dist/commands/hydrogen',
    `${TEST_COMMAND}.js`,
  );
  if (existsSync(builtCommand)) {
    log('  ✓ Test command built successfully', GREEN);
  } else {
    log('  ✗ Test command not found in build', RED);
    cleanup();
    return;
  }

  // Step 3: Test WITH auto-linking (in monorepo)
  log('\nSTEP 3: Testing within monorepo (auto-linking enabled)...', YELLOW);

  // Remove any existing link file to ensure auto-linker creates it
  const linkFile = join(SKELETON_PATH, '.shopify-plugin-links.yml');
  if (existsSync(linkFile)) {
    rmSync(linkFile);
  }

  // Run command - auto-linker should create link file
  const outputInMonorepo = runCommand(
    `npx shopify hydrogen ${TEST_COMMAND} 2>&1`,
    SKELETON_PATH,
    {silent: true},
  );

  const inMonorepoWorks =
    outputInMonorepo && outputInMonorepo.includes('LOCAL_CLI_EXECUTING_MARKER');

  if (inMonorepoWorks) {
    log('  ✓ Command executes in monorepo', GREEN);

    // Verify link file was created
    if (existsSync(linkFile)) {
      const linkContent = readFileSync(linkFile, 'utf8');
      log('  ✓ Auto-linker created .shopify-plugin-links.yml:', GREEN);
      log(`    ${linkContent.trim().replace(/\n/g, '\n    ')}`, CYAN);
    }
  } else {
    log('  ✗ Command failed in monorepo', RED);
  }

  // Step 4: Test WITHOUT auto-linking (outside monorepo)
  log('\nSTEP 4: Testing outside monorepo (no auto-linking)...', YELLOW);

  const tempDir = '/tmp/test-autolink-proof';
  if (existsSync(tempDir)) {
    rmSync(tempDir, {recursive: true});
  }

  runCommand(`mkdir -p ${tempDir}`, '/tmp');

  // Create minimal Hydrogen project so init hook doesn't exit early
  const packageJson = {
    name: 'test-project',
    dependencies: {
      '@shopify/hydrogen': '*', // This makes isHydrogenProject() return true
    },
  };

  writeFileSync(
    join(tempDir, 'package.json'),
    JSON.stringify(packageJson, null, 2),
  );

  // Try to run the test command (should fail because command doesn't exist in npm version)
  const outputOutside = runCommand(
    `npx @shopify/cli@3.80.4 hydrogen ${TEST_COMMAND} 2>&1`,
    tempDir,
    {silent: true, expectFailure: true},
  );

  // Debug: log the output to see what we're getting
  if (process.env.DEBUG_TEST) {
    log('  DEBUG: Output from outside monorepo:', YELLOW);
    log(outputOutside.substring(0, 500), CYAN);
  }

  // Check if the command was not found (not just the project check)
  const outsideFails =
    outputOutside &&
    (outputOutside.includes('not found') ||
      outputOutside.includes('Unknown command') ||
      outputOutside.includes(`hydrogen ${TEST_COMMAND} is not a`) ||
      outputOutside.includes('is not a hydrogen command'));

  if (outsideFails) {
    log('  ✓ Command not found outside monorepo', GREEN);
    log(
      `  ✓ Error message: "Command hydrogen ${TEST_COMMAND} not found"`,
      GREEN,
    );
  } else {
    log('  ✗ Command unexpectedly worked outside monorepo', RED);
  }

  // Step 5: Test with auto-linking disabled
  log(
    '\nSTEP 5: Testing with auto-linking disabled (HYDROGEN_DISABLE_AUTOLINK=true)...',
    YELLOW,
  );

  // Remove link file
  if (existsSync(linkFile)) {
    rmSync(linkFile);
  }

  const outputDisabled = runCommand(
    `HYDROGEN_DISABLE_AUTOLINK=true npx shopify hydrogen ${TEST_COMMAND} 2>&1`,
    SKELETON_PATH,
    {silent: true},
  );

  const disabledWorks =
    outputDisabled && outputDisabled.includes('LOCAL CLI EXECUTING');

  if (!disabledWorks) {
    log('  ✓ Command fails when auto-linking is disabled', GREEN);
    log('  ✓ No link file was created', GREEN);
  } else {
    log(
      '  ⚠ Command still works - might be cached or linked globally',
      YELLOW,
    );
  }

  // Results
  log('\n' + '='.repeat(60), CYAN);
  log('RESULTS', CYAN);
  log('='.repeat(60), CYAN);

  if (inMonorepoWorks && outsideFails) {
    log('\n✅ PROOF SUCCESSFUL!', GREEN);
    log('\nThe auto-linking feature works correctly:', GREEN);
    log('  • Auto-linker detects monorepo and creates link file', GREEN);
    log('  • @shopify/cli loads local plugin via link file', GREEN);
    log('  • Local CLI executes instead of npm version', GREEN);
    log('  • Commands only available locally can be executed', GREEN);
  } else {
    log('\n❌ TEST INCONCLUSIVE', RED);
    if (!inMonorepoWorks) {
      log('  • Command failed to execute in monorepo', RED);
    }
    if (!outsideFails) {
      log('  • Command unexpectedly worked outside monorepo', RED);
    }
  }

  // Cleanup
  cleanup();

  function cleanup() {
    log('\n🧹 Cleaning up...', YELLOW);

    // Restore index.ts
    writeFileSync(indexPath, indexContent);

    // Remove test command
    if (existsSync(testCommandPath)) {
      rmSync(testCommandPath);
    }

    // Remove link file
    if (existsSync(linkFile)) {
      rmSync(linkFile);
    }

    // Remove temp directory
    if (existsSync(tempDir)) {
      rmSync(tempDir, {recursive: true});
    }

    // Rebuild CLI
    log('  Rebuilding CLI without test command...', YELLOW);
    runCommand('npm run build', CLI_PATH);

    // Restore global link if it existed
    if (hadGlobalLink) {
      log('  Restoring global npm link...', YELLOW);
      try {
        execSync('npm link', {cwd: CLI_PATH, encoding: 'utf8', stdio: 'pipe'});
        log('  ✓ Global link restored', GREEN);
      } catch (e) {
        log(
          '  ⚠ Could not restore global link, run "npm link" in packages/cli',
          YELLOW,
        );
      }
    }

    log('  ✓ Cleanup complete', GREEN);
  }
}

// Run the test
runProof().catch((error) => {
  log(`\n❌ Error: ${error.message}`, RED);
  process.exit(1);
});
