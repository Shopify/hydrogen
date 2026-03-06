import {describe, it, expect, beforeEach, afterEach} from 'vitest';
import {applyRecipe} from './apply';
import fs from 'fs';
import path from 'path';
import {execSync} from 'child_process';

const REPO_ROOT = path.resolve(__dirname, '../../..');
const TEST_TEMPLATE_DIR = path.join(REPO_ROOT, '.tmp/test-apply-template');
const SKELETON_PATH = path.join(REPO_ROOT, 'templates/skeleton');

describe('applyRecipe with --template flag', () => {
  beforeEach(() => {
    // Clean up test directory
    if (fs.existsSync(TEST_TEMPLATE_DIR)) {
      fs.rmSync(TEST_TEMPLATE_DIR, {recursive: true, force: true});
    }
    // Ensure parent directory exists
    fs.mkdirSync(path.dirname(TEST_TEMPLATE_DIR), {recursive: true});
  });

  afterEach(() => {
    // Clean up test directory
    if (fs.existsSync(TEST_TEMPLATE_DIR)) {
      fs.rmSync(TEST_TEMPLATE_DIR, {recursive: true, force: true});
    }
  });

  it('applies recipe to custom template path without mutating original skeleton', () => {
    // Copy skeleton to test directory
    execSync(`cp -r "${SKELETON_PATH}" "${TEST_TEMPLATE_DIR}"`);

    // Verify skeleton has a file that markets recipe will delete
    const originalSkeletonFile = path.join(
      SKELETON_PATH,
      'app/routes/_index.tsx',
    );
    const testTemplateFile = path.join(
      TEST_TEMPLATE_DIR,
      'app/routes/_index.tsx',
    );

    expect(fs.existsSync(originalSkeletonFile)).toBe(true);
    expect(fs.existsSync(testTemplateFile)).toBe(true);

    // Set CI=true to skip git status check
    const originalCI = process.env.CI;
    process.env.CI = 'true';

    try {
      // Apply markets recipe to test template (markets deletes non-localized routes)
      applyRecipe({
        recipeTitle: 'markets',
        templatePath: TEST_TEMPLATE_DIR,
      });
    } finally {
      process.env.CI = originalCI;
    }

    // Verify the test template was modified (file deleted)
    expect(fs.existsSync(testTemplateFile)).toBe(false);

    // Verify the original skeleton was NOT modified (file still exists)
    expect(fs.existsSync(originalSkeletonFile)).toBe(true);

    // Verify localized route was created in test template
    const localizedRoute = path.join(
      TEST_TEMPLATE_DIR,
      'app/routes/($locale)._index.tsx',
    );
    expect(fs.existsSync(localizedRoute)).toBe(true);
  });

  it('applies patches to custom template path', () => {
    // Copy skeleton to test directory
    execSync(`cp -r "${SKELETON_PATH}" "${TEST_TEMPLATE_DIR}"`);

    const rootFile = path.join(TEST_TEMPLATE_DIR, 'app/root.tsx');
    const originalContent = fs.readFileSync(rootFile, 'utf-8');

    // Set CI=true to skip git status check
    const originalCI = process.env.CI;
    process.env.CI = 'true';

    try {
      // Apply markets recipe which patches root.tsx
      applyRecipe({
        recipeTitle: 'markets',
        templatePath: TEST_TEMPLATE_DIR,
      });
    } finally {
      process.env.CI = originalCI;
    }

    const modifiedContent = fs.readFileSync(rootFile, 'utf-8');

    // Verify the file was modified
    expect(modifiedContent).not.toBe(originalContent);

    // Verify it contains market-specific changes
    expect(modifiedContent).toContain('selectedLocale');
  });
});
