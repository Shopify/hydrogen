import {describe, expect, it, vi, beforeEach} from 'vitest';
import {skeletonFiles} from './skeleton-files';

vi.mock('../lib/dependency-graph', () => ({getSkeletonFileMap: vi.fn()}));

import {getSkeletonFileMap} from '../lib/dependency-graph';

const mockGetSkeletonFileMap = vi.mocked(getSkeletonFileMap);

const handler = skeletonFiles.handler as (args: {
  recipe: string[];
  json: boolean;
}) => void;

describe('skeleton-files command handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  it('passes undefined to getSkeletonFileMap when no --recipe flags given', () => {
    mockGetSkeletonFileMap.mockReturnValue(new Map());

    handler({recipe: [], json: false});

    expect(mockGetSkeletonFileMap).toHaveBeenCalledWith(undefined);
  });

  it('passes recipe names array to getSkeletonFileMap when --recipe flags given', () => {
    mockGetSkeletonFileMap.mockReturnValue(new Map());

    handler({recipe: ['multipass', 'b2b'], json: false});

    expect(mockGetSkeletonFileMap).toHaveBeenCalledWith(['multipass', 'b2b']);
  });

  it('prints "file -> [recipes]" format by default', () => {
    mockGetSkeletonFileMap.mockReturnValue(
      new Map([
        ['templates/skeleton/app/root.tsx', ['multipass', 'b2b']],
        ['templates/skeleton/app/server.ts', ['gtm']],
      ]),
    );

    handler({recipe: [], json: false});

    expect(console.log).toHaveBeenCalledTimes(2);
    expect(console.log).toHaveBeenNthCalledWith(
      1,
      'templates/skeleton/app/root.tsx -> [multipass, b2b]',
    );
    expect(console.log).toHaveBeenNthCalledWith(
      2,
      'templates/skeleton/app/server.ts -> [gtm]',
    );
  });

  it('prints JSON object when --json flag is set', () => {
    mockGetSkeletonFileMap.mockReturnValue(
      new Map([['templates/skeleton/app/root.tsx', ['multipass', 'b2b']]]),
    );

    handler({recipe: [], json: true});

    expect(console.log).toHaveBeenCalledTimes(1);
    expect(console.log).toHaveBeenCalledWith(
      JSON.stringify(
        {'templates/skeleton/app/root.tsx': ['multipass', 'b2b']},
        null,
        2,
      ),
    );
  });

  it('produces no output when no files are referenced', () => {
    mockGetSkeletonFileMap.mockReturnValue(new Map());

    handler({recipe: [], json: false});

    expect(console.log).not.toHaveBeenCalled();
  });
});
