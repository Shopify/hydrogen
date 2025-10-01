import {execSync, ExecSyncOptionsWithBufferEncoding} from 'child_process';
import {rmSync} from 'fs';
import {applyRecipe} from './apply';
import {TEMPLATE_PATH, COOKBOOK_PATH} from './constants';
import {loadRecipe, Recipe} from './recipe';
import path from 'path';

export function validateStepNumbering(recipe: Recipe): void {
  console.log(`- 🔢 Checking step numbering…`);

  const stepsByNumber = new Map<string, Set<string>>();

  for (let i = 0; i < recipe.steps.length; i++) {
    const step = recipe.steps[i];
    const stepNum = String(step.step);
    let names = stepsByNumber.get(stepNum);

    if (!names) {
      names = new Set();
      stepsByNumber.set(stepNum, names);
    }

    if (names.has(step.name)) {
      throw new Error(
        `Step ${stepNum} has duplicate name "${step.name}". ` +
          `Grouped steps must have distinct names.`,
      );
    }

    names.add(step.name);
  }
}

/**
 * Validate a recipe.
 * @param params - The parameters for the validation.
 */
export function validateRecipe(params: {
  recipeTitle: string;
  hydrogenPackagesVersion?: string;
}): boolean {
  const start = Date.now();

  const {recipeTitle, hydrogenPackagesVersion} = params;

  try {
    const recipeDir = path.join(COOKBOOK_PATH, 'recipes', recipeTitle);
    const recipe = loadRecipe({directory: recipeDir});

    // Note: applyRecipe() will also load the recipe. This duplication is acceptable
    // for now as the performance cost is negligible (~5ms). Could be optimized by
    // passing the recipe object to applyRecipe() if needed in the future.
    validateStepNumbering(recipe);

    console.log(`- 🧑‍🍳 Applying recipe '${recipeTitle}'`);
    applyRecipe({
      recipeTitle,
    });
    
    // Check for any .orig or .rej files that might interfere with validation
    const conflictFiles: string[] = [];
    
    try {
      const files = execSync(`find ${TEMPLATE_PATH} -name "*.orig" -o -name "*.rej"`, {
        encoding: 'utf-8',
        stdio: 'pipe'
      }).trim().split('\n').filter(Boolean);
      
      if (files.length > 0) {
        conflictFiles.push(...files);
      }
    } catch (e) {
      // No conflict files found, which is good
    }
    
    if (conflictFiles.length > 0) {
      console.error(`\n❌ Conflict files detected in template directory:`);
      conflictFiles.forEach(file => {
        console.error(`   - ${file}`);
      });
      console.error(`\nThese files will cause TypeScript errors during validation.`);
      console.error(`Please resolve patch conflicts before running validation.`);
      return false;
    }

    const validationCommands: Command[] = [
      ...(hydrogenPackagesVersion != null
        ? [installHydrogenPackages(hydrogenPackagesVersion)]
        : []),
      installDependencies(),
      runCodegen(),
      runTypecheck(),
      buildSkeleton(),
    ];

    for (const {command, options} of validationCommands) {
      console.log(`- 🔬 Running ${command}…`);
      try {
        const result = execSync(command, options);
        // Also log output for successful commands in verbose mode
        if (process.env.VERBOSE) {
          console.log(result.toString());
        }
      } catch (error: any) {
        // Log the actual error output for debugging
        console.log(`❌ Command failed: ${command}`);
        if (error.stdout) {
          console.log('❌ === Command stdout ===');
          const stdout = Buffer.isBuffer(error.stdout) 
            ? error.stdout.toString('utf-8') 
            : error.stdout.toString();
          console.log(stdout);
          console.log('❌ === End stdout ===');
        }
        if (error.stderr) {
          console.log('❌ === Command stderr ===');
          const stderr = Buffer.isBuffer(error.stderr)
            ? error.stderr.toString('utf-8')
            : error.stderr.toString();
          console.log(stderr);
          console.log('❌ === End stderr ===');
        }
        throw error;
      }
    }

    const duration = Date.now() - start;
    console.log(`✅ Recipe '${recipeTitle}' is valid (${duration}ms)`);

    return true;
  } catch (error) {
    console.error(error);
    return false;
  } finally {
    // rewind the changes to the template directory
    execSync(`git checkout -- .`, {cwd: TEMPLATE_PATH});
  }
}

type Command = {
  command: string;
  options: ExecSyncOptionsWithBufferEncoding;
};

function installDependencies(): Command {
  return {
    command: 'npm install',
    options: {cwd: TEMPLATE_PATH, encoding: 'buffer'},
  };
}

function runCodegen(): Command {
  return {
    command: 'npm run codegen',
    options: {cwd: TEMPLATE_PATH, encoding: 'buffer'},
  };
}

function runTypecheck(): Command {
  return {
    command: 'npm run typecheck',
    options: {cwd: TEMPLATE_PATH, encoding: 'buffer'},
  };
}

function buildSkeleton(): Command {
  return {
    command: 'npm run build',
    options: {cwd: TEMPLATE_PATH, encoding: 'buffer'},
  };
}

function installHydrogenPackages(version: string): Command {
  rmSync(path.join(TEMPLATE_PATH, 'package-lock.json'), {force: true});
  const packages = [
    'https://registry.npmjs.org/@shopify/cli-hydrogen/-/cli-hydrogen',
    'https://registry.npmjs.org/@shopify/hydrogen/-/hydrogen',
    'https://registry.npmjs.org/@shopify/remix-oxygen/-/remix-oxygen',
  ];
  return {
    command: `npm install ${packages.map((p) => `${p}-${version}.tgz`).join(' ')}`,
    options: {cwd: TEMPLATE_PATH, encoding: 'buffer'},
  };
}
