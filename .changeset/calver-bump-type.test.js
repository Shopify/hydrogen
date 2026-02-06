#!/usr/bin/env node

/**
 * Tests for CalVer bump type detection and version calculation.
 *
 * These tests verify that:
 * - 'minor' changeset → version increments within quarter (NOT advance quarter)
 * - 'patch' changeset → version increments within quarter
 * - 'major' changeset → version advances to next quarter
 * - Multiple changesets with different bump types → highest wins (major > minor/patch)
 *
 * Run with: node .changeset/calver-bump-type.test.js
 */

const fs = require('fs');
const path = require('path');
const {
  getNextVersion,
  parseVersion,
  hasMajorChangesets,
} = require('./calver-shared.js');
const {
  detectBumpType,
  writeBumpType,
  CALVER_BUMP_FILE,
} = require('./detect-calver-bump-type.js');

const CHANGESET_DIR = path.join(process.cwd(), '.changeset');
const TEST_PREFIX = 'test-calver-bump-';

let testsPassed = 0;
let testsFailed = 0;
let backedUpFiles = [];

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ ${message}`);
    testsPassed++;
  } else {
    console.log(`  ❌ ${message}`);
    testsFailed++;
  }
}

function assertEqual(actual, expected, message) {
  if (actual === expected) {
    console.log(`  ✅ ${message}: ${actual}`);
    testsPassed++;
  } else {
    console.log(`  ❌ ${message}: expected ${expected}, got ${actual}`);
    testsFailed++;
  }
}

function createTestChangeset(name, content) {
  const filePath = path.join(CHANGESET_DIR, `${TEST_PREFIX}${name}.md`);
  fs.writeFileSync(filePath, content);
  return filePath;
}

function backupExistingChangesets() {
  const files = fs.readdirSync(CHANGESET_DIR);
  backedUpFiles = [];
  for (const file of files) {
    if (
      file.endsWith('.md') &&
      file !== 'README.md' &&
      !file.startsWith(TEST_PREFIX)
    ) {
      const originalPath = path.join(CHANGESET_DIR, file);
      const backupPath = path.join(CHANGESET_DIR, file + '.bak');
      fs.renameSync(originalPath, backupPath);
      backedUpFiles.push({original: file, backup: file + '.bak'});
    }
  }
  if (backedUpFiles.length > 0) {
    console.log(`  (Backed up ${backedUpFiles.length} existing changesets)`);
  }
}

function restoreBackedUpChangesets() {
  for (const {original, backup} of backedUpFiles) {
    const originalPath = path.join(CHANGESET_DIR, original);
    const backupPath = path.join(CHANGESET_DIR, backup);
    if (fs.existsSync(backupPath)) {
      fs.renameSync(backupPath, originalPath);
    }
  }
  if (backedUpFiles.length > 0) {
    console.log(`  (Restored ${backedUpFiles.length} existing changesets)`);
  }
  backedUpFiles = [];
}

function cleanupTestChangesets() {
  const files = fs.readdirSync(CHANGESET_DIR);
  for (const file of files) {
    if (file.startsWith(TEST_PREFIX)) {
      fs.unlinkSync(path.join(CHANGESET_DIR, file));
    }
  }
  if (fs.existsSync(CALVER_BUMP_FILE)) {
    fs.unlinkSync(CALVER_BUMP_FILE);
  }
}

function testDetectBumpType() {
  console.log('\n📝 Testing detectBumpType()...\n');

  cleanupTestChangesets();

  console.log('Test 1: Minor changeset should return "patch" (not "major")');
  createTestChangeset(
    'minor',
    `---
'@shopify/hydrogen': minor
---

Test minor bump
`,
  );
  let result = detectBumpType();
  assertEqual(result, 'patch', 'Minor changeset returns patch');

  cleanupTestChangesets();

  console.log('\nTest 2: Patch changeset should return "patch"');
  createTestChangeset(
    'patch',
    `---
'@shopify/hydrogen': patch
---

Test patch bump
`,
  );
  result = detectBumpType();
  assertEqual(result, 'patch', 'Patch changeset returns patch');

  cleanupTestChangesets();

  console.log('\nTest 3: Major changeset should return "major"');
  createTestChangeset(
    'major',
    `---
'@shopify/hydrogen': major
---

Test major bump
`,
  );
  result = detectBumpType();
  assertEqual(result, 'major', 'Major changeset returns major');

  cleanupTestChangesets();

  console.log('\nTest 4: Mixed minor and patch should return "patch"');
  createTestChangeset(
    'minor',
    `---
'@shopify/hydrogen': minor
---

Test minor bump
`,
  );
  createTestChangeset(
    'patch',
    `---
'@shopify/hydrogen-react': patch
---

Test patch bump
`,
  );
  result = detectBumpType();
  assertEqual(result, 'patch', 'Mixed minor/patch returns patch');

  cleanupTestChangesets();

  console.log('\nTest 5: Major wins over minor and patch');
  createTestChangeset(
    'minor',
    `---
