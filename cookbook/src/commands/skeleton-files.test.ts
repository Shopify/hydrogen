import {describe, expect, it, vi, beforeEach} from 'vitest';
import {skeletonFiles} from './skeleton-files';

vi.mock('../lib/dependency-graph', () => ({getSkeletonFiles: vi.fn()}));

import {getSkeletonFiles} from '../lib/dependency-graph';

const mockGetSkeletonFiles = vi.mocked(getSkeletonFiles);

const handler = skeletonFiles.handler as (args: {
  recipe: string[];
  json: boolean;
}) => void;

describe('skeleton-files command handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  it('passes undefined to getSkeletonFiles when no --recipe flags given', () => {
    mockGetSkeletonFiles.mockReturnValue([]);

    handler({recipe: [], json: false});

    expect(mockGetSkeletonFiles).toHaveBeenCalledWith(undefined);
  });

  it('passes recipe names array to getSkeletonFiles when --recipe flags given', () => {
    mockGetSkeletonFiles.mockReturnValue([]);

    handler({recipe: ['multipass', 'b2b'], json: false});

    expect(mockGetSkeletonFiles).toHaveBeenCalledWith(['multipass', 'b2b']);
  });

  it('prints one file path per line by default', () => {
    mockGetSkeletonFiles.mockReturnValue([
      'templates/skeleton/app/root.tsx',
      'templates/skeleton/app/server.ts',
    ]);

    handler({recipe: [], json: false});

    expect(console.log).toHaveBeenCalledTimes(2);
    expect(console.log).toHaveBeenNthCalledWith(
      1,
      'templates/skeleton/app/root.tsx',
    );
    expect(console.log).toHaveBeenNthCalledWith(
      2,
      'templates/skeleton/app/server.ts',
    );
  });

  it('prints JSON array when --json flag is set', () => {
    const files = [
      'templates/skeleton/app/root.tsx',
      'templates/skeleton/app/server.ts',
    ];
    mockGetSkeletonFiles.mockReturnValue(files);

    handler({recipe: [], json: true});

    expect(console.log).toHaveBeenCalledTimes(1);
    expect(console.log).toHaveBeenCalledWith(JSON.stringify(files));
  });

  it('produces no output when no files are referenced', () => {
    mockGetSkeletonFiles.mockReturnValue([]);

    handler({recipe: [], json: false});

    expect(console.log).not.toHaveBeenCalled();
  });
});
