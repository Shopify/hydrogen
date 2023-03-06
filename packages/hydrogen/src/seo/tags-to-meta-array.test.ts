import {tagsToMetaArray} from './tags-to-meta-array';
import {describe, it, expect} from 'vitest';
import type {CustomHeadTagObject} from './generate-seo-tags';

describe('tagsToMetaArray', () => {
  const mockTags = [
    {
      tag: 'meta',
      props: {
        name: 'description',
        content: 'A Hydrogen storefront',
      },
      key: '',
    },
    {
      tag: 'meta',
      props: {
        property: 'og:description',
        content: 'A Hydrogen storefront',
      },
      key: '',
    },
    {
      tag: 'meta',
      props: {
        property: 'og:image',
        content: 'https://hydrogen.shop/logo.png',
      },
      key: '',
    },
    {
      tag: 'meta',
      props: {
        property: 'og:type',
        content: 'image/png',
      },
      key: '',
    },
    {
      tag: 'title',
      props: {
        content: 'Snowdevil',
      },
      key: '',
    },
    {
      tag: 'link',
      props: {
        rel: 'cononical',
        content: 'https://hydrogen.shop',
      },
      key: '',
    },
  ] satisfies CustomHeadTagObject[];

  it('should return an empty array if no tags are passed', () => {
    // Given / When
    const result = tagsToMetaArray([]);

    // Then
    expect(result).toEqual([]);
  });

  it('should transform titles', () => {
    // Given / When
    const result = tagsToMetaArray(mockTags, {tag: 'title'});

    // Then
    expect(result).toEqual([{title: 'Snowdevil'}]);
  });

  it('should transform meta fields', () => {
    // Given / When
    const result = tagsToMetaArray(mockTags, {tag: 'meta'});

    // Then
    expect(result).toEqual([
      {name: 'description', content: 'A Hydrogen storefront'},
      {property: 'og:description', content: 'A Hydrogen storefront'},
      {property: 'og:image', content: 'https://hydrogen.shop/logo.png'},
      {property: 'og:type', content: 'image/png'},
    ]);
  });

  it('should transform links', () => {
    // Given / When
    const result = tagsToMetaArray(mockTags, {tag: 'link'});

    // Then
    expect(result).toEqual([
      {rel: 'cononical', content: 'https://hydrogen.shop'},
    ]);
  });
});
