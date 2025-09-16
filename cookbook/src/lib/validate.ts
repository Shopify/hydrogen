import {execSync, ExecSyncOptionsWithBufferEncoding} from 'child_process';
import {rmSync} from 'fs';
import {applyRecipe} from './apply';
import {TEMPLATE_PATH} from './constants';
import path from 'path';
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
    console.log(`- 🧑‍🍳 Applying recipe '${recipeTitle}'`);
    applyRecipe({
      recipeTitle,
    });

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
          console.log(error.stdout.toString());
          console.log('❌ === End stdout ===');
        }
        if (error.stderr) {
          console.log('❌ === Command stderr ===');
          console.log(error.stderr.toString());
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
