import {describe, it, expect} from 'vitest';
import {parseGid, addDataIf, schemaWrapper} from './analytics-utils.js';

describe('analytic-utils', () => {
  describe('parseGid', () => {
    it('returns the id and resource type from a gid', () => {
      const {searchParams, ...gid} = parseGid('gid://shopify/Order/123');
      expect(gid).toStrictEqual({
        id: '123',
        resource: 'Order',
        resourceId: '123',
        search: '',
        hash: '',
      });
      expect(searchParams.toString()).toBe('');
    });

    it('returns empty string if the gid is not a string', () => {
      //@ts-expect-error - testing invalid input
      const {searchParams, ...gid} = parseGid(123);
      expect(gid).toStrictEqual({
        id: '',
        resource: null,
        resourceId: null,
        search: '',
        hash: '',
      });
      expect(searchParams.toString()).toBe('');
    });

    it('returns empty string if the gid is not a valid gid', () => {
      const {searchParams, ...gid} = parseGid('gid://shopify/Order');
      expect(gid).toStrictEqual({
        id: '',
        resource: null,
        resourceId: null,
        search: '',
        hash: '',
      });
      expect(searchParams.toString()).toBe('');
    });

    it('returns the id and resource type from a gid with a query string', () => {
      const {searchParams, ...gid} = parseGid(
        'gid://shopify/Order/123?namespace=123',
      );
      expect(gid).toStrictEqual({
        id: '123?namespace=123',
        resource: 'Order',
        resourceId: '123',
        search: '?namespace=123',
        hash: '',
      });
      expect(searchParams.toString()).toBe('namespace=123');
    });

    it('returns the id and resource type from a gid with a query string and a fragment', () => {
      const {searchParams, ...gid} = parseGid(
        'gid://shopify/Order/123?namespace=123#fragment',
      );
      expect(gid).toStrictEqual({
        id: '123?namespace=123#fragment',
        resource: 'Order',
        resourceId: '123',
        search: '?namespace=123',
        hash: '#fragment',
      });
      expect(searchParams.toString()).toBe('namespace=123');
    });

    it('returns empty string if the resource is missing', () => {
      const {searchParams, ...gid} = parseGid('gid://shopify//123');
      expect(gid).toStrictEqual({
        id: '',
        resource: null,
        resourceId: null,
        search: '',
        hash: '',
      });
      expect(searchParams.toString()).toBe('');
    });

    it('returns the c1 cart token', () => {
      const {searchParams, ...gid} = parseGid(
        'gid://shopify/Cart/c1-3d2419bf79df5e91d37b449cc6cd0ba1?test=123',
      );
      expect(gid).toStrictEqual({
        id: 'c1-3d2419bf79df5e91d37b449cc6cd0ba1?test=123',
        resource: 'Cart',
        resourceId: 'c1-3d2419bf79df5e91d37b449cc6cd0ba1',
        search: '?test=123',
        hash: '',
      });
      expect(searchParams.toString()).toBe('test=123');
    });

    it('should default to empty string', () => {
      const {searchParams, ...gid} = parseGid('');
      expect(gid).toStrictEqual({
        id: '',
        resource: null,
        resourceId: null,
        search: '',
        hash: '',
      });
      expect(searchParams.toString()).toBe('');
    });
  });

  describe('addDataIf', () => {
    it('adds the key value pair when the value is truthy', () => {
      const data = {foo: 'bar'};
      const formattedData = {};

      expect(addDataIf(data, formattedData)).toEqual({foo: 'bar'});
    });

    it('does not add the key value pair when the value is falsy', () => {
      const data = {foo: null, bazz: ''};
      const formattedData = {};

      expect(addDataIf(data, formattedData)).toEqual({});
    });

    it('does not add the key value pair when the value is an empty string', () => {
      const data = {foo: ''};
      const formattedData = {};

      expect(addDataIf(data, formattedData)).toEqual({});
    });

    it('returns and empty object if the key value pairs are not an object', () => {
      const data = 'foo';
      const formattedData = {};

      //@ts-expect-error passing-and-invalid-type-for-testing
      expect(addDataIf(data, formattedData)).toEqual({});
    });
  });

  describe('schemaWrapper', () => {
    it('returns a Shopify Monorail event from a Shopify Monorail payload and a schema ID', () => {
      const payload = {foo: 'bar'};
      const schemaId = '123';

      expect(schemaWrapper(schemaId, payload)).toEqual({
        schema_id: '123',
        payload: {foo: 'bar'},
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        metadata: {event_created_at_ms: expect.any(Number)},
      });
    });
  });
});
