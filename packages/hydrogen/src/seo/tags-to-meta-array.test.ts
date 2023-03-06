import {tagsToMetaArray} from './tags-to-meta-array';
import {describe, it, expect} from 'vitest';

describe('tagsToMetaArray', () => {
  it('should return an empty array if no tags are passed', () => {
    // Given / When
    const result = tagsToMetaArray([]);

    // Then
    expect(result).toEqual([]);
  });

  it('should transform titles', () => {
    // Given / When
    const result = tagsToMetaArray([
      {
        tag: 'title',
        props: {
          content: 'Snowdevil',
        },
        key: '',
      },
    ]);

    // Then
    expect(result).toEqual([{title: 'Snowdevil'}]);
  });

  it('should transform meta fields as well', () => {
    // Given / When
    const result = tagsToMetaArray([
      {
        tag: 'title',
        props: {
          content: 'Snowdevil',
        },
        key: '',
      },
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
    ]);

    // Then
    expect(result).toEqual([
      {title: 'Snowdevil'},
      {name: 'description', content: 'A Hydrogen storefront'},
      {property: 'og:description', content: 'A Hydrogen storefront'},
      {property: 'og:image', content: 'https://hydrogen.shop/logo.png'},
      {property: 'og:type', content: 'image/png'},
    ]);
  });
});
