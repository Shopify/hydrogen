import {execSync, ExecSyncOptionsWithBufferEncoding} from 'child_process';
import {rmSync} from 'fs';
import fs from 'fs';
import {applyRecipe} from './apply';
import {
  TEMPLATE_PATH,
  COOKBOOK_PATH,
  LLMS_PATH,
  RENDER_FILENAME_GITHUB,
} from './constants';
import {loadRecipe, Recipe} from './recipe';
import path from 'path';
import YAML from 'yaml';
import {ZodError} from 'zod';

export type ValidationError = {
  validator: string;
  message: string;
  location?: string;
  lineNumber?: number;
};

export type ValidationResult = {
  valid: boolean;
  errors: ValidationError[];
};

function getYamlNode(
  yamlPath: string,
  errorPath: (string | number)[],
): any {
  try {
    const content = fs.readFileSync(yamlPath, 'utf8');
    const doc = YAML.parseDocument(content, {keepSourceTokens: true});

    let node: any = doc.contents;

    for (let i = 0; i < errorPath.length; i++) {
      const segment = errorPath[i];

      if (node == null) return null;

      if (typeof segment === 'number' && Array.isArray(node?.items)) {
        node = node.items[segment];
      } else if (typeof segment === 'string' && typeof node?.get === 'function') {
        node = node.get(segment, true);
      } else {
        return null;
      }
    }

    return node;
  } catch {
    return null;
  }
}

export function getYamlLineNumber(
  yamlPath: string,
  errorPath: (string | number)[],
): number | null {
  try {
    const content = fs.readFileSync(yamlPath, 'utf8');
    const node = getYamlNode(yamlPath, errorPath);

    if (node?.range?.[0] != null) {
      const lineNumber =
        content.substring(0, node.range[0]).split('\n').length;
      return lineNumber;
    }

    return null;
  } catch {
    return null;
  }
}

function getYamlValue(yamlPath: string, errorPath: (string | number)[]): string | null {
  try {
    const node = getYamlNode(yamlPath, errorPath);
    if (node == null) return null;

    const value = node.toJSON();
    return JSON.stringify(value);
  } catch {
    return null;
  }
}

export function formatValidationError(err: ValidationError): string {
  const linePrefix = err.lineNumber
    ? `recipe.yaml:${err.lineNumber}`.padEnd(20)
    : ''.padEnd(20);
  const locationStr = err.location ? err.location.padEnd(30) : '';
  const message = `${err.validator}: ${err.message}`;
  return `${linePrefix}${locationStr}${message}`;
}

function printValidationErrors(
  recipeName: string,
  errors: ValidationError[],
): void {
  console.error(`\n❌ Recipe '${recipeName}' - ${errors.length} error(s):\n`);

  const sortedErrors = errors.sort((a, b) => {
    if (a.lineNumber && b.lineNumber) return a.lineNumber - b.lineNumber;
    if (a.lineNumber) return -1;
    if (b.lineNumber) return 1;
    return 0;
  });

  sortedErrors.forEach((err) => {
    console.error(formatValidationError(err));
  });

  console.error('');
}

export function validateStepDescriptions(recipe: Recipe): ValidationResult {
  console.log(`- 📝 Checking step descriptions…`);

  const errors: ValidationError[] = [];

  for (let i = 0; i < recipe.steps.length; i++) {
    const step = recipe.steps[i];
    const stepNum = step.step;

    if (step.description === null) {
      errors.push({
        validator: 'validateStepDescriptions',
        message: `Step ${stepNum} (${step.name}) has null description. Please provide a description for this step.`,
        location: `steps[${i}].description`,
      });
    }

    if (step.description === '') {
      errors.push({
        validator: 'validateStepDescriptions',
        message: `Step ${stepNum} (${step.name}) has empty description. Please provide a description for this step.`,
        location: `steps[${i}].description`,
      });
    }
  }

  return {valid: errors.length === 0, errors};
}

