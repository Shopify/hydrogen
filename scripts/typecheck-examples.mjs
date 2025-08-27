#!/usr/bin/env node

import {exec} from 'child_process';
import {readdirSync, readFileSync} from 'fs';
import {join} from 'path';
import {promisify} from 'util';

const execAsync = promisify(exec);

const EXAMPLES_DIR = './examples';
const STANDALONE_EXAMPLES = ['express']; // Examples that don't use --diff

function isStandaloneExample(exampleName) {
  return STANDALONE_EXAMPLES.includes(exampleName);
}

function isDiffBasedExample(exampleDir) {
  try {
    const packageJson = JSON.parse(
      readFileSync(join(exampleDir, 'package.json'), 'utf8')
    );
    
    // Check if build script uses --diff flag
    const buildScript = packageJson.scripts?.build;
    return buildScript && buildScript.includes('--diff');
  } catch (error) {
    console.warn(`Warning: Could not read package.json for ${exampleDir}`);
    return false;
  }
}

async function runExampleTypecheck(example, exampleDir) {
  const startTime = Date.now();
  
  try {
    let command, description;
    
    if (isStandaloneExample(example)) {
      command = `cd ${exampleDir} && npm run typecheck`;
      description = `Typecheck standalone example: ${example}`;
    } else if (isDiffBasedExample(exampleDir)) {
      command = `cd ${exampleDir} && npm run build`;
      description = `Typecheck diff-based example: ${example} (via build)`;
    } else {
      console.log(`⚠️  Skipping ${example} - could not determine example type`);
      return { example, result: 'SKIPPED', duration: 0 };
    }
    
    console.log(`🔍 Starting ${description}`);
    
    const { stdout, stderr } = await execAsync(command, {
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer for large build outputs
    });
    
    const duration = Date.now() - startTime;
    console.log(`✅ ${description} - PASSED (${(duration/1000).toFixed(1)}s)`);
    
    return { example, result: 'PASSED', duration };
    
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`❌ Typecheck ${example} - FAILED (${(duration/1000).toFixed(1)}s)`);
    
    // Show error details for debugging
    if (error.stdout) console.log('STDOUT:', error.stdout.slice(-500)); // Last 500 chars
    if (error.stderr) console.error('STDERR:', error.stderr.slice(-500)); // Last 500 chars
    
    return { example, result: 'FAILED', duration };
  }
}

// Helper to run tasks in small batches
async function runInBatches(tasks, batchSize) {
  const results = [];
  for (let i = 0; i < tasks.length; i += batchSize) {
    const batch = tasks.slice(i, i + batchSize);
    console.log(`\n⚡ Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(tasks.length/batchSize)} (${batch.length} examples)`);
    const batchResults = await Promise.all(batch.map(task => task()));
    results.push(...batchResults);
  }
  return results;
}

async function ensureSkeletonTypes() {
  console.log('🔧 Ensuring skeleton template has generated GraphQL types...');
  
  try {
    const { stdout, stderr } = await execAsync('cd ./templates/skeleton && npm run codegen', {
      maxBuffer: 10 * 1024 * 1024,
    });
    console.log('✅ Skeleton GraphQL types generated successfully\n');
    return true;
  } catch (error) {
    console.error('❌ Failed to generate skeleton GraphQL types');
    if (error.stdout) console.log('STDOUT:', error.stdout.slice(-500));
    if (error.stderr) console.error('STDERR:', error.stderr.slice(-500));
    return false;
  }
}

async function main() {
  console.log('🚀 Starting optimized typecheck for all examples...\n');
  
  // First, ensure the skeleton template has generated types
  const skeletonTypesReady = await ensureSkeletonTypes();
  if (!skeletonTypesReady) {
    console.error('💥 Cannot proceed without skeleton GraphQL types');
    process.exit(1);
  }
  
  const startTime = Date.now();
  const examples = readdirSync(EXAMPLES_DIR, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);
  
  console.log(`📋 Found ${examples.length} examples: ${examples.join(', ')}\n`);
  
  // Separate examples by type for optimal execution
  const standaloneExamples = [];
  const diffBasedExamples = [];
  
  for (const example of examples) {
    const exampleDir = join(EXAMPLES_DIR, example);
    if (isStandaloneExample(example)) {
      standaloneExamples.push(example);
    } else if (isDiffBasedExample(exampleDir)) {
      diffBasedExamples.push(example);
    } else {
      console.log(`⚠️  Skipping ${example} - could not determine example type`);
    }
  }
  
  console.log(`📦 Strategy: ${standaloneExamples.length} standalone (parallel) + ${diffBasedExamples.length} diff-based (sequential)\n`);
  
  const allResults = [];
  
  // Run standalone examples in parallel (fast, no conflicts)
  if (standaloneExamples.length > 0) {
    console.log('⚡ Running standalone examples in parallel...');
    const standalonePromises = standaloneExamples.map(example => {
      const exampleDir = join(EXAMPLES_DIR, example);
      return runExampleTypecheck(example, exampleDir);
    });
    const standaloneResults = await Promise.all(standalonePromises);
    allResults.push(...standaloneResults);
  }
  
  // Run diff-based examples sequentially (slow, but avoid conflicts)
  if (diffBasedExamples.length > 0) {
    console.log('\n🔄 Running diff-based examples sequentially to avoid conflicts...');
    for (const example of diffBasedExamples) {
      const exampleDir = join(EXAMPLES_DIR, example);
      const result = await runExampleTypecheck(example, exampleDir);
      allResults.push(result);
    }
  }
  
  const results = allResults;
  
  // Process results
  const passCount = results.filter(r => r.result === 'PASSED').length;
  const failCount = results.filter(r => r.result === 'FAILED').length;
  const skipCount = results.filter(r => r.result === 'SKIPPED').length;
  
  const totalDuration = Date.now() - startTime;
  
  // Summary
  console.log('\n📊 TYPECHECK RESULTS SUMMARY');
  console.log('================================');
  
  // Sort results: FAILED first, then PASSED, then SKIPPED
  const sortedResults = results.sort((a, b) => {
    const order = { 'FAILED': 0, 'PASSED': 1, 'SKIPPED': 2 };
    return order[a.result] - order[b.result];
  });
  
  for (const { example, result, duration } of sortedResults) {
    const emoji = result === 'PASSED' ? '✅' : result === 'FAILED' ? '❌' : '⚠️';
    const timeStr = duration > 0 ? ` (${(duration/1000).toFixed(1)}s)` : '';
    console.log(`${emoji} ${example}: ${result}${timeStr}`);
  }
  
  console.log(`\n📈 Total: ${passCount} passed, ${failCount} failed, ${skipCount} skipped`);
  console.log(`⏱️  Completed in ${(totalDuration/1000).toFixed(1)}s (parallel execution)`);
  
  if (failCount > 0) {
    console.log(`\n💥 ${failCount} examples failed typecheck`);
    process.exit(1);
  }
  
  console.log('\n🎉 All examples passed typecheck!');
}

main().catch(error => {
  console.error('Error running typecheck-examples:', error);
  process.exit(1);
});