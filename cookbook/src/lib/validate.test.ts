import {describe, expect, it, vi, beforeEach, afterEach, Mock} from 'vitest';
import {Recipe} from './recipe';
import {
  validateStepNames,
  validateStepDescriptions,
  validatePatchFiles,
  validateIngredientFiles,
  validateReadmeExists,
  validateLlmPromptExists,
  getYamlLineNumber,
  validateRecipe,
  formatValidationError,
} from './validate';
import fs from 'fs';
import path from 'path';
import {COOKBOOK_PATH} from './constants';
import * as recipeModule from './recipe';

vi.mock('./apply', () => ({
  applyRecipe: vi.fn(),
}));

vi.mock('child_process', () => ({
  execSync: vi.fn(() => Buffer.from('/Users/juanp.prieto/github.com/Shopify/hydrogen')),
}));

describe('formatValidationError', () => {
  it('should format error with line number and location', () => {
    const error = {
      validator: 'RecipeSchema',
      message: 'Expected string, received number',
      location: 'steps.0.step',
      lineNumber: 52,
    };

    const formatted = formatValidationError(error);

    expect(formatted).toContain('recipe.yaml:52');
    expect(formatted).toContain('steps.0.step');
    expect(formatted).toContain('RecipeSchema: Expected string, received number');
  });

  it('should format error without line number', () => {
    const error = {
      validator: 'validateReadmeExists',
      message: 'README.md not found',
      location: 'README.md',
    };

    const formatted = formatValidationError(error);

    expect(formatted).not.toContain('recipe.yaml');
    expect(formatted).toContain('README.md');
    expect(formatted).toContain('validateReadmeExists: README.md not found');
  });

  it('should format error without location', () => {
    const error = {
      validator: 'validateLlmPromptExists',
      message: 'LLM prompt file not found',
    };

    const formatted = formatValidationError(error);

    expect(formatted).toContain('validateLlmPromptExists: LLM prompt file not found');
  });
});

describe('getYamlLineNumber', () => {
  const mockYamlContent = `# yaml-language-server: $schema=../../recipe.schema.json

gid: test-gid
title: Test Recipe
summary: Test
description: Test
ingredients: []
steps:
  - step: "1"
    type: PATCH
    name: README.md
    description: Test
    diffs: []
  - step: "2"
    type: PATCH
    name: app/root.tsx
    description: Test
    diffs: []
commit: abc123
`;

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return line number for simple field', () => {
    const yamlPath = path.join(COOKBOOK_PATH, 'recipes', 'test', 'recipe.yaml');

    vi.spyOn(fs, 'readFileSync').mockReturnValue(mockYamlContent);

    const lineNum = getYamlLineNumber(yamlPath, ['title']);

    expect(lineNum).toBeGreaterThan(0);
    expect(lineNum).toBeLessThan(10);
  });

  it('should return line number for nested array element', () => {
    const yamlPath = path.join(COOKBOOK_PATH, 'recipes', 'test', 'recipe.yaml');

    vi.spyOn(fs, 'readFileSync').mockReturnValue(mockYamlContent);

    const lineNum = getYamlLineNumber(yamlPath, ['steps', 0, 'step']);

    expect(lineNum).toBeGreaterThan(8);
  });

  it('should return null for invalid path', () => {
    const yamlPath = path.join(COOKBOOK_PATH, 'recipes', 'test', 'recipe.yaml');

    vi.spyOn(fs, 'readFileSync').mockReturnValue(mockYamlContent);

    const lineNum = getYamlLineNumber(yamlPath, ['nonexistent', 'path']);

    expect(lineNum).toBeNull();
  });

  it('should return null for nonexistent file', () => {
    vi.spyOn(fs, 'readFileSync').mockImplementation(() => {
      throw new Error('File not found');
    });

    const lineNum = getYamlLineNumber('/nonexistent/file.yaml', ['title']);

    expect(lineNum).toBeNull();
  });
});