export function validateStepNames(recipe: Recipe): ValidationResult {
  console.log(`- 🔢 Checking step names…`);

  const errors: ValidationError[] = [];
  const stepsByNumber = new Map<string, Set<string>>();

  for (let i = 0; i < recipe.steps.length; i++) {
    const step = recipe.steps[i];
    const stepNum = step.step;
    let names = stepsByNumber.get(stepNum);

    if (!names) {
      names = new Set();
      stepsByNumber.set(stepNum, names);
    }

    if (names.has(step.name)) {
      errors.push({
        validator: 'validateStepNames',
        message: `Step ${stepNum} has duplicate name "${step.name}". Grouped steps must have distinct names.`,
        location: `steps[${i}].name`,
      });
    }

    names.add(step.name);
  }

  return {valid: errors.length === 0, errors};
}

export function validatePatchFiles(
  recipeName: string,
  recipe: Recipe,
): ValidationResult {
  console.log(`- 🩹 Checking patch files…`);

  const errors: ValidationError[] = [];
  const recipeDir = path.join(COOKBOOK_PATH, 'recipes', recipeName);
  const patchesDir = path.join(recipeDir, 'patches');
  const referencedPatches = new Set<string>();

  for (let i = 0; i < recipe.steps.length; i++) {
    const diffs = recipe.steps[i].diffs;
    if (!diffs) continue;

    for (let j = 0; j < diffs.length; j++) {
      const diff = diffs[j];
      referencedPatches.add(diff.patchFile);

      const patchPath = path.join(patchesDir, diff.patchFile);
      if (!fs.existsSync(patchPath)) {
        errors.push({
          validator: 'validatePatchFiles',
          message: `Patch file not found: ${diff.patchFile}`,
          location: `steps[${i}].diffs[${j}].patchFile`,
        });
      }
    }
  }

  if (fs.existsSync(patchesDir)) {
    const fsPatchEntries = fs.readdirSync(patchesDir, {withFileTypes: true});
    for (let i = 0; i < fsPatchEntries.length; i++) {
      const entry = fsPatchEntries[i];
      if (!entry.isFile()) continue;

      if (!referencedPatches.has(entry.name)) {
        errors.push({
          validator: 'validatePatchFiles',
          message: `Orphaned patch file not referenced in recipe: ${entry.name}`,
          location: `patches/${entry.name}`,
        });
      }
    }
  }

  return {valid: errors.length === 0, errors};
}

export function validateIngredientFiles(
  recipeName: string,
  recipe: Recipe,
): ValidationResult {
  console.log(`- 🍱 Checking ingredient files…`);

  const errors: ValidationError[] = [];
  const recipeDir = path.join(COOKBOOK_PATH, 'recipes', recipeName);
  const ingredientsDir = path.join(recipeDir, 'ingredients');
  const referencedIngredients = new Set<string>();

  for (let i = 0; i < recipe.ingredients.length; i++) {
    const ingredient = recipe.ingredients[i];
    const ingredientPath = path.join(ingredientsDir, ingredient.path);

    if (!fs.existsSync(ingredientPath)) {
      errors.push({
        validator: 'validateIngredientFiles',
        message: `Ingredient file not found: ${ingredient.path}`,
        location: `ingredients[${i}].path`,
      });
    }

    referencedIngredients.add(ingredient.path);
  }

  if (fs.existsSync(ingredientsDir)) {
    const fsIngredientEntries = fs.readdirSync(ingredientsDir, {
      recursive: true,
      withFileTypes: true,
    });

    for (let i = 0; i < fsIngredientEntries.length; i++) {
      const entry = fsIngredientEntries[i];
      if (!entry.isFile()) continue;

      const relativePath = path
        .join(entry.path, entry.name)
        .replace(ingredientsDir + path.sep, '')
        .replace(/\\/g, '/');

      if (!referencedIngredients.has(relativePath)) {
        errors.push({
          validator: 'validateIngredientFiles',
          message: `Orphaned ingredient file not referenced in recipe: ${relativePath}`,
          location: `ingredients/${relativePath}`,
        });
      }
    }
  }

  return {valid: errors.length === 0, errors};
}

export function validateReadmeExists(recipeName: string): ValidationResult {
  console.log(`- 📖 Checking README.md exists…`);

  const errors: ValidationError[] = [];
  const recipeDir = path.join(COOKBOOK_PATH, 'recipes', recipeName);
  const readmePath = path.join(recipeDir, RENDER_FILENAME_GITHUB);

  if (!fs.existsSync(readmePath)) {
    errors.push({
      validator: 'validateReadmeExists',
      message: `README.md not found. Run: npm run cookbook render ${recipeName}`,
      location: RENDER_FILENAME_GITHUB,
    });
  }

  return {valid: errors.length === 0, errors};
}

