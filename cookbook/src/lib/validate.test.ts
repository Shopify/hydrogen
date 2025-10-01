import {describe, expect, it} from 'vitest';
import {Recipe} from './recipe';
import {validateStepNumbering} from './validate';

describe('validateStepNumbering', () => {
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

    expect(() => validateStepNumbering(recipe)).toThrow(
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

    expect(() => validateStepNumbering(recipe)).not.toThrow();
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

    expect(() => validateStepNumbering(recipe)).not.toThrow();
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

    expect(() => validateStepNumbering(recipe)).not.toThrow();
  });
});
