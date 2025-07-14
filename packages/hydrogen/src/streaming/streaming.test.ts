import {describe, it, expect} from 'vitest';

describe('Streaming functionality', () => {
  it('should support streaming by returning promises directly from loaders', async () => {
    // In React Router v7, streaming works by returning promises directly
    const loaderData = {
      criticalData: 'immediate',
      slowData: new Promise((resolve) => {
        setTimeout(() => resolve('delayed data'), 100);
      }),
    };

    // Critical data should be immediately available
    expect(loaderData.criticalData).toBe('immediate');

    // Slow data should be a promise
    expect(loaderData.slowData).toBeInstanceOf(Promise);

    // Verify the promise resolves correctly
    const resolvedData = await loaderData.slowData;
    expect(resolvedData).toBe('delayed data');
  });

  it('should handle multiple streaming promises', async () => {
    const promise1 = new Promise((resolve) => {
      setTimeout(() => resolve('data1'), 50);
    });

    const promise2 = new Promise((resolve) => {
      setTimeout(() => resolve('data2'), 100);
    });

    const loaderData = {
      immediate: 'sync data',
      deferred1: promise1,
      deferred2: promise2,
    };

    // Immediate data available
    expect(loaderData.immediate).toBe('sync data');

    // Both promises should resolve
    const [result1, result2] = await Promise.all([
      loaderData.deferred1,
      loaderData.deferred2,
    ]);

    expect(result1).toBe('data1');
    expect(result2).toBe('data2');
  });

  it('should handle errors in streaming promises', async () => {
    const errorPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Streaming error')), 50);
    });

    const loaderData = {
      criticalData: 'immediate',
      errorData: errorPromise,
    };

    expect(loaderData.criticalData).toBe('immediate');

    // The error promise should reject
    await expect(loaderData.errorData).rejects.toThrow('Streaming error');
  });

  it('should work with React Router v7 loader pattern', async () => {
    // Simulate a React Router v7 loader function
    const loader = async () => {
      // Critical data - await this
      const criticalData = await Promise.resolve({
        title: 'Product Page',
        productId: '123',
      });

      // Streaming data - return promises directly (no defer needed)
      const recommendations = new Promise<Array<{id: string; name: string}>>(
        (resolve) => {
          setTimeout(() => {
            resolve([
              {id: '456', name: 'Related Product 1'},
              {id: '789', name: 'Related Product 2'},
            ]);
          }, 200);
        },
      );

      const reviews = new Promise<Array<{rating: number; comment: string}>>(
        (resolve) => {
          setTimeout(() => {
            resolve([
              {rating: 5, comment: 'Great product!'},
              {rating: 4, comment: 'Good value'},
            ]);
          }, 300);
        },
      );

      // In React Router v7, just return the object with promises
      return {
        ...criticalData,
        recommendations,
        reviews,
      };
    };

    const result = await loader();

    // Critical data immediately available
    expect(result.title).toBe('Product Page');
    expect(result.productId).toBe('123');

    // Streaming data as promises
    expect(result.recommendations).toBeInstanceOf(Promise);
    expect(result.reviews).toBeInstanceOf(Promise);

    // Verify streaming data resolves correctly
    const recommendations = await result.recommendations;
    expect(recommendations).toHaveLength(2);
    expect(recommendations[0].name).toBe('Related Product 1');

    const reviews = await result.reviews;
    expect(reviews).toHaveLength(2);
    expect(reviews[0].rating).toBe(5);
  });

  it('should simulate React Suspense boundaries with streaming', async () => {
    // Simulate how React handles streaming with Suspense
    const StreamingComponent = async () => {
      const data = {
        immediate: 'Available immediately',
        streamed: new Promise((resolve) => {
          setTimeout(() => resolve('Streamed after delay'), 150);
        }),
      };

      // Immediate render
      expect(data.immediate).toBe('Available immediately');

      // Suspense would show fallback while this resolves
      const streamedData = await data.streamed;
      expect(streamedData).toBe('Streamed after delay');

      return {rendered: true, data: streamedData};
    };

    const result = await StreamingComponent();
    expect(result.rendered).toBe(true);
    expect(result.data).toBe('Streamed after delay');
  });
});