'@shopify/hydrogen': minor
---

Test minor bump
`,
  );
  createTestChangeset(
    'major',
    `---
'@shopify/hydrogen-react': major
---

Test major bump
`,
  );
  result = detectBumpType();
  assertEqual(result, 'major', 'Major wins over minor');

  cleanupTestChangesets();

  console.log('\nTest 6: Non-CalVer package changeset should return null');
  createTestChangeset(
    'non-calver',
    `---
'@shopify/cli-hydrogen': minor
---

Test non-CalVer package
`,
  );
  result = detectBumpType();
  assertEqual(result, null, 'Non-CalVer package returns null');

  cleanupTestChangesets();

  console.log('\nTest 7: No changesets should return null');
  result = detectBumpType();
  assertEqual(result, null, 'No changesets returns null');

  cleanupTestChangesets();

  console.log(
    '\nTest 8: skeleton major alone should return "patch" (not "major")',
  );
  createTestChangeset(
    'skeleton-major',
    `---
'skeleton': major
---

Skeleton major bump
`,
  );
  result = detectBumpType();
  assertEqual(result, 'patch', 'skeleton major returns patch');

  cleanupTestChangesets();

  console.log(
    '\nTest 9: skeleton major + hydrogen patch should return "patch"',
  );
  createTestChangeset(
    'skeleton-major',
    `---
'skeleton': major
---

Skeleton major bump
`,
  );
  createTestChangeset(
    'hydrogen-patch',
    `---
'@shopify/hydrogen': patch
---

Hydrogen patch bump
`,
  );
  result = detectBumpType();
  assertEqual(result, 'patch', 'skeleton major + hydrogen patch returns patch');

  cleanupTestChangesets();

  console.log(
    '\nTest 10: skeleton major + hydrogen major should return "major"',
  );
  createTestChangeset(
    'skeleton-major',
    `---
'skeleton': major
---

Skeleton major bump
`,
  );
  createTestChangeset(
    'hydrogen-major',
    `---
'@shopify/hydrogen': major
---

Hydrogen major bump
`,
  );
  result = detectBumpType();
  assertEqual(result, 'major', 'skeleton major + hydrogen major returns major');

  cleanupTestChangesets();

  console.log('\nTest 11: hydrogen-react major alone should return "major"');
  createTestChangeset(
    'react-major',
    `---
'@shopify/hydrogen-react': major
---

React major bump
`,
  );
  result = detectBumpType();
  assertEqual(result, 'major', 'hydrogen-react major returns major');
}

function testVersionCalculation() {
  console.log('\n📐 Testing version calculation logic...\n');

  console.log('Test 1: Patch bump should increment within quarter');
  let result = getNextVersion('2025.7.2', 'patch');
  assertEqual(result, '2025.7.3', 'Patch: 2025.7.2 → 2025.7.3');

  console.log('\nTest 2: Minor bump should also increment within quarter');
  result = getNextVersion('2025.7.2', 'minor');
  assertEqual(result, '2025.7.3', 'Minor: 2025.7.2 → 2025.7.3');

  console.log('\nTest 3: Major bump should advance to next quarter');
  result = getNextVersion('2025.7.2', 'major');
  assertEqual(result, '2025.10.0', 'Major: 2025.7.2 → 2025.10.0');

  console.log('\nTest 4: Major bump at Q4 should roll to next year');
  result = getNextVersion('2025.10.5', 'major');
  assertEqual(result, '2026.1.0', 'Major at Q4: 2025.10.5 → 2026.1.0');
}

function testBugScenario() {
  console.log('\n🐛 Testing the original bug scenario...\n');

  console.log(
    'Scenario: minor changeset for 2025.7.2 should produce 2025.7.3, not 2025.10.0',
  );

  cleanupTestChangesets();
  createTestChangeset(
    'minor-bug-test',
    `---
'@shopify/hydrogen': minor
---

Minor feature addition
`,
  );

  const detectedBumpType = detectBumpType();
  assertEqual(
    detectedBumpType,
    'patch',
    'Detected bump type is patch (not major)',
  );

  const currentVersion = '2025.7.2';
  const newVersion = getNextVersion(currentVersion, detectedBumpType);
  assertEqual(
    newVersion,
    '2025.7.3',
    `Version calculation: ${currentVersion} + ${detectedBumpType} = ${newVersion}`,
  );

  assert(
    newVersion !== '2025.10.0',
    'Version is NOT incorrectly advanced to next quarter (2025.10.0)',
  );

  cleanupTestChangesets();
}

function testHasMajorChangesets() {
  console.log('\n🔍 Testing hasMajorChangesets()...\n');

  cleanupTestChangesets();

  console.log('Test 1: skeleton major alone should return false');
  createTestChangeset(
    'skeleton-major',
    `---
'skeleton': major
---

