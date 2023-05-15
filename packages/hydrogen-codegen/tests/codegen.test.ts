import {describe, it, expect} from 'vitest';
import path from 'path';
import {preset, schema, pluckConfig, patchGqlPluck} from '../src/index.js';

const getCodegenOptions = (fixture: string, output = 'out.d.ts') => ({
  pluckConfig: pluckConfig as any,
  generates: {
    [output]: {
      preset,
      schema,
      documents: path.join(__dirname, `fixtures/${fixture}`),
    },
  },
});

describe('Hydrogen Codegen', async () => {
  // Patch dependency before importing the Codegen CLI
  await patchGqlPluck();
  const {executeCodegen} = await import('@graphql-codegen/cli');

  it('requires .d.ts extension', async () => {
    await expect(
      executeCodegen(getCodegenOptions('simple-operations.ts', 'out')),
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      '"[hydrogen-preset] target output should be a .d.ts file"',
    );
  });

  it('prevents duplicate operations', async () => {
    await expect(
      executeCodegen(getCodegenOptions('duplicate-operations.ts')),
    ).rejects.toThrowError(/Not all operations have an unique name: layout/i);
  });

  it('includes ESLint comments, types with Pick, generated operations and augments interfaces', async () => {
    const result = await executeCodegen(
      getCodegenOptions('simple-operations.ts'),
    );

    expect(result).toHaveLength(1);

    const generatedCode = result.find(
      (file) => file.filename === 'out.d.ts',
    )!.content;

    // Disables ESLint
    expect(generatedCode).toMatch('/* eslint-disable */');

    // Imports SFAPI
    expect(generatedCode).toMatch(
      "import * as SFAPI from '@shopify/hydrogen/storefront-api-types';",
    );

    // Uses Pick<...>
    expect(generatedCode).toMatch('Pick<SFAPI.');

    // Generates query and mutation types
    expect(generatedCode).toMatch(
      /interface GeneratedQueryTypes \{\s+"#graphql/,
    );
    expect(generatedCode).toMatch(
      /interface GeneratedMutationTypes \{\s+"#graphql/,
    );

    // Augments query/mutation types
    expect(generatedCode).toMatch(
      /declare module '@shopify\/hydrogen' {\s+interface QueryTypes extends GeneratedQueryTypes \{}\s+interface MutationTypes extends GeneratedMutationTypes \{}/,
    );

    expect(generatedCode).toMatchInlineSnapshot(`
      "/* eslint-disable eslint-comments/disable-enable-pair */
      /* eslint-disable eslint-comments/no-unlimited-disable */
      /* eslint-disable */
      import * as SFAPI from '@shopify/hydrogen/storefront-api-types';

      export type LayoutQueryVariables = SFAPI.Exact<{ [key: string]: never; }>;


      export type LayoutQuery = { shop: Pick<SFAPI.Shop, 'name' | 'description'> };

      export type CartCreateMutationVariables = SFAPI.Exact<{
        input: SFAPI.CartInput;
      }>;


      export type CartCreateMutation = { cartCreate?: SFAPI.Maybe<{ cart?: SFAPI.Maybe<Pick<SFAPI.Cart, 'id'>> }> };

      interface GeneratedQueryTypes {
        \\"#graphql\\\\n  query layout {\\\\n    shop {\\\\n      name\\\\n      description\\\\n    }\\\\n  }\\\\n\\": {return: LayoutQuery, variables: LayoutQueryVariables},
      }

      interface GeneratedMutationTypes {
        \\"#graphql\\\\n  mutation cartCreate($input: CartInput!) {\\\\n    cartCreate(input: $input) {\\\\n      cart {\\\\n        id\\\\n      }\\\\n    }\\\\n  }\\\\n\\": {return: CartCreateMutation, variables: CartCreateMutationVariables},
      }

      declare module '@shopify/hydrogen' {
        interface QueryTypes extends GeneratedQueryTypes {}
        interface MutationTypes extends GeneratedMutationTypes {}
      }
      "
    `);
  });

  it('generates types for complex queries with fragments, directives and variables', async () => {
    const result = await executeCodegen(
      getCodegenOptions('complex-operations.ts'),
    );

    expect(result).toHaveLength(1);

    // gql.ts
    const generatedCode = result.find(
      (file) => file.filename === 'out.d.ts',
    )!.content;

    expect(generatedCode).toMatchInlineSnapshot(`
      "/* eslint-disable eslint-comments/disable-enable-pair */
      /* eslint-disable eslint-comments/no-unlimited-disable */
      /* eslint-disable */
      import * as SFAPI from '@shopify/hydrogen/storefront-api-types';

      type Media_ExternalVideo_Fragment = (
        { __typename: 'ExternalVideo' }
        & Pick<SFAPI.ExternalVideo, 'id' | 'embedUrl' | 'host' | 'mediaContentType' | 'alt'>
        & { previewImage?: SFAPI.Maybe<Pick<SFAPI.Image, 'url'>> }
      );

      type Media_MediaImage_Fragment = (
        { __typename: 'MediaImage' }
        & Pick<SFAPI.MediaImage, 'id' | 'mediaContentType' | 'alt'>
        & { image?: SFAPI.Maybe<Pick<SFAPI.Image, 'url' | 'width' | 'height'>>, previewImage?: SFAPI.Maybe<Pick<SFAPI.Image, 'url'>> }
      );

      type Media_Model3d_Fragment = (
        { __typename: 'Model3d' }
        & Pick<SFAPI.Model3d, 'id' | 'mediaContentType' | 'alt'>
        & { sources: Array<Pick<SFAPI.Model3dSource, 'mimeType' | 'url'>>, previewImage?: SFAPI.Maybe<Pick<SFAPI.Image, 'url'>> }
      );

      type Media_Video_Fragment = (
        { __typename: 'Video' }
        & Pick<SFAPI.Video, 'id' | 'mediaContentType' | 'alt'>
        & { sources: Array<Pick<SFAPI.VideoSource, 'mimeType' | 'url'>>, previewImage?: SFAPI.Maybe<Pick<SFAPI.Image, 'url'>> }
      );

      export type MediaFragment = Media_ExternalVideo_Fragment | Media_MediaImage_Fragment | Media_Model3d_Fragment | Media_Video_Fragment;

      export type CollectionContentFragment = (
        Pick<SFAPI.Collection, 'id' | 'handle' | 'title' | 'descriptionHtml'>
        & { heading?: SFAPI.Maybe<Pick<SFAPI.Metafield, 'value'>>, byline?: SFAPI.Maybe<Pick<SFAPI.Metafield, 'value'>>, cta?: SFAPI.Maybe<Pick<SFAPI.Metafield, 'value'>>, spread?: SFAPI.Maybe<{ reference?: SFAPI.Maybe<(
            { __typename: 'MediaImage' }
            & Pick<SFAPI.MediaImage, 'id' | 'mediaContentType' | 'alt'>
            & { image?: SFAPI.Maybe<Pick<SFAPI.Image, 'url' | 'width' | 'height'>>, previewImage?: SFAPI.Maybe<Pick<SFAPI.Image, 'url'>> }
          ) | (
            { __typename: 'Video' }
            & Pick<SFAPI.Video, 'id' | 'mediaContentType' | 'alt'>
            & { sources: Array<Pick<SFAPI.VideoSource, 'mimeType' | 'url'>>, previewImage?: SFAPI.Maybe<Pick<SFAPI.Image, 'url'>> }
          ) | {}> }>, spreadSecondary?: SFAPI.Maybe<{ reference?: SFAPI.Maybe<(
            { __typename: 'MediaImage' }
            & Pick<SFAPI.MediaImage, 'id' | 'mediaContentType' | 'alt'>
            & { image?: SFAPI.Maybe<Pick<SFAPI.Image, 'url' | 'width' | 'height'>>, previewImage?: SFAPI.Maybe<Pick<SFAPI.Image, 'url'>> }
          ) | (
            { __typename: 'Video' }
            & Pick<SFAPI.Video, 'id' | 'mediaContentType' | 'alt'>
            & { sources: Array<Pick<SFAPI.VideoSource, 'mimeType' | 'url'>>, previewImage?: SFAPI.Maybe<Pick<SFAPI.Image, 'url'>> }
          ) | {}> }> }
      );

      export type CollectionContentQueryQueryVariables = SFAPI.Exact<{
        handle?: SFAPI.InputMaybe<SFAPI.Scalars['String']>;
        country?: SFAPI.InputMaybe<SFAPI.CountryCode>;
        language?: SFAPI.InputMaybe<SFAPI.LanguageCode>;
      }>;


      export type CollectionContentQueryQuery = { hero?: SFAPI.Maybe<(
          Pick<SFAPI.Collection, 'id' | 'handle' | 'title' | 'descriptionHtml'>
          & { heading?: SFAPI.Maybe<Pick<SFAPI.Metafield, 'value'>>, byline?: SFAPI.Maybe<Pick<SFAPI.Metafield, 'value'>>, cta?: SFAPI.Maybe<Pick<SFAPI.Metafield, 'value'>>, spread?: SFAPI.Maybe<{ reference?: SFAPI.Maybe<(
              { __typename: 'MediaImage' }
              & Pick<SFAPI.MediaImage, 'id' | 'mediaContentType' | 'alt'>
              & { image?: SFAPI.Maybe<Pick<SFAPI.Image, 'url' | 'width' | 'height'>>, previewImage?: SFAPI.Maybe<Pick<SFAPI.Image, 'url'>> }
            ) | (
              { __typename: 'Video' }
              & Pick<SFAPI.Video, 'id' | 'mediaContentType' | 'alt'>
              & { sources: Array<Pick<SFAPI.VideoSource, 'mimeType' | 'url'>>, previewImage?: SFAPI.Maybe<Pick<SFAPI.Image, 'url'>> }
            ) | {}> }>, spreadSecondary?: SFAPI.Maybe<{ reference?: SFAPI.Maybe<(
              { __typename: 'MediaImage' }
              & Pick<SFAPI.MediaImage, 'id' | 'mediaContentType' | 'alt'>
              & { image?: SFAPI.Maybe<Pick<SFAPI.Image, 'url' | 'width' | 'height'>>, previewImage?: SFAPI.Maybe<Pick<SFAPI.Image, 'url'>> }
            ) | (
              { __typename: 'Video' }
              & Pick<SFAPI.Video, 'id' | 'mediaContentType' | 'alt'>
              & { sources: Array<Pick<SFAPI.VideoSource, 'mimeType' | 'url'>>, previewImage?: SFAPI.Maybe<Pick<SFAPI.Image, 'url'>> }
            ) | {}> }> }
        )>, shop: Pick<SFAPI.Shop, 'name' | 'description'> };

      interface GeneratedQueryTypes {
        \\"#graphql\\\\n  query collectionContentQuery($handle: String, $country: CountryCode, $language: LanguageCode)\\\\n  @inContext(country: $country, language: $language) {\\\\n    hero: collection(handle: $handle) {\\\\n      ...CollectionContent\\\\n    }\\\\n    shop {\\\\n      name\\\\n      description\\\\n    }\\\\n  }\\\\n  #graphql\\\\n  fragment CollectionContent on Collection {\\\\n    id\\\\n    handle\\\\n    title\\\\n    descriptionHtml\\\\n    heading: metafield(namespace: \\\\\\"hero\\\\\\", key: \\\\\\"title\\\\\\") {\\\\n      value\\\\n    }\\\\n    byline: metafield(namespace: \\\\\\"hero\\\\\\", key: \\\\\\"byline\\\\\\") {\\\\n      value\\\\n    }\\\\n    cta: metafield(namespace: \\\\\\"hero\\\\\\", key: \\\\\\"cta\\\\\\") {\\\\n      value\\\\n    }\\\\n    spread: metafield(namespace: \\\\\\"hero\\\\\\", key: \\\\\\"spread\\\\\\") {\\\\n      reference {\\\\n        ...Media\\\\n      }\\\\n    }\\\\n    spreadSecondary: metafield(namespace: \\\\\\"hero\\\\\\", key: \\\\\\"spread_secondary\\\\\\") {\\\\n      reference {\\\\n        ...Media\\\\n      }\\\\n    }\\\\n  }\\\\n  #graphql\\\\n  fragment Media on Media {\\\\n    __typename\\\\n    mediaContentType\\\\n    alt\\\\n    previewImage {\\\\n      url\\\\n    }\\\\n    ... on MediaImage {\\\\n      id\\\\n      image {\\\\n        url\\\\n        width\\\\n        height\\\\n      }\\\\n    }\\\\n    ... on Video {\\\\n      id\\\\n      sources {\\\\n        mimeType\\\\n        url\\\\n      }\\\\n    }\\\\n    ... on Model3d {\\\\n      id\\\\n      sources {\\\\n        mimeType\\\\n        url\\\\n      }\\\\n    }\\\\n    ... on ExternalVideo {\\\\n      id\\\\n      embedUrl\\\\n      host\\\\n    }\\\\n  }\\\\n\\\\n\\\\n\\": {return: CollectionContentQueryQuery, variables: CollectionContentQueryQueryVariables},
      }

      interface GeneratedMutationTypes {
      }

      declare module '@shopify/hydrogen' {
        interface QueryTypes extends GeneratedQueryTypes {}
        interface MutationTypes extends GeneratedMutationTypes {}
      }
      "
    `);
  });
});
