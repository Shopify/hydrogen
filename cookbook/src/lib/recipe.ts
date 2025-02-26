export type Ingredient = {
  // The name of the ingredient
  path: string;
  // The description of the ingredient
  description?: string | null;
};

function isIngredient(value: unknown): value is Ingredient {
  const maybe = value as Ingredient;
  return (
    value != null &&
    typeof value === 'object' &&
    (maybe.description == null || typeof maybe.description === 'string') &&
    maybe.path != null &&
    typeof maybe.path === 'string'
  );
}

export type StepType = 'PATCH' | 'INFO' | 'COPY_INGREDIENTS';

function isStepType(value: unknown): value is StepType {
  const maybe = value as StepType;
  switch (maybe) {
    case 'INFO':
    case 'PATCH':
    case 'COPY_INGREDIENTS':
      return true;
    default:
      const exhaustiveCheck: never = maybe;
      return false;
  }
}

export type Step = {
  // The type of the step
  type: StepType;
  // The name of the step
  name: string;
  // The description of the step
  description?: string | null;
  // The notes of the step
  notes?: string[] | null;
  // The ingredients of the step
  ingredients?: string[] | null;
  // The patch of the step
  diffs?: Diff[] | null;
  // Substeps of the step
  substeps?: Substep[] | null;
};

export type Substep = {
  name: string;
  description: string;
};

function isSubstep(value: unknown): value is Substep {
  const maybe = value as Substep;
  return (
    value != null &&
    typeof value === 'object' &&
    maybe.name != null &&
    typeof maybe.name === 'string'
  );
}

export type Diff = {
  file: string;
  patchFile: string;
};

function isDiff(value: unknown): value is Diff {
  const maybe = value as Diff;
  return (
    value != null &&
    typeof value === 'object' &&
    maybe.file != null &&
    typeof maybe.file === 'string' &&
    maybe.patchFile != null &&
    typeof maybe.patchFile === 'string'
  );
}

function isStep(value: unknown): value is Step {
  const maybe = value as Step;
  return (
    value != null &&
    typeof value === 'object' &&
    // type
    isStepType(maybe.type) &&
    // name
    maybe.name != null &&
    typeof maybe.name === 'string' &&
    // description
    (maybe.description == null || typeof maybe.description === 'string') &&
    // notes
    (maybe.notes == null ||
      (Array.isArray(maybe.notes) &&
        maybe.notes.every((note) => typeof note === 'string'))) &&
    // ingredients
    (maybe.ingredients == null ||
      (Array.isArray(maybe.ingredients) &&
        maybe.ingredients.every(
          (ingredient) => typeof ingredient === 'string',
        ))) &&
    // diffs
    (maybe.diffs == null ||
      (Array.isArray(maybe.diffs) &&
        maybe.diffs.every((diff) => isDiff(diff)))) &&
    // substeps
    (maybe.substeps == null ||
      (Array.isArray(maybe.substeps) &&
        maybe.substeps.every((substep) => isSubstep(substep))))
  );
}

export type Recipe = {
  // The title of the recipe
  title: string;
  // The description of the recipe
  description: string;
  // The notes of the recipe
  notes?: string[] | null;
  // The image of the recipe
  image?: string | null;
  // The ingredients of the recipe, the files needed to complete the recipe
  ingredients: Ingredient[];
  // The steps of the recipe, the instructions to complete the recipe
  steps: Step[];
  // Deleted files of the recipe
  deletedFiles?: string[] | null;
  // The commit hash of the recipe
  commit: string;
};

function isRecipe(value: unknown): value is Recipe {
  const maybe = value as Recipe;
  return (
    value != null &&
    typeof value === 'object' &&
    // title
    maybe.title != null &&
    typeof maybe.title === 'string' &&
    // description
    maybe.description != null &&
    typeof maybe.description === 'string' &&
    // notes
    (maybe.notes == null ||
      (Array.isArray(maybe.notes) &&
        maybe.notes.every((note) => typeof note === 'string'))) &&
    // image
    (maybe.image == null || typeof maybe.image === 'string') &&
    // ingredients
    maybe.ingredients != null &&
    Array.isArray(maybe.ingredients) &&
    maybe.ingredients.every((ingredient) => isIngredient(ingredient)) &&
    // steps
    maybe.steps != null &&
    Array.isArray(maybe.steps) &&
    maybe.steps.every((step) => isStep(step)) &&
    // deletedFiles
    (maybe.deletedFiles == null ||
      (Array.isArray(maybe.deletedFiles) &&
        maybe.deletedFiles.every((file) => typeof file === 'string'))) &&
    // commit
    maybe.commit != null &&
    typeof maybe.commit === 'string'
  );
}

export function parseRecipeFromString(string: string): Recipe {
  const parsed = JSON.parse(string) as Recipe;

  if (!isRecipe(parsed)) {
    throw new Error('Invalid recipe');
  }

  return parsed;
}
