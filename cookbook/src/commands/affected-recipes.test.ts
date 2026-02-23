import {describe, expect, it, vi, beforeEach} from 'vitest';
import {affectedRecipes} from './affected-recipes';

vi.mock('../lib/dependency-graph', () => ({getAffectedRecipes: vi.fn()}));

import {getAffectedRecipes} from '../lib/dependency-graph';

const mockGetAffectedRecipes = vi.mocked(getAffectedRecipes);

// Extract the handler for direct invocation in tests
const handler = affectedRecipes.handler as (args: {
  files: string[];
  json: boolean;
}) => void;

describe('affected-recipes command handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  it('passes the files array to getAffectedRecipes', () => {
    mockGetAffectedRecipes.mockReturnValue([]);
    const files = [
      'templates/skeleton/app/root.tsx',
      'templates/skeleton/app/server.ts',
    ];

    handler({files, json: false});

    expect(mockGetAffectedRecipes).toHaveBeenCalledWith(files);
  });

  it('prints one recipe name per line by default', () => {
    mockGetAffectedRecipes.mockReturnValue(['multipass', 'b2b', 'markets']);

    handler({files: ['templates/skeleton/app/root.tsx'], json: false});

    expect(console.log).toHaveBeenCalledTimes(3);
    expect(console.log).toHaveBeenNthCalledWith(1, 'multipass');
    expect(console.log).toHaveBeenNthCalledWith(2, 'b2b');
    expect(console.log).toHaveBeenNthCalledWith(3, 'markets');
  });

  it('prints JSON array when --json flag is set', () => {
    mockGetAffectedRecipes.mockReturnValue(['multipass', 'b2b']);

    handler({files: ['templates/skeleton/app/root.tsx'], json: true});

    expect(console.log).toHaveBeenCalledTimes(1);
    expect(console.log).toHaveBeenCalledWith(
      JSON.stringify(['multipass', 'b2b']),
    );
  });

  it('produces no output when no recipes are affected', () => {
    mockGetAffectedRecipes.mockReturnValue([]);

    handler({files: ['templates/skeleton/app/root.tsx'], json: false});

    expect(console.log).not.toHaveBeenCalled();
  });
});
