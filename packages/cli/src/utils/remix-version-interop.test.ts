import {describe, it, expect} from 'vitest';
import {convertTemplateToRemixVersion} from './remix-version-interop.js';

describe('remix-version-interop', () => {
  describe('v2_meta', () => {
    const META_TEMPLATE = `
    import {type MetaFunction, type V2_MetaFunction} from '@shopify/remix-oxygen';
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
      expect(result).toMatch(/return \[\{title\}\];/);
      expect(result).not.toMatch(/return \{title\};/);
    });

    it('transforms meta exports to v1', async () => {
      const result = convertTemplateToRemixVersion(META_TEMPLATE, {
        isV2Meta: false,
      });

      expect(result).toContain('type MetaFunction');
      expect(result).not.toContain('type V2_MetaFunction');
      expect(result).toMatch(/return \{title\};/);
      expect(result).not.toMatch(/return \[\{title\}\];/);
    });
  });
});
