import {describe, expect, it, vi, beforeEach, afterEach} from 'vitest';
import {Recipe} from './recipe';
import {
  validateStepNames,
  validateStepDescriptions,
  validatePatchFiles,
  validateIngredientFiles,
} from './validate';
import fs from 'fs';
import path from 'path';
import {COOKBOOK_PATH} from './constants';

vi.mock('fs');

describe('validateStepNames', () => {
  it('should throw when grouped steps have identical names', () => {
    const recipe = {
      gid: 'test-gid',
      title: 'Test',
      summary: 'Test',
      description: 'Test',
      ingredients: [],
      steps: [
        {type: 'PATCH' as const, step: 1, name: 'Update config', diffs: []},
        {type: 'PATCH' as const, step: 1, name: 'Update config', diffs: []},
      ],
      commit: 'abc123',
    } as Recipe;

    expect(() => validateStepNames(recipe)).toThrow(
      'Step 1 has duplicate name "Update config"',
    );
  });

  it('should pass for valid sequential steps', () => {
    const recipe = {
      gid: 'test-gid',
      title: 'Test',
      summary: 'Test',
      description: 'Test',
      ingredients: [],
      steps: [
        {type: 'PATCH' as const, step: 1, name: 'Step 1', diffs: []},
        {type: 'PATCH' as const, step: 2, name: 'Step 2', diffs: []},
      ],
      commit: 'abc123',
    } as Recipe;

    expect(() => validateStepNames(recipe)).not.toThrow();
  });

  it('should pass for substeps', () => {
    const recipe = {
      gid: 'test-gid',
      title: 'Test',
      summary: 'Test',
      description: 'Test',
      ingredients: [],
      steps: [
        {type: 'PATCH' as const, step: 1, name: 'Step 1', diffs: []},
        {type: 'PATCH' as const, step: 1.1, name: 'Step 1.1', diffs: []},
        {type: 'PATCH' as const, step: 1.2, name: 'Step 1.2', diffs: []},
      ],
      commit: 'abc123',
    } as Recipe;

    expect(() => validateStepNames(recipe)).not.toThrow();
  });

  it('should pass when multiple steps share same number but have distinct names', () => {
    const recipe = {
      gid: 'test-gid',
      title: 'Test',
      summary: 'Test',
      description: 'Test',
      ingredients: [],
      steps: [
        {type: 'PATCH' as const, step: 1, name: 'README.md', diffs: []},
        {type: 'PATCH' as const, step: 1, name: 'app/entry.server.tsx', diffs: []},
        {type: 'NEW_FILE' as const, step: 1, name: 'app/components/GoogleTagManager.tsx', ingredients: []},
        {type: 'PATCH' as const, step: 2, name: 'app/root.tsx', diffs: []},
      ],
      commit: 'abc123',
    } as Recipe;

    expect(() => validateStepNames(recipe)).not.toThrow();
  });
});

describe('validateStepDescriptions', () => {
  it('should throw when step description is null', () => {
    const recipe = {
      gid: 'test-gid',
      title: 'Test',
      summary: 'Test',
      description: 'Test',
      ingredients: [],
      steps: [
        {type: 'PATCH' as const, step: 1, name: 'Step 1', description: null, diffs: []},
      ],
      commit: 'abc123',
    } as Recipe;

    expect(() => validateStepDescriptions(recipe)).toThrow(
      'Step 1 (Step 1) has null description',
    );
  });

  it('should throw when step description is empty string', () => {
    const recipe = {
      gid: 'test-gid',
      title: 'Test',
      summary: 'Test',
      description: 'Test',
      ingredients: [],
      steps: [
        {type: 'PATCH' as const, step: 1, name: 'Step 1', description: '', diffs: []},
      ],
      commit: 'abc123',
    } as Recipe;

    expect(() => validateStepDescriptions(recipe)).toThrow(
      'Step 1 (Step 1) has empty description',
    );
  });
});

