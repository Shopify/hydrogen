import {describe, expect, it} from 'vitest';
import {Recipe} from './recipe';
import {validateStepNames, validateStepDescriptions} from './validate';

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