describe('validateStepNames', () => {
  it('should return error when steps have duplicate numbers', () => {
    const recipe: Recipe = {
      gid: 'test-gid',
      title: 'Test',
      summary: 'Test',
      description: 'Test',
      ingredients: [],
      steps: [
        {type: 'PATCH' as const, step: '1', name: 'README.md', diffs: []},
        {type: 'PATCH' as const, step: '1', name: 'app/root.tsx', diffs: []},
      ],
      commit: 'abc123',
      llms: {userQueries: [], troubleshooting: []},
    };

    const result = validateStepNames(recipe);

    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toMatchObject({
      validator: 'validateStepNames',
      message: 'Duplicate step number "1". Use substeps (e.g., "1.1", "1.2") to organize related changes under step 1.',
      location: 'steps[1].step',
    });
  });

  it('should return valid for sequential steps', () => {
    const recipe: Recipe = {
      gid: 'test-gid',
      title: 'Test',
      summary: 'Test',
      description: 'Test',
      ingredients: [],
      steps: [
        {type: 'PATCH' as const, step: '1', name: 'README.md', diffs: []},
        {type: 'PATCH' as const, step: '2', name: 'app/root.tsx', diffs: []},
      ],
      commit: 'abc123',
      llms: {userQueries: [], troubleshooting: []},
    };

    const result = validateStepNames(recipe);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should return valid for substeps', () => {
    const recipe: Recipe = {
      gid: 'test-gid',
      title: 'Test',
      summary: 'Test',
      description: 'Test',
      ingredients: [],
      steps: [
        {type: 'PATCH' as const, step: '1', name: 'README.md', diffs: []},
        {type: 'PATCH' as const, step: '1.1', name: 'app/entry.server.tsx', diffs: []},
        {type: 'PATCH' as const, step: '1.2', name: 'app/root.tsx', diffs: []},
      ],
      commit: 'abc123',
      llms: {userQueries: [], troubleshooting: []},
    };

    const result = validateStepNames(recipe);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should reject duplicate main step numbers even with different names', () => {
    const recipe: Recipe = {
      gid: 'test-gid',
      title: 'Test',
      summary: 'Test',
      description: 'Test',
      ingredients: [],
      steps: [
        {type: 'PATCH' as const, step: '1', name: 'README.md', diffs: []},
        {type: 'PATCH' as const, step: '1', name: 'app/root.tsx', diffs: []},
      ],
      commit: 'abc123',
      llms: {userQueries: [], troubleshooting: []},
    };

    const result = validateStepNames(recipe);

    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toMatchObject({
      validator: 'validateStepNames',
      message: 'Duplicate step number "1". Use substeps (e.g., "1.1", "1.2") to organize related changes under step 1.',
      location: 'steps[1].step',
    });
  });

  it('should reject duplicate substep numbers', () => {
    const recipe: Recipe = {
      gid: 'test-gid',
      title: 'Test',
      summary: 'Test',
      description: 'Test',
      ingredients: [],
      steps: [
        {type: 'PATCH' as const, step: '1.1', name: 'FileA.tsx', diffs: []},
        {type: 'PATCH' as const, step: '1.1', name: 'FileB.tsx', diffs: []},
      ],
      commit: 'abc123',
      llms: {userQueries: [], troubleshooting: []},
    };

    const result = validateStepNames(recipe);

    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toMatchObject({
      validator: 'validateStepNames',
      message: 'Duplicate step number "1.1". Each step must have a unique step number.',
      location: 'steps[1].step',
    });
  });

  it('should allow proper substep hierarchy', () => {
    const recipe: Recipe = {
      gid: 'test-gid',
      title: 'Test',
      summary: 'Test',
      description: 'Test',
      ingredients: [],
      steps: [
        {type: 'INFO' as const, step: '1', name: 'Setup configuration'},
        {type: 'PATCH' as const, step: '1.1', name: 'README.md', diffs: []},
        {type: 'PATCH' as const, step: '1.2', name: 'app/root.tsx', diffs: []},
        {type: 'PATCH' as const, step: '2', name: 'package.json', diffs: []},
      ],
      commit: 'abc123',
      llms: {userQueries: [], troubleshooting: []},
    };

    const result = validateStepNames(recipe);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should reject "1.0" as duplicate of "1"', () => {
    const recipe: Recipe = {
      gid: 'test-gid',
      title: 'Test',
      summary: 'Test',
      description: 'Test',
      ingredients: [],
      steps: [
        {type: 'PATCH' as const, step: '1', name: 'FileA', diffs: []},
        {type: 'PATCH' as const, step: '1.0', name: 'FileB', diffs: []},
      ],
      commit: 'abc123',
      llms: {userQueries: [], troubleshooting: []},
    };

    const result = validateStepNames(recipe);

    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].message).toContain('Duplicate step number');
  });

  it('should reject leading zero duplicates', () => {
    const recipe: Recipe = {
      gid: 'test-gid',
      title: 'Test',
      summary: 'Test',
      description: 'Test',
      ingredients: [],
      steps: [
        {type: 'PATCH' as const, step: '1', name: 'FileA', diffs: []},
        {type: 'PATCH' as const, step: '01', name: 'FileB', diffs: []},
      ],
      commit: 'abc123',
      llms: {userQueries: [], troubleshooting: []},
    };

    const result = validateStepNames(recipe);

    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].message).toContain('Duplicate step number');
  });
});

