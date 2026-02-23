import {describe, expect, it, vi, beforeEach} from 'vitest';
import {
  getAffectedRecipes,
  getSkeletonFileMap,
  getSkeletonFiles,
} from './dependency-graph';

vi.mock('./util', () => ({listRecipes: vi.fn()}));
vi.mock('./recipe', () => ({loadRecipe: vi.fn()}));
vi.mock('./constants', () => ({
  COOKBOOK_PATH: '/repo/cookbook',
  TEMPLATE_DIRECTORY: 'templates/skeleton/',
}));

import {listRecipes} from './util';
import {loadRecipe} from './recipe';

const mockListRecipes = vi.mocked(listRecipes);
const mockLoadRecipe = vi.mocked(loadRecipe);

function makeRecipe({
  diffs = [] as {file: string; patchFile: string}[],
  ingredients = [] as {path: string}[],
  deletedFiles,
}: {
  diffs?: {file: string; patchFile: string}[];
  ingredients?: {path: string}[];
  deletedFiles?: string[];
}) {
  return {
    gid: 'test-gid',
    title: 'Test',
    summary: 'Test',
    description: 'Test',
    ingredients: ingredients.map((i) => ({...i, description: null})),
    steps:
      diffs.length > 0
        ? [{type: 'PATCH' as const, step: '1', name: 'step', diffs}]
        : [],
    deletedFiles,
    commit: 'abc123',
    llms: {userQueries: [], troubleshooting: []},
  } as any;
}

describe('getAffectedRecipes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns empty array immediately when no changed files provided', () => {
    const result = getAffectedRecipes([]);
    expect(result).toEqual([]);
    expect(mockListRecipes).not.toHaveBeenCalled();
  });

  it('returns empty array when there are no recipes', () => {
    mockListRecipes.mockReturnValue([]);
    expect(getAffectedRecipes(['templates/skeleton/app/root.tsx'])).toEqual([]);
  });

  it('returns empty array when no recipe references the changed file', () => {
    mockListRecipes.mockReturnValue(['my-recipe']);
    mockLoadRecipe.mockReturnValue(
      makeRecipe({
        diffs: [{file: 'app/server.ts', patchFile: 'server.ts.abc.patch'}],
      }),
    );

    const result = getAffectedRecipes(['templates/skeleton/app/root.tsx']);
    expect(result).toEqual([]);
  });

  it('detects recipe affected via a diff file', () => {
    mockListRecipes.mockReturnValue(['my-recipe']);
    mockLoadRecipe.mockReturnValue(
      makeRecipe({
        diffs: [{file: 'app/root.tsx', patchFile: 'root.tsx.abc.patch'}],
      }),
    );

    const result = getAffectedRecipes(['templates/skeleton/app/root.tsx']);
    expect(result).toEqual(['my-recipe']);
  });

  it('normalizes diff.file path by prepending TEMPLATE_DIRECTORY before matching', () => {
    mockListRecipes.mockReturnValue(['my-recipe']);
    mockLoadRecipe.mockReturnValue(
      makeRecipe({
        diffs: [{file: 'app/root.tsx', patchFile: 'root.tsx.abc.patch'}],
      }),
    );

    // template-relative path alone does NOT match
    expect(getAffectedRecipes(['app/root.tsx'])).toEqual([]);

    // repo-relative path (with prefix) DOES match
    expect(getAffectedRecipes(['templates/skeleton/app/root.tsx'])).toEqual([
      'my-recipe',
    ]);
  });

  it('detects recipe affected via an ingredient path', () => {
    mockListRecipes.mockReturnValue(['my-recipe']);
    mockLoadRecipe.mockReturnValue(
      makeRecipe({
        ingredients: [
          {path: 'templates/skeleton/app/components/Foo.tsx'},
        ],
      }),
    );

    const result = getAffectedRecipes([
      'templates/skeleton/app/components/Foo.tsx',
    ]);
    expect(result).toEqual(['my-recipe']);
  });

  it('detects recipe affected via a deleted file', () => {
    mockListRecipes.mockReturnValue(['my-recipe']);
    mockLoadRecipe.mockReturnValue(
      makeRecipe({
        deletedFiles: ['templates/skeleton/app/old-routes/removed.tsx'],
      }),
    );

    const result = getAffectedRecipes([
      'templates/skeleton/app/old-routes/removed.tsx',
    ]);
    expect(result).toEqual(['my-recipe']);
  });

  it('returns only the recipes that match among multiple recipes', () => {
    mockListRecipes.mockReturnValue(['recipe-a', 'recipe-b', 'recipe-c']);
    mockLoadRecipe
      .mockReturnValueOnce(
        makeRecipe({
          diffs: [{file: 'app/root.tsx', patchFile: 'root.tsx.abc.patch'}],
        }),
      )
      .mockReturnValueOnce(
        makeRecipe({
          ingredients: [{path: 'templates/skeleton/app/components/Bar.tsx'}],
        }),
      )
      .mockReturnValueOnce(
        makeRecipe({
          diffs: [{file: 'app/root.tsx', patchFile: 'root.tsx.def.patch'}],
        }),
      );

    const result = getAffectedRecipes(['templates/skeleton/app/root.tsx']);
    expect(result).toEqual(['recipe-a', 'recipe-c']);
  });

  it('skips recipes that fail to load and continues checking the rest', () => {
    mockListRecipes.mockReturnValue(['bad-recipe', 'good-recipe']);
    mockLoadRecipe
      .mockImplementationOnce(() => {
        throw new Error('YAML parse error');
      })
      .mockReturnValueOnce(
        makeRecipe({
          diffs: [{file: 'app/root.tsx', patchFile: 'root.tsx.abc.patch'}],
        }),
      );

    const result = getAffectedRecipes(['templates/skeleton/app/root.tsx']);
    expect(result).toEqual(['good-recipe']);
  });

  it('returns a recipe when any one of multiple changed files matches', () => {
    mockListRecipes.mockReturnValue(['my-recipe']);
    mockLoadRecipe.mockReturnValue(
      makeRecipe({
        diffs: [{file: 'app/server.ts', patchFile: 'server.ts.abc.patch'}],
      }),
    );

    const result = getAffectedRecipes([
      'templates/skeleton/app/root.tsx',
      'templates/skeleton/app/server.ts',
    ]);
    expect(result).toEqual(['my-recipe']);
  });

  it('does not crash when a step has no diffs property', () => {
    mockListRecipes.mockReturnValue(['my-recipe']);
    mockLoadRecipe.mockReturnValue({
      gid: 'test-gid',
      title: 'Test',
      summary: 'Test',
      description: 'Test',
      ingredients: [],
      steps: [{type: 'INFO' as const, step: '1', name: 'Info step'}],
      commit: 'abc123',
      llms: {userQueries: [], troubleshooting: []},
    } as any);

    const result = getAffectedRecipes(['templates/skeleton/app/root.tsx']);
    expect(result).toEqual([]);
  });

  it('does not crash when deletedFiles is undefined', () => {
    mockListRecipes.mockReturnValue(['my-recipe']);
    mockLoadRecipe.mockReturnValue(makeRecipe({}));

    const result = getAffectedRecipes(['templates/skeleton/app/root.tsx']);
    expect(result).toEqual([]);
  });
});