Skeleton major bump
`,
  );
  let result = hasMajorChangesets();
  assertEqual(result, false, 'skeleton major returns false');

  cleanupTestChangesets();

  console.log('\nTest 2: hydrogen major alone should return true');
  createTestChangeset(
    'hydrogen-major',
    `---
'@shopify/hydrogen': major
---

Hydrogen major bump
`,
  );
  result = hasMajorChangesets();
  assertEqual(result, true, 'hydrogen major returns true');

  cleanupTestChangesets();

  console.log('\nTest 3: hydrogen-react major alone should return true');
  createTestChangeset(
    'react-major',
    `---
'@shopify/hydrogen-react': major
---

React major bump
`,
  );
  result = hasMajorChangesets();
  assertEqual(result, true, 'hydrogen-react major returns true');

  cleanupTestChangesets();

  console.log('\nTest 4: skeleton major + hydrogen major should return true');
  createTestChangeset(
    'skeleton-major',
    `---
'skeleton': major
---

Skeleton major bump
`,
  );
  createTestChangeset(
    'hydrogen-major',
    `---
'@shopify/hydrogen': major
---

Hydrogen major bump
`,
  );
  result = hasMajorChangesets();
  assertEqual(result, true, 'skeleton major + hydrogen major returns true');

  cleanupTestChangesets();

  console.log('\nTest 5: no changesets should return false');
  result = hasMajorChangesets();
  assertEqual(result, false, 'no changesets returns false');
}

function testSkeletonMajorBugScenario() {
  console.log('\n🐛 Testing PR #3451 skeleton-major bug scenario...\n');

  console.log(
    'Scenario: skeleton:major + hydrogen:patch should NOT bump hydrogen to next quarter',
  );

  cleanupTestChangesets();
  createTestChangeset(
    'api-version',
    `---
'skeleton': major
---

Update to new API version
`,
  );
  createTestChangeset(
    'hydrogen-fix',
    `---
'@shopify/hydrogen': patch
---

Fix a bug in hydrogen
`,
  );

  const detectedBumpType = detectBumpType();
  assertEqual(
    detectedBumpType,
    'patch',
    'Detected bump type is patch (not major)',
  );

  const hasMajor = hasMajorChangesets();
  assertEqual(hasMajor, false, 'hasMajorChangesets() returns false');

  const currentVersion = '2025.10.3';
  const newVersion = getNextVersion(currentVersion, detectedBumpType);
  assertEqual(
    newVersion,
    '2025.10.4',
    `hydrogen stays in quarter: ${currentVersion} → ${newVersion}`,
  );

  assert(
    newVersion !== '2026.1.0',
    'hydrogen is NOT incorrectly advanced to 2026.1.0',
  );

  cleanupTestChangesets();

  console.log(
    '\nScenario 2: Single file with skeleton:major + hydrogen:patch in same frontmatter',
  );

  createTestChangeset(
    'combined-api-version',
    `---
'skeleton': major
'@shopify/hydrogen': patch
---

API version update with skeleton major and hydrogen patch in one changeset
`,
  );

  const combinedBumpType = detectBumpType();
  assertEqual(combinedBumpType, 'patch', 'Single-file combined returns patch');

  const combinedHasMajor = hasMajorChangesets();
  assertEqual(
    combinedHasMajor,
    false,
    'Single-file combined hasMajorChangesets is false',
  );

  cleanupTestChangesets();
}

function testWriteAndCleanup() {
  console.log('\n📁 Testing file write and cleanup...\n');

  cleanupTestChangesets();

  console.log('Test 1: writeBumpType creates file with correct content');
  writeBumpType('patch');
  assert(fs.existsSync(CALVER_BUMP_FILE), 'Bump type file exists');
  const content = fs.readFileSync(CALVER_BUMP_FILE, 'utf-8').trim();
  assertEqual(content, 'patch', 'File contains correct bump type');

  console.log('\nTest 2: writeBumpType(null) removes file');
  writeBumpType(null);
  assert(!fs.existsSync(CALVER_BUMP_FILE), 'Bump type file is removed');

  cleanupTestChangesets();
}

function main() {
  console.log(
    '═══════════════════════════════════════════════════════════════',
  );
  console.log(' CalVer Bump Type Detection Tests');
  console.log(
    '═══════════════════════════════════════════════════════════════',
  );

  backupExistingChangesets();

  try {
    testDetectBumpType();
    testVersionCalculation();
    testBugScenario();
    testHasMajorChangesets();
    testSkeletonMajorBugScenario();
    testWriteAndCleanup();
  } finally {
    cleanupTestChangesets();
    restoreBackedUpChangesets();
  }

  console.log(
    '\n═══════════════════════════════════════════════════════════════',
  );
  console.log(` Results: ${testsPassed} passed, ${testsFailed} failed`);
  console.log(
    '═══════════════════════════════════════════════════════════════\n',
  );

  if (testsFailed > 0) {
    process.exit(1);
  }
}

main();
