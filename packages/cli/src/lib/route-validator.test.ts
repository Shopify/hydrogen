import {describe, it, expect} from 'vitest';
import {findMissingRoutes, findReservedRoutes} from './route-validator.js';

const createRoute = (path: string) => ({
  routes: {
    'route-id': {
      file: 'a/file',
      id: 'route-id',
      path,
    },
  },
});

describe('missing-routes', () => {
  it('matches routes with dots', async () => {
    const requiredRoutes = ['sitemap.xml'];

    expect(findMissingRoutes({routes: {}}, requiredRoutes)).toHaveLength(1);
    expect(
      findMissingRoutes(createRoute('sitemap.xml'), requiredRoutes),
    ).toHaveLength(0);
  });

  it('matches routes with different parameter names', async () => {
    const requiredRoutes = ['collections/:collectionHandle'];

    expect(findMissingRoutes({routes: {}}, requiredRoutes)).toHaveLength(1);
    expect(
      findMissingRoutes(createRoute('collections/:param'), requiredRoutes),
    ).toHaveLength(0);
  });

  it('matches optional segments in different positions', async () => {
    const requiredRoutes = ['collections/products'];
    const validRoutes = [
      'segment?/collections/products',
      ':segment?/collections/products',
      'collections/segment?/products',
      'collections/:segment?/products',
      'collections/products/segment?',
      'collections/products/:segment?',
    ];

    expect(findMissingRoutes({routes: {}}, requiredRoutes)).toHaveLength(1);

    for (const validRoute of validRoutes) {
      expect(
        findMissingRoutes(createRoute(validRoute), requiredRoutes),
      ).toHaveLength(0);
    }
  });
});

describe.only('reserved-routes', () => {
  it('returns an empty array when no routes are present', async () => {
    expect(findReservedRoutes({routes: {}})).toHaveLength(0);
  });

  it('returns an array of reserved routes', async () => {
    expect(
      findReservedRoutes(createRoute('/api/2024-10/graphql.json')),
    ).toHaveLength(1);

    expect(
      findReservedRoutes(createRoute('/api/:param/graphql.json')),
    ).toHaveLength(1);
  });

  it('finds reserved routes /cdn/', async () => {
    expect(findReservedRoutes(createRoute('/cdn/'))).toHaveLength(1);

    expect(
      findReservedRoutes(createRoute('/cdn/something/for/you.jpg')),
    ).toHaveLength(1);
  });

  it('finds reserved routes /_t/', async () => {
    expect(findReservedRoutes(createRoute('/_t/'))).toHaveLength(1);

    expect(
      findReservedRoutes(createRoute('/_t/something/for/you.jpg')),
    ).toHaveLength(1);
  });
});
