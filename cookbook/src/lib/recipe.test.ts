import {describe, expect, it, vi, beforeEach, afterEach} from 'vitest';
import {loadRecipe} from './recipe';
import fs from 'fs';

vi.mock('fs');

describe('loadRecipe', () => {
  const mockReadFileSync = vi.mocked(fs.readFileSync);
  const mockExistsSync = vi.mocked(fs.existsSync);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should throw Zod error when step is a string', () => {
    const invalidYaml = `
gid: test-gid
title: Test Recipe
summary: Test
description: Test description
ingredients: []
steps:
  - type: PATCH
    step: "1"
    name: Step 1
    diffs:
      - file: test.ts
        patchFile: test.patch
commit: abc123
`;

    mockExistsSync.mockImplementation((filePath: fs.PathLike) => {
      return filePath.toString().endsWith('recipe.yaml');
    });

    mockReadFileSync.mockReturnValue(invalidYaml);

    expect(() => loadRecipe({directory: '/test/path'})).toThrow();
  });

  it('should successfully parse recipe with numeric steps', () => {
    const validYaml = `
gid: 550e8400-e29b-41d4-a716-446655440000
title: Test Recipe
summary: Test summary
description: Test description
ingredients: []
steps:
  - type: PATCH
    step: 1
    name: Step 1
    diffs:
      - file: test.ts
        patchFile: test.patch
commit: abc123def
`;

    mockExistsSync.mockImplementation((filePath: fs.PathLike) => {
      return filePath.toString().endsWith('recipe.yaml');
    });

    mockReadFileSync.mockReturnValue(validYaml);

    const recipe = loadRecipe({directory: '/test/path'});

    expect(recipe.steps[0].step).toBe(1);
    expect(typeof recipe.steps[0].step).toBe('number');
  });

  it('should successfully parse recipe with substeps', () => {
    const validYaml = `
gid: 6ba7b810-9dad-11d1-80b4-00c04fd430c8
title: Test Recipe with Substeps
summary: Test
description: Test description
ingredients: []
steps:
  - type: PATCH
    step: 1
    name: Step 1
    diffs: []
  - type: PATCH
    step: 1.1
    name: Step 1.1
    diffs: []
  - type: PATCH
    step: 1.2
    name: Step 1.2
    diffs: []
commit: abc123def
`;

    mockExistsSync.mockImplementation((filePath: fs.PathLike) => {
      return filePath.toString().endsWith('recipe.yaml');
    });

    mockReadFileSync.mockReturnValue(validYaml);

    const recipe = loadRecipe({directory: '/test/path'});

    expect(recipe.steps[0].step).toBe(1);
    expect(recipe.steps[1].step).toBe(1.1);
    expect(recipe.steps[2].step).toBe(1.2);
    expect(recipe.steps.every(s => typeof s.step === 'number')).toBe(true);
  });
});