describe('getSkeletonFiles', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns empty array when there are no recipes', () => {
    mockListRecipes.mockReturnValue([]);
    expect(getSkeletonFiles()).toEqual([]);
  });

  it('collects diff files (normalised to repo-relative) from all recipes', () => {
    mockListRecipes.mockReturnValue(['recipe-a']);
    mockLoadRecipe.mockReturnValue(
      makeRecipe({
        diffs: [{file: 'app/root.tsx', patchFile: 'root.tsx.abc.patch'}],
      }),
    );

    expect(getSkeletonFiles()).toEqual(['templates/skeleton/app/root.tsx']);
  });

  it('collects ingredient paths from all recipes', () => {
    mockListRecipes.mockReturnValue(['recipe-a']);
    mockLoadRecipe.mockReturnValue(
      makeRecipe({
        ingredients: [{path: 'templates/skeleton/app/components/Foo.tsx'}],
      }),
    );

    expect(getSkeletonFiles()).toEqual([
      'templates/skeleton/app/components/Foo.tsx',
    ]);
  });

  it('collects deleted file paths from all recipes', () => {
    mockListRecipes.mockReturnValue(['recipe-a']);
    mockLoadRecipe.mockReturnValue(
      makeRecipe({
        deletedFiles: ['templates/skeleton/app/old.tsx'],
      }),
    );

    expect(getSkeletonFiles()).toEqual(['templates/skeleton/app/old.tsx']);
  });

  it('deduplicates files referenced by multiple recipes', () => {
    mockListRecipes.mockReturnValue(['recipe-a', 'recipe-b']);
    mockLoadRecipe
      .mockReturnValueOnce(
        makeRecipe({
          diffs: [{file: 'app/root.tsx', patchFile: 'root.tsx.abc.patch'}],
        }),
      )
      .mockReturnValueOnce(
        makeRecipe({
          diffs: [{file: 'app/root.tsx', patchFile: 'root.tsx.def.patch'}],
        }),
      );

    expect(getSkeletonFiles()).toEqual(['templates/skeleton/app/root.tsx']);
  });

  it('returns files sorted alphabetically', () => {
    mockListRecipes.mockReturnValue(['recipe-a']);
    mockLoadRecipe.mockReturnValue(
      makeRecipe({
        diffs: [
          {file: 'app/server.ts', patchFile: 'server.ts.abc.patch'},
          {file: 'app/root.tsx', patchFile: 'root.tsx.abc.patch'},
        ],
      }),
    );

    expect(getSkeletonFiles()).toEqual([
      'templates/skeleton/app/root.tsx',
      'templates/skeleton/app/server.ts',
    ]);
  });

  it('filters to specified recipe names when provided', () => {
    mockListRecipes.mockReturnValue(['recipe-a', 'recipe-b']);
    mockLoadRecipe.mockReturnValue(
      makeRecipe({
        diffs: [{file: 'app/root.tsx', patchFile: 'root.tsx.abc.patch'}],
      }),
    );

    getSkeletonFiles(['recipe-a']);

    // Only loads the one recipe requested, not all
    expect(mockLoadRecipe).toHaveBeenCalledTimes(1);
    expect(mockListRecipes).not.toHaveBeenCalled();
  });

  it('skips recipes that fail to load', () => {
    mockListRecipes.mockReturnValue(['bad-recipe', 'good-recipe']);
    mockLoadRecipe
      .mockImplementationOnce(() => {
        throw new Error('YAML parse error');
      })
      .mockReturnValueOnce(
        makeRecipe({
          diffs: [{file: 'app/root.tsx', patchFile: 'root.tsx.abc.patch'}],
        }),
      );

    expect(getSkeletonFiles()).toEqual(['templates/skeleton/app/root.tsx']);
  });
});

