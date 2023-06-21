import {describe, it, expect} from 'vitest';
import {getDeepKeys, createLoaderDataTracker} from './use-loader-data';

const timeout = 0;

function useLoaderDataTracker<T extends Record<string, any>>(data: T) {
  const loaderDataTracker: {
    result: undefined | {filename: string; properties: string[]};
    proxy: T;
  } = {
    result: undefined,
    proxy: createLoaderDataTracker(
      () => ({...data}),
      (result) => (loaderDataTracker.result = result),
      timeout,
    )(),
  };

  return loaderDataTracker;
}

function sleep() {
  return new Promise((res) => setTimeout(res, timeout));
}

describe('createLoaderDataTracker', () => {
  const filename = expect.stringContaining('use-loader-data.test');

  it('uses the deepest keys', () => {
    expect(
      getDeepKeys({
        f1: {
          f2: true,
          f3: {
            f4: true,
          },
          f5: [{f6: {f7: null, f8: null}}, {f6: {f7: {f9: null}, f8: null}}],
        },
      }),
    ).toStrictEqual([
      'f1.f2',
      'f1.f3.f4',
      'f1.f5.f6.f8',
      'f1.f5.f6.f7.f9',
      // 'f1.f5.f6.f7', => Should not be shown since it's a short version of the previous key
    ]);
  });

  it('does not run when properties are not accessed', async () => {
    const data = {
      f1: true,
    };

    const tracker = useLoaderDataTracker(data);
    await sleep();

    expect(tracker.result).toStrictEqual(undefined);
  });

  it('gathers the keys that are not accessed', async () => {
    const data = {
      f1: {
        f2: true,
        f3: {
          f4: true,
        },
        f5: [{f6: {f7: null, f8: null}}, {f6: {f7: {f9: null}, f8: null}}],
      },
    };

    let tracker = useLoaderDataTracker(data);

    tracker.proxy.f1.f2;
    tracker.proxy.f1.f5[0].f6.f8;
    tracker.proxy.f1.f5[0].f6.f7?.f9; // Undefined, it will show the property

    await sleep();

    expect(tracker.result).toStrictEqual({
      filename,
      properties: ['f1.f3.f4', 'f1.f5.f6.f7.f9'],
    });

    tracker = useLoaderDataTracker(data);

    tracker.proxy.f1.f5[1].f6.f7?.f9; // Defined, will skip it

    await sleep();

    expect(tracker.result).toStrictEqual({
      filename,
      properties: ['f1.f2', 'f1.f3.f4', 'f1.f5.f6.f8'],
    });
  });

  it('does not show nodes and edges', async () => {
    const data = {
      f0: true,
      f1: {
        edges: [{node: {id: 1}}, {node: {id: 2}}],
      },
    };

    let tracker = useLoaderDataTracker(data);
    tracker.proxy.f0;
    await sleep();

    expect(tracker.result).toStrictEqual({
      filename,
      properties: ['f1.id'],
    });

    tracker = useLoaderDataTracker(data);
    tracker.proxy.f1.edges[0].node.id;
    await sleep();

    expect(tracker.result).toStrictEqual({
      filename,
      properties: ['f0'],
    });
  });
});