export function validateLlmPromptExists(recipeName: string): ValidationResult {
  console.log(`- 🤖 Checking LLM prompt exists…`);

  const errors: ValidationError[] = [];
  const promptPath = path.join(LLMS_PATH, `${recipeName}.prompt.md`);

  if (!fs.existsSync(promptPath)) {
    errors.push({
      validator: 'validateLlmPromptExists',
      message: `LLM prompt file not found at llms/${recipeName}.prompt.md. Run: npm run cookbook render ${recipeName}`,
      location: `llms/${recipeName}.prompt.md`,
    });
  }

  return {valid: errors.length === 0, errors};
}

export function validateRecipe(params: {
  recipeTitle: string;
  hydrogenPackagesVersion?: string;
}): boolean {
  const start = Date.now();

  const {recipeTitle, hydrogenPackagesVersion} = params;
  const recipeDir = path.join(COOKBOOK_PATH, 'recipes', recipeTitle);
  const recipeYamlPath = path.join(recipeDir, 'recipe.yaml');
  const allErrors: ValidationError[] = [];

  try {
    let recipe: Recipe | null = null;
    try {
      recipe = loadRecipe({directory: recipeDir});
    } catch (error) {
      if (error instanceof ZodError) {
        error.issues.forEach((issue) => {
          const lineNumber = getYamlLineNumber(recipeYamlPath, issue.path);
          const actualValue = getYamlValue(recipeYamlPath, issue.path);

          let message = issue.message;
          if (actualValue !== null) {
            message = `${issue.message} (actual value: ${actualValue})`;
          }

          allErrors.push({
            validator: 'RecipeSchema',
            message,
            location: issue.path.join('.'),
            lineNumber: lineNumber ?? undefined,
          });
        });
      } else {
        throw error;
      }
    }

    const preFlightResults = [
      ...(recipe ? [
        validateStepNames(recipe),
        validateStepDescriptions(recipe),
        validatePatchFiles(recipeTitle, recipe),
        validateIngredientFiles(recipeTitle, recipe),
      ] : []),
      validateReadmeExists(recipeTitle),
      validateLlmPromptExists(recipeTitle),
    ];

    allErrors.push(...preFlightResults.flatMap((r) => r.errors));

  if (allErrors.length > 0) {
    const errorsWithLines = allErrors.map((err) => {
      if (err.lineNumber) return err;
      if (!err.location) return err;

      const pathSegments = err.location
        .replace(/\[/g, '.')
        .replace(/\]/g, '')
        .split('.')
        .filter(Boolean);

      const lineNumber = getYamlLineNumber(recipeYamlPath, pathSegments);
      return {...err, lineNumber: lineNumber ?? undefined};
    });

    printValidationErrors(recipeTitle, errorsWithLines);
    return false;
  }

  console.log(`- 🧑‍🍳 Applying recipe '${recipeTitle}'`);
    applyRecipe({
      recipeTitle,
    });

    try {
      const conflictFiles = execSync(`find ${TEMPLATE_PATH} -name "*.orig" -o -name "*.rej"`, {
        encoding: 'utf-8',
        stdio: 'pipe'
      }).trim().split('\n').filter(Boolean);

      if (conflictFiles.length > 0) {
        console.error(`\n❌ Conflict files detected in template directory:`);
        conflictFiles.forEach(file => {
          console.error(`   - ${file}`);
        });
        console.error(`\nThese files will cause TypeScript errors during validation.`);
        console.error(`Please resolve patch conflicts before running validation.`);
        return false;
      }
    } catch (e) {
      // Ignore errors from find command (e.g., if template directory doesn't exist).
      // This is an optional safety check; subsequent validation commands (typecheck, build) will catch any real issues.
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
        if (process.env.VERBOSE) {
          console.log(result.toString());
        }
      } catch (error: any) {
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
    console.log(`\n✅ Recipe '${recipeTitle}' is valid (${duration}ms)`);

    return true;
  } catch (error) {
    if (!(error instanceof ZodError)) {
      console.error(error);
    }
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