describe('validateStepDescriptions', () => {
  it('should return error when step description is null', () => {
    const recipe: Recipe = {
      gid: 'test-gid',
      title: 'Test',
      summary: 'Test',
      description: 'Test',
      ingredients: [],
      steps: [
        {type: 'PATCH' as const, step: '1', name: 'README.md', description: null, diffs: []},
      ],
      commit: 'abc123',
      llms: {userQueries: [], troubleshooting: []},
    };

    const result = validateStepDescriptions(recipe);

    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toMatchObject({
      validator: 'validateStepDescriptions',
      message: 'Step 1 (README.md) has null description. Please provide a description for this step.',
      location: 'steps[0].description',
    });
  });

  it('should return error when step description is empty string', () => {
    const recipe: Recipe = {
      gid: 'test-gid',
      title: 'Test',
      summary: 'Test',
      description: 'Test',
      ingredients: [],
      steps: [
        {type: 'PATCH' as const, step: '1', name: 'app/root.tsx', description: '', diffs: []},
      ],
      commit: 'abc123',
      llms: {userQueries: [], troubleshooting: []},
    };

    const result = validateStepDescriptions(recipe);

    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toMatchObject({
      validator: 'validateStepDescriptions',
      message: 'Step 1 (app/root.tsx) has empty description. Please provide a description for this step.',
      location: 'steps[0].description',
    });
  });

  it('should return valid result when all descriptions are present', () => {
    const recipe: Recipe = {
      gid: 'test-gid',
      title: 'Test',
      summary: 'Test',
      description: 'Test',
      ingredients: [],
      steps: [
        {type: 'PATCH' as const, step: '1', name: 'README.md', description: 'Valid description', diffs: []},
      ],
      commit: 'abc123',
      llms: {userQueries: [], troubleshooting: []},
    };

    const result = validateStepDescriptions(recipe);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});

describe('validatePatchFiles', () => {
  let mockExistsSync: Mock;
  let mockReaddirSync: Mock;

  beforeEach(() => {
    mockExistsSync = vi.spyOn(fs, 'existsSync').mockReturnValue(true) as Mock;
    mockReaddirSync = vi.spyOn(fs, 'readdirSync').mockReturnValue([]) as Mock;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return error when patch file referenced in yaml does not exist', () => {
    const recipe: Recipe = {
      gid: '550e8400-e29b-41d4-a716-446655440000',
      title: 'Test',
      summary: 'Test',
      description: 'Test',
      ingredients: [],
      steps: [
        {
          type: 'PATCH' as const,
          step: '1',
          name: 'app/root.tsx',
          description: 'Updates configuration',
          diffs: [{file: 'app/root.tsx', patchFile: 'root.tsx.abc123.patch'}],
        },
      ],
      commit: 'abc123',
      llms: {userQueries: [], troubleshooting: []},
    };

    mockExistsSync.mockImplementation((filePath: fs.PathLike) => {
      const pathStr = filePath.toString();
      if (pathStr.includes('patches')) return false;
      return true;
    });

    const result = validatePatchFiles('test-recipe', recipe);

    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toMatchObject({
      validator: 'validatePatchFiles',
      message: 'Patch file not found: root.tsx.abc123.patch',
    });
  });

  it('should return error when patch file exists on filesystem but not referenced in yaml', () => {
    const recipe: Recipe = {
      gid: '550e8400-e29b-41d4-a716-446655440000',
      title: 'Test',
      summary: 'Test',
      description: 'Test',
      ingredients: [],
      steps: [],
      commit: 'abc123',
      llms: {userQueries: [], troubleshooting: []},
    };

    mockExistsSync.mockReturnValue(true);
    mockReaddirSync.mockReturnValue([
      {name: 'orphaned.patch', isFile: () => true} as fs.Dirent,
    ] as fs.Dirent[]);

    const result = validatePatchFiles('test-recipe', recipe);

    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toMatchObject({
      validator: 'validatePatchFiles',
      message: 'Orphaned patch file not referenced in recipe: orphaned.patch',
    });
  });

  it('should return valid when all patch files are valid', () => {
    const recipe: Recipe = {
      gid: '550e8400-e29b-41d4-a716-446655440000',
      title: 'Test',
      summary: 'Test',
      description: 'Test',
      ingredients: [],
      steps: [
        {
          type: 'PATCH' as const,
          step: '1',
          name: 'app/root.tsx',
          description: 'Updates configuration',
          diffs: [{file: 'app/root.tsx', patchFile: 'root.tsx.abc123.patch'}],
        },
      ],
      commit: 'abc123',
      llms: {userQueries: [], troubleshooting: []},
    };

    mockExistsSync.mockReturnValue(true);
    mockReaddirSync.mockReturnValue([
      {name: 'root.tsx.abc123.patch', isFile: () => true} as fs.Dirent,
    ] as fs.Dirent[]);

    const result = validatePatchFiles('test-recipe', recipe);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});

describe('validateIngredientFiles', () => {
  let mockExistsSync: Mock;
  let mockReaddirSync: Mock;

  beforeEach(() => {
    mockExistsSync = vi.spyOn(fs, 'existsSync').mockReturnValue(true) as Mock;
    mockReaddirSync = vi.spyOn(fs, 'readdirSync').mockReturnValue([]) as Mock;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return error when ingredient file referenced in yaml does not exist', () => {
    const recipe: Recipe = {
      gid: '550e8400-e29b-41d4-a716-446655440000',
      title: 'Test',
      summary: 'Test',
      description: 'Test',
      ingredients: [{path: 'templates/skeleton/app/components/Foo.tsx', description: null}],
      steps: [],
      commit: 'abc123',
      llms: {userQueries: [], troubleshooting: []},
    };

    mockExistsSync.mockImplementation((filePath: fs.PathLike) => {
      const pathStr = filePath.toString();
      if (pathStr.includes('ingredients')) return false;
      return true;
    });

    const result = validateIngredientFiles('test-recipe', recipe);

    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toMatchObject({
      validator: 'validateIngredientFiles',
      message: 'Ingredient file not found: templates/skeleton/app/components/Foo.tsx',
    });
  });

  it('should return error when ingredient file exists on filesystem but not referenced in yaml', () => {
    const recipe: Recipe = {
      gid: '550e8400-e29b-41d4-a716-446655440000',
      title: 'Test',
      summary: 'Test',
      description: 'Test',
      ingredients: [],
      steps: [],
      commit: 'abc123',
      llms: {userQueries: [], troubleshooting: []},
    };

    mockExistsSync.mockReturnValue(true);

    const ingredientsDir = path.join(
      COOKBOOK_PATH,
      'recipes',
      'test-recipe',
      'ingredients',
    );

    mockReaddirSync.mockReturnValue([
      {
        path: ingredientsDir,
        name: 'orphaned.tsx',
        isFile: () => true,
      } as fs.Dirent,
    ] as fs.Dirent[]);

    const result = validateIngredientFiles('test-recipe', recipe);

    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toMatchObject({
      validator: 'validateIngredientFiles',
      message: 'Orphaned ingredient file not referenced in recipe: orphaned.tsx',
    });
  });

  it('should return valid when all ingredient files are valid', () => {
    const recipe: Recipe = {
      gid: '550e8400-e29b-41d4-a716-446655440000',
      title: 'Test',
      summary: 'Test',
      description: 'Test',
      ingredients: [{path: 'templates/skeleton/app/components/Foo.tsx', description: null}],
      steps: [],
      commit: 'abc123',
      llms: {userQueries: [], troubleshooting: []},
    };

    mockExistsSync.mockReturnValue(true);

    const ingredientsDir = path.join(
      COOKBOOK_PATH,
      'recipes',
      'test-recipe',
      'ingredients',
    );

    mockReaddirSync.mockReturnValue([
      {
        path: path.join(ingredientsDir, 'templates', 'skeleton', 'app', 'components'),
        name: 'Foo.tsx',
        isFile: () => true,
      } as fs.Dirent,
    ] as fs.Dirent[]);

    const result = validateIngredientFiles('test-recipe', recipe);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});

describe('validateReadmeExists', () => {
  let mockExistsSync: Mock;

  beforeEach(() => {
    mockExistsSync = vi.spyOn(fs, 'existsSync') as Mock;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return valid for existing recipe with README', () => {
    mockExistsSync.mockReturnValue(true);
    const result = validateReadmeExists('gtm');

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should return error with render command when README missing', () => {
    mockExistsSync.mockReturnValue(false);
    const result = validateReadmeExists('nonexistent-recipe');

    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toMatchObject({
      validator: 'validateReadmeExists',
      message: expect.stringContaining('Run: npm run cookbook render nonexistent-recipe'),
    });
  });
});

describe('validateLlmPromptExists', () => {
  let mockExistsSync: Mock;

  beforeEach(() => {
    mockExistsSync = vi.spyOn(fs, 'existsSync') as Mock;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return valid for existing recipe with LLM prompt', () => {
    mockExistsSync.mockReturnValue(true);
    const result = validateLlmPromptExists('gtm');

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should return error with render command when LLM prompt missing', () => {
    mockExistsSync.mockReturnValue(false);
    const result = validateLlmPromptExists('nonexistent-recipe');

    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toMatchObject({
      validator: 'validateLlmPromptExists',
      message: expect.stringContaining('Run: npm run cookbook render nonexistent-recipe'),
    });
  });
});

describe('validateRecipe integration', () => {
  let consoleErrorSpy: Mock;
  let mockExistsSync: Mock;
  let mockReaddirSync: Mock;
  let mockLoadRecipe: Mock;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {}) as Mock;
    mockExistsSync = vi.spyOn(fs, 'existsSync') as Mock;
    mockReaddirSync = vi.spyOn(fs, 'readdirSync') as Mock;
    mockLoadRecipe = vi.spyOn(recipeModule, 'loadRecipe') as Mock;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should include actual values in Zod validation error messages', () => {
    const recipeName = 'test-recipe';
    const recipeYamlPath = path.join(COOKBOOK_PATH, 'recipes', recipeName, 'recipe.yaml');

    const yamlContent = `
gid: test-gid
title: Test
summary: Test
description: Test
ingredients: []
steps:
  - step: 1
    type: PATCH
    name: README.md
    description: Test
    diffs: []
  - step: 2
    type: PATCH
    name: app/root.tsx
    description: Test
    diffs: []
commit: abc123
`;

    vi.spyOn(fs, 'readFileSync').mockImplementation((filePath: any) => {
      if (filePath === recipeYamlPath) {
        return yamlContent;
      }
      throw new Error(`File not found: ${filePath}`);
    });

    vi.spyOn(fs, 'existsSync').mockReturnValue(true);

    const result = validateRecipe({recipeTitle: recipeName});

    expect(result).toBe(false);

    const errorOutput = consoleErrorSpy.mock.calls.map(call => call[0]).join('\n');

    expect(errorOutput).toContain('Expected string, received number (actual value: 1)');
    expect(errorOutput).toContain('Expected string, received number (actual value: 2)');
  });

  it('should collect and format all validation errors with line numbers', () => {
    const recipeName = 'test-recipe';

    const mockRecipe: Recipe = {
      gid: '550e8400-e29b-41d4-a716-446655440000',
      title: 'Test Recipe',
      summary: 'Test',
      description: 'Test',
      ingredients: [],
      steps: [
        {
          type: 'PATCH' as const,
          step: '1',
          name: 'README.md',
          description: null,
          diffs: [
            {file: 'README.md', patchFile: 'missing.patch'},
            {file: 'app/root.tsx', patchFile: 'root.tsx.5e9998.patch'},
          ],
        },
        {
          type: 'PATCH' as const,
          step: '1',
          name: 'README.md',
          description: 'Duplicate name',
          diffs: [],
        },
      ],
      commit: 'abc123',
      llms: {userQueries: [], troubleshooting: []},
    };

    mockLoadRecipe.mockReturnValue(mockRecipe);

    mockExistsSync.mockImplementation((filePath: fs.PathLike) => {
      const pathStr = filePath.toString();
      if (pathStr.endsWith('README.md')) return false;
      if (pathStr.endsWith('.prompt.md')) return false;
      if (pathStr.includes('patches') && pathStr.endsWith('.patch')) {
        return pathStr.includes('root.tsx');
      }
      return true;
    });

    mockReaddirSync.mockImplementation((dirPath: fs.PathOrFileDescriptor) => {
      const pathStr = dirPath.toString();
      if (pathStr.includes('patches')) {
        return [
          {name: 'root.tsx.5e9998.patch', isFile: () => true},
          {name: 'orphaned.patch', isFile: () => true},
        ] as fs.Dirent[];
      }
      return [] as fs.Dirent[];
    });

    const result = validateRecipe({recipeTitle: recipeName});

    expect(result).toBe(false);

    const errorOutput = consoleErrorSpy.mock.calls.map(call => call[0]).join('\n');

    expect(errorOutput).toContain(`Recipe '${recipeName}'`);
    expect(errorOutput).toContain('error(s)');

    expect(errorOutput).toContain('validateStepNames');
    expect(errorOutput).toContain('Duplicate step number');

    expect(errorOutput).toContain('validateStepDescriptions');
    expect(errorOutput).toContain('null description');

    expect(errorOutput).toContain('validatePatchFiles');
    expect(errorOutput).toContain('Patch file not found');
    expect(errorOutput).toContain('orphaned.patch');

    expect(errorOutput).toContain('validateReadmeExists');
    expect(errorOutput).toContain('README.md not found');

    expect(errorOutput).toContain('validateLlmPromptExists');
    expect(errorOutput).toContain('LLM prompt file not found');
  });
});
