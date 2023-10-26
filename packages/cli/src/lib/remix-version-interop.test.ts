import {describe, it, expect} from 'vitest';
import {convertRouteToV1} from './remix-version-interop.js';

describe('remix-version-interop', () => {
  it('converts routes to v1', () => {
    expect(convertRouteToV1('_index')).toEqual('index');
    expect(convertRouteToV1('path.to.file')).toEqual('path/to/file');
    expect(convertRouteToV1('path.to._index')).toEqual('path/to/index');
    expect(convertRouteToV1('patht.to.[sitemap.xml]')).toEqual(
      'patht/to/[sitemap.xml]',
    );
  });
});