describe('validatePatchFiles', () => {
  const mockExistsSync = vi.mocked(fs.existsSync);
  const mockReaddirSync = vi.mocked(fs.readdirSync);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should throw when patch file referenced in yaml does not exist', () => {
    const recipe = {
      gid: '550e8400-e29b-41d4-a716-446655440000',
      title: 'Test',
      summary: 'Test',
      description: 'Test',
      ingredients: [],
      steps: [
        {
          type: 'PATCH' as const,
          step: 1,
          name: 'Update config',
          description: 'Updates configuration',
          diffs: [{file: 'app/root.tsx', patchFile: 'root.tsx.abc123.patch'}],
        },
      ],
      commit: 'abc123',
    } as Recipe;

    mockExistsSync.mockImplementation((filePath: fs.PathLike) => {
      const pathStr = filePath.toString();
      if (pathStr.includes('patches')) return false;
      return true;
    });

    expect(() => validatePatchFiles('test-recipe', recipe)).toThrow(
      'Patch file not found: root.tsx.abc123.patch',
    );
  });

  it('should throw when patch file exists on filesystem but not referenced in yaml', () => {
    const recipe = {
      gid: '550e8400-e29b-41d4-a716-446655440000',
      title: 'Test',
      summary: 'Test',
      description: 'Test',
      ingredients: [],
      steps: [],
      commit: 'abc123',
    } as Recipe;

    mockExistsSync.mockReturnValue(true);
    mockReaddirSync.mockReturnValue([
      {name: 'orphaned.patch', isFile: () => true} as fs.Dirent,
    ] as fs.Dirent[]);

    expect(() => validatePatchFiles('test-recipe', recipe)).toThrow(
      'Orphaned patch file not referenced in recipe: orphaned.patch',
    );
  });

  it('should pass when all patch files are valid', () => {
    const recipe = {
      gid: '550e8400-e29b-41d4-a716-446655440000',
      title: 'Test',
      summary: 'Test',
      description: 'Test',
      ingredients: [],
      steps: [
        {
          type: 'PATCH' as const,
          step: 1,
          name: 'Update config',
          description: 'Updates configuration',
          diffs: [{file: 'app/root.tsx', patchFile: 'root.tsx.abc123.patch'}],
        },
      ],
      commit: 'abc123',
    } as Recipe;

    mockExistsSync.mockReturnValue(true);
    mockReaddirSync.mockReturnValue([
      {name: 'root.tsx.abc123.patch', isFile: () => true} as fs.Dirent,
    ] as fs.Dirent[]);

    expect(() => validatePatchFiles('test-recipe', recipe)).not.toThrow();
  });
});

describe('validateIngredientFiles', () => {
  const mockExistsSync = vi.mocked(fs.existsSync);
  const mockReaddirSync = vi.mocked(fs.readdirSync);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should throw when ingredient file referenced in yaml does not exist', () => {
    const recipe = {
      gid: '550e8400-e29b-41d4-a716-446655440000',
      title: 'Test',
      summary: 'Test',
      description: 'Test',
      ingredients: [{path: 'templates/skeleton/app/components/Foo.tsx', description: null}],
      steps: [],
      commit: 'abc123',
    } as Recipe;

    mockExistsSync.mockImplementation((filePath: fs.PathLike) => {
      const pathStr = filePath.toString();
      if (pathStr.includes('ingredients')) return false;
      return true;
    });

    expect(() => validateIngredientFiles('test-recipe', recipe)).toThrow(
      'Ingredient file not found: templates/skeleton/app/components/Foo.tsx',
    );
  });

  it('should throw when ingredient file exists on filesystem but not referenced in yaml', () => {
    const recipe = {
      gid: '550e8400-e29b-41d4-a716-446655440000',
      title: 'Test',
      summary: 'Test',
      description: 'Test',
      ingredients: [],
      steps: [],
      commit: 'abc123',
    } as Recipe;

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

    expect(() => validateIngredientFiles('test-recipe', recipe)).toThrow(
      'Orphaned ingredient file not referenced in recipe: orphaned.tsx',
    );
  });

  it('should pass when all ingredient files are valid', () => {
    const recipe = {
      gid: '550e8400-e29b-41d4-a716-446655440000',
      title: 'Test',
      summary: 'Test',
      description: 'Test',
      ingredients: [{path: 'templates/skeleton/app/components/Foo.tsx', description: null}],
      steps: [],
      commit: 'abc123',
    } as Recipe;

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

    expect(() => validateIngredientFiles('test-recipe', recipe)).not.toThrow();
  });
});
