import {z} from 'zod';
import path from 'path';
import fs from 'fs';
import YAML from 'yaml';

const IngredientSchema = z.object({
  path: z.string().describe('The path of the ingredient'),
  description: z
    .string()
    .nullable()
    .optional()
    .describe('The description of the ingredient'),
});

export type Ingredient = z.infer<typeof IngredientSchema>;

const DiffSchema = z.object({
  file: z.string().describe('The file of the diff'),
  patchFile: z.string().describe('The patch file of the diff'),
});

export type Diff = z.infer<typeof DiffSchema>;

const StepSchema = z.object({
  type: z
    .enum(['PATCH', 'INFO', 'COPY_INGREDIENTS'])
    .describe('The type of step'),
  name: z.string().describe('The name of the step'),
  description: z
    .string()
    .nullable()
    .optional()
    .describe('The description of the step'),
  notes: z.array(z.string()).optional().describe('The notes of the step'),
  ingredients: z
    .array(z.string())
    .optional()
    .describe('The ingredients of the step'),
  diffs: z.array(DiffSchema).optional().describe('The diffs of the step'),
});

export type Step = z.infer<typeof StepSchema>;

export const TroubleshootingSchema = z.object({
  issue: z.string().describe('The issue of the troubleshooting'),
  solution: z.string().describe('The solution of the troubleshooting'),
});

export type Troubleshooting = z.infer<typeof TroubleshootingSchema>;

export const RecipeSchema = z.object({
  title: z.string().describe('The title of the recipe'),
  description: z.string().describe('The description of the recipe'),
  notes: z.array(z.string()).optional().describe('The notes of the recipe'),
  image: z.string().nullable().optional().describe('The image of the recipe'),
  ingredients: z
    .array(IngredientSchema)
    .describe('The ingredients of the recipe'),
  steps: z.array(StepSchema).describe('The steps of the recipe'),
  deletedFiles: z
    .array(z.string())
    .optional()
    .describe('The deleted files of the recipe'),
  commit: z.string().describe('The commit hash the recipe is based on'),
  llms: z
    .object({
      userQueries: z
        .array(z.string())
        .optional()
        .describe('The user queries of the recipe')
        .default([]),
      troubleshooting: z
        .array(TroubleshootingSchema)
        .optional()
        .describe('The troubleshooting of the recipe')
        .default([]),
    })
    .optional()
    .default({}),
});

export type Recipe = z.infer<typeof RecipeSchema>;
export type RecipeWithoutLLMs = Omit<Recipe, 'llms'>;

/**
 * Parses a recipe from a JSON string
 * @param data The JSON string to parse
 * @returns The parsed Recipe object
 */
export function loadRecipe(params: {directory: string}): Recipe {
  if (fs.existsSync(path.join(params.directory, 'recipe.yaml'))) {
    return RecipeSchema.parse(
      YAML.parse(
        fs.readFileSync(path.join(params.directory, 'recipe.yaml'), 'utf8'),
      ),
    );
  } else if (fs.existsSync(path.join(params.directory, 'recipe.json'))) {
    return RecipeSchema.parse(
      JSON.parse(
        fs.readFileSync(path.join(params.directory, 'recipe.json'), 'utf8'),
      ),
    );
  } else {
    throw new Error(
      `recipe.yaml or recipe.json not found in ${params.directory}`,
    );
  }
}
