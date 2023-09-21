import {describe, it, expect} from 'vitest';
import {convertRouteToV1} from './remix-version-interop.js';

describe('remix-version-interop', () => {
  describe('v2_routeConvention', () => {
    it('converts routes to v1', () => {
      expect(convertRouteToV1('_index')).toEqual('index');
      expect(convertRouteToV1('path.to.file')).toEqual('path/to/file');
      expect(convertRouteToV1('path.to._index')).toEqual('path/to/index');
      expect(convertRouteToV1('patht.to.[sitemap.xml]')).toEqual(
        'patht/to/[sitemap.xml]',
      );
    });
  });

  describe('v2_meta', () => {
    const META_TEMPLATE = `
    import {type MetaFunction} from '@shopify/remix-oxygen';
    import {type V2_MetaFunction} from '@remix-run/react';
    export const metaV1: MetaFunction = ({data}) => {
      const title = 'title';
      return {title};
    };
    export const meta: V2_MetaFunction = ({data}) => {
      const title = 'title';
      return [{title}];
    };
    `.replace(/^\s{4}/gm, '');
  });

  describe('v2_errorBoundary', () => {
    const ERROR_BOUNDARY_TEMPLATE = `
    import {useCatch, isRouteErrorResponse, useRouteError} from "@remix-run/react";
    import {type ErrorBoundaryComponent} from '@shopify/remix-oxygen';

    export function CatchBoundary() {
      const caught = useCatch();
      console.error(caught);
  
      return <div>stuff</div>;
    }

    export const ErrorBoundaryV1 = ({error}: {error: Error}) => {
      console.error(error);
    
      return <div>There was an error.</div>;
    };

    export function ErrorBoundary() {
      const error = useRouteError();

      if (isRouteErrorResponse(error)) {
        return <div>RouteError</div>;
      } else {
        return <h1>Unknown Error</h1>;
      }
    }
    `.replace(/^\s{4}/gm, '');
  });
});