describe('getSkeletonFileMap', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns empty map when there are no recipes', () => {
    mockListRecipes.mockReturnValue([]);
    expect(getSkeletonFileMap()).toEqual(new Map());
  });

  it('maps each file to the recipes that reference it', () => {
    mockListRecipes.mockReturnValue(['recipe-a', 'recipe-b']);
    mockLoadRecipe
      .mockReturnValueOnce(
        makeRecipe({
          diffs: [{file: 'app/root.tsx', patchFile: 'root.tsx.abc.patch'}],
        }),
      )
      .mockReturnValueOnce(
        makeRecipe({
          diffs: [{file: 'app/root.tsx', patchFile: 'root.tsx.def.patch'}],
          ingredients: [{path: 'templates/skeleton/app/components/Foo.tsx'}],
        }),
      );

    const result = getSkeletonFileMap();

    expect(result.get('templates/skeleton/app/root.tsx')).toEqual([
      'recipe-a',
      'recipe-b',
    ]);
    expect(result.get('templates/skeleton/app/components/Foo.tsx')).toEqual([
      'recipe-b',
    ]);
  });

  it('returns entries sorted alphabetically by file path', () => {
    mockListRecipes.mockReturnValue(['recipe-a']);
    mockLoadRecipe.mockReturnValue(
      makeRecipe({
        diffs: [
          {file: 'app/server.ts', patchFile: 'server.ts.abc.patch'},
          {file: 'app/root.tsx', patchFile: 'root.tsx.abc.patch'},
        ],
      }),
    );

    expect([...getSkeletonFileMap().keys()]).toEqual([
      'templates/skeleton/app/root.tsx',
      'templates/skeleton/app/server.ts',
    ]);
  });

  it('filters to specified recipe names when provided', () => {
    mockLoadRecipe.mockReturnValue(
      makeRecipe({
        diffs: [{file: 'app/root.tsx', patchFile: 'root.tsx.abc.patch'}],
      }),
    );

    getSkeletonFileMap(['recipe-a']);

    expect(mockLoadRecipe).toHaveBeenCalledTimes(1);
    expect(mockListRecipes).not.toHaveBeenCalled();
  });

  it('skips recipes that fail to load', () => {
    mockListRecipes.mockReturnValue(['bad-recipe', 'good-recipe']);
    mockLoadRecipe
      .mockImplementationOnce(() => {
        throw new Error('YAML parse error');
      })
      .mockReturnValueOnce(
        makeRecipe({
          diffs: [{file: 'app/root.tsx', patchFile: 'root.tsx.abc.patch'}],
        }),
      );

    const result = getSkeletonFileMap();
    expect(result.get('templates/skeleton/app/root.tsx')).toEqual([
      'good-recipe',
    ]);
    expect(result.has('bad-recipe')).toBe(false);
  });
});
