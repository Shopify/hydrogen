#!/usr/bin/env node
import {execSync} from 'child_process';
import fs from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';
import fastGlob from 'fast-glob';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

const COLORS = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
};

function logError(message) {
  console.error(`${COLORS.red}✗${COLORS.reset} ${message}`);
}

function logSuccess(message) {
  console.log(`${COLORS.green}✓${COLORS.reset} ${message}`);
}

function logInfo(message) {
  console.log(`${COLORS.blue}ℹ${COLORS.reset} ${message}`);
}

/**
 * Run codegen for a specific directory
 */
function runCodegen(directory) {
  const packageJsonPath = path.join(directory, 'package.json');

  if (!fs.existsSync(packageJsonPath)) {
    return false;
  }

  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

  // Check if the package has a codegen script
  if (!packageJson.scripts?.codegen) {
    return false;
  }

  logInfo(`Running codegen in ${path.relative(rootDir, directory)}...`);

  try {
    execSync('npm run codegen', {
      cwd: directory,
      stdio: 'pipe',
      encoding: 'utf8',
    });
    return true;
  } catch (error) {
    logError(`Failed to run codegen in ${path.relative(rootDir, directory)}`);
    console.error(error.stdout || error.message);
    return false;
  }
}

/**
 * Check if a file has uncommitted changes
 */
function hasUncommittedChanges(filePath) {
  try {
    const result = execSync(`git diff --name-only "${filePath}"`, {
      cwd: rootDir,
      encoding: 'utf8',
    }).trim();

    return result.length > 0;
  } catch {
    return false;
  }
}

/**
 * Get the git diff for a file
 */
function getGitDiff(filePath) {
  try {
    return execSync(`git diff "${filePath}"`, {
      cwd: rootDir,
      encoding: 'utf8',
    });
  } catch {
    return '';
  }
}

/**
 * Validate that generated files match their source
 */
async function validateCodegen() {
  console.log('🔍 Validating code generation...\n');

  // Find all generated files (excluding examples folder)
  const generatedFiles = await fastGlob('**/*.generated.*', {
    cwd: rootDir,
    absolute: true,
    ignore: ['**/node_modules/**', '**/dist/**', '**/examples/**'],
  });

  if (generatedFiles.length === 0) {
    logInfo('No generated files found to validate');
    return true;
  }

  logInfo(`Found ${generatedFiles.length} generated file(s)\n`);

  // Group files by directory
  const filesByDir = {};
  for (const file of generatedFiles) {
    const dir = path.dirname(file);
    if (!filesByDir[dir]) {
      filesByDir[dir] = [];
    }
    filesByDir[dir].push(file);
  }

  // Store the original content of generated files
  const originalContents = new Map();
  for (const file of generatedFiles) {
    originalContents.set(file, fs.readFileSync(file, 'utf8'));
  }

  // Run codegen in directories that have generated files
  const dirsToCodegen = new Set();
  for (const dir of Object.keys(filesByDir)) {
    // Find the nearest package.json
    let currentDir = dir;
    while (currentDir !== rootDir) {
      if (fs.existsSync(path.join(currentDir, 'package.json'))) {
        dirsToCodegen.add(currentDir);
        break;
      }
      currentDir = path.dirname(currentDir);
    }
  }

  // Run codegen
  let codegenFailed = false;
  for (const dir of dirsToCodegen) {
    if (!runCodegen(dir)) {
      codegenFailed = true;
    }
  }

  if (codegenFailed) {
    logError('\nCodegen failed in one or more directories');
    return false;
  }

  // Check for differences
  console.log('\n📝 Checking for uncommitted changes in generated files...\n');

  const filesWithChanges = [];
  for (const file of generatedFiles) {
    const currentContent = fs.readFileSync(file, 'utf8');
    const originalContent = originalContents.get(file);

    if (currentContent !== originalContent) {
      filesWithChanges.push(file);

      // Restore the original content for now
      fs.writeFileSync(file, originalContent);
    }
  }

  if (filesWithChanges.length > 0) {
    console.log(`Found ${filesWithChanges.length} generated file(s) with uncommitted changes:\n`);

    for (const file of filesWithChanges) {
      const relativePath = path.relative(rootDir, file);
      logError(relativePath);
    }

    console.log('\n❌ Code generation validation failed!');
    console.log('\nTo fix this issue:');
    console.log('1. Run the appropriate codegen command(s):');
    console.log('   - For templates/skeleton: cd templates/skeleton && npm run codegen');
    console.log('   - For other packages: Check package.json for the codegen script');
    console.log('2. Commit the updated generated files');
    console.log('3. Never manually edit generated files (*.generated.*)\n');

    return false;
  }

  logSuccess('All generated files are up to date!');
  return true;
}

