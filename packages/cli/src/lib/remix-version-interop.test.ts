import {describe, it, expect} from 'vitest';
import {
  convertRouteToV1,
  convertTemplateToRemixVersion,
} from './remix-version-interop.js';

describe('remix-version-interop', () => {
  describe('v2_routeConvention', () => {
    it('converts routes to v1', () => {
      expect(convertRouteToV1('_index')).toEqual('index');
      expect(convertRouteToV1('path.to.file')).toEqual('path/to/file');
      expect(convertRouteToV1('path.to._index')).toEqual('path/to/index');
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

    it('transforms meta exports to v2', async () => {
      const result = convertTemplateToRemixVersion(META_TEMPLATE, {
        isV2Meta: true,
      });

      expect(result).toContain('type V2_MetaFunction');
      expect(result).not.toContain('type MetaFunction');
      expect(result).not.toContain('@shopify/remix-oxygen');
      expect(result).toMatch(/return \[\{title\}\];/);
      expect(result).not.toMatch(/return \{title\};/);
    });

    it('transforms meta exports to v1', async () => {
      const result = convertTemplateToRemixVersion(META_TEMPLATE, {
        isV2Meta: false,
      });

      expect(result).toContain('type MetaFunction');
      expect(result).not.toContain('type V2_MetaFunction');
      expect(result).not.toContain('@remix-run/react');
      expect(result).toMatch(/return \{title\};/);
      expect(result).not.toMatch(/return \[\{title\}\];/);
    });
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

    it('transforms ErrorBoundary exports to v2', async () => {
      const result = convertTemplateToRemixVersion(ERROR_BOUNDARY_TEMPLATE, {
        isV2ErrorBoundary: true,
      });

      expect(result).toContain('export function ErrorBoundary');
      expect(result).not.toContain('export const ErrorBoundary');
      expect(result).not.toMatch('export function CatchBoundary');
      expect(result).not.toContain('type ErrorBoundaryComponent');
      expect(result).not.toContain('@shopify/remix-oxygen'); // Cleans empty up imports
      expect(result).toContain('useRouteError');
      expect(result).toContain('isRouteErrorResponse');
      expect(result).not.toContain('useCatch');
    });

    it('transforms ErrorBoundary exports to v1', async () => {
      const result = convertTemplateToRemixVersion(ERROR_BOUNDARY_TEMPLATE, {
        isV2ErrorBoundary: false,
      });

      expect(result).toContain('export const ErrorBoundary');
      expect(result).not.toContain('export function ErrorBoundary');
      expect(result).toMatch('export function CatchBoundary');
      expect(result).toContain('type ErrorBoundaryComponent');
      expect(result).toContain('useCatch');
      expect(result).not.toContain('useRouteError');
      expect(result).not.toContain('isRouteErrorResponse');
    });
  });
});