/**
 * Detect manual modifications in generated files
 */
async function detectManualModifications() {
  console.log('\n🔍 Detecting manual modifications in generated files...\n');

  // Find all generated files (excluding examples folder)
  const generatedFiles = await fastGlob('**/*.generated.*', {
    cwd: rootDir,
    absolute: true,
    ignore: ['**/node_modules/**', '**/dist/**', '**/examples/**'],
  });

  if (generatedFiles.length === 0) {
    logInfo('No generated files found to check');
    return true;
  }

  // Group files by directory to run codegen
  const filesByDir = {};
  for (const file of generatedFiles) {
    const dir = path.dirname(file);
    if (!filesByDir[dir]) {
      filesByDir[dir] = [];
    }
    filesByDir[dir].push(file);
  }

  // Find directories that need codegen
  const dirsToCodegen = new Set();
  for (const dir of Object.keys(filesByDir)) {
    let currentDir = dir;
    while (currentDir !== rootDir) {
      if (fs.existsSync(path.join(currentDir, 'package.json'))) {
        const packageJson = JSON.parse(fs.readFileSync(path.join(currentDir, 'package.json'), 'utf8'));
        if (packageJson.scripts?.codegen) {
          dirsToCodegen.add(currentDir);
        }
        break;
      }
      currentDir = path.dirname(currentDir);
    }
  }

  // Create temporary backups of all generated files
  const backups = new Map();
  for (const file of generatedFiles) {
    const content = fs.readFileSync(file, 'utf8');
    backups.set(file, content);
  }

  // Run codegen to get fresh generated files
  logInfo('Running codegen to generate fresh files for comparison...');
  for (const dir of dirsToCodegen) {
    try {
      execSync('npm run codegen', {
        cwd: dir,
        stdio: 'pipe',
        encoding: 'utf8',
      });
    } catch (error) {
      // Restore backups if codegen fails
      for (const [file, content] of backups) {
        fs.writeFileSync(file, content);
      }
      logError(`Failed to run codegen in ${path.relative(rootDir, dir)}`);
      return false;
    }
  }

  // Compare fresh generated files with originals
  const manuallyModified = [];
  for (const file of generatedFiles) {
    const freshContent = fs.readFileSync(file, 'utf8');
    const originalContent = backups.get(file);

    if (freshContent !== originalContent) {
      manuallyModified.push({
        file: path.relative(rootDir, file),
        reason: 'Content differs from freshly generated version'
      });
    }
  }

  // Restore original files
  for (const [file, content] of backups) {
    fs.writeFileSync(file, content);
  }

  if (manuallyModified.length > 0) {
    console.log(`\n❌ Found ${manuallyModified.length} manually modified generated file(s):\n`);

    for (const item of manuallyModified) {
      logError(`${item.file}: ${item.reason}`);
    }

    console.log('\n⚠️  Generated files have been manually modified!');
    console.log('\nTo fix this issue:');
    console.log('1. Revert any manual changes to generated files');
    console.log('2. Run the appropriate codegen command to regenerate files');
    console.log('3. Only modify the source GraphQL operations, never the generated files');
    console.log('\nGenerated files (*.generated.*) should NEVER be edited manually.\n');

    return false;
  }

  logSuccess('No manual modifications detected in generated files!');
  return true;
}

// Main execution
(async () => {
  try {
    const codegenValid = await validateCodegen();
    const noManualModifications = await detectManualModifications();

    if (!codegenValid || !noManualModifications) {
      process.exit(1);
    }

    console.log('\n✅ All codegen validations passed!\n');
  } catch (error) {
    logError(`Unexpected error: ${error.message}`);
    process.exit(1);
  }
})();
