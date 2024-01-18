import {describe, it, expect} from 'vitest';
import path from 'node:path';

describe('Hydrogen Codegen', async () => {
  // Patch dependency before importing the Codegen CLI
  await import('../src/patch.js');
  const {preset, getSchema, pluckConfig} = await import('../src/index.js');
  const {getDefaultOptions} = await import('../src/defaults.js');
  const {executeCodegen} = await import('@graphql-codegen/cli');

  const getCodegenOptions = (fixture: string, output = 'out.d.ts') => ({
    pluckConfig: pluckConfig as any,
    documents: path.join(__dirname, `fixtures/${fixture}`),
    generates: {
      [output]: {
        preset,
        schema: getSchema('storefront'),
        presetConfig: {},
      },
    },
  });

  it('requires .d.ts extension', async () => {
    await expect(
      executeCodegen(getCodegenOptions('simple-operations.ts', 'out')),
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `[AggregateError: [hydrogen-preset] target output should be a .d.ts file]`,
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
      `import * as StorefrontAPI from '@shopify/hydrogen/storefront-api-types';`,
    );

    // Uses Pick<...>
    expect(generatedCode).toMatch(`Pick<StorefrontAPI.`);

    // Generates query and mutation types
    expect(generatedCode).toMatch(
      /interface GeneratedQueryTypes \{\s+"#graphql/,
    );
    expect(generatedCode).toMatch(
      /interface GeneratedMutationTypes \{\s+"#graphql/,
    );

    // Augments query/mutation types
    expect(generatedCode).toMatch(getDefaultOptions().interfaceExtensionCode);

    expect(generatedCode).toMatchInlineSnapshot(`
      "/* eslint-disable eslint-comments/disable-enable-pair */
      /* eslint-disable eslint-comments/no-unlimited-disable */
      /* eslint-disable */
      import * as StorefrontAPI from '@shopify/hydrogen/storefront-api-types';

      export type LayoutQueryVariables = StorefrontAPI.Exact<{ [key: string]: never; }>;


      export type LayoutQuery = { shop: Pick<StorefrontAPI.Shop, 'name' | 'description'> };

      export type CartCreateMutationVariables = StorefrontAPI.Exact<{
        input: StorefrontAPI.CartInput;
      }>;


      export type CartCreateMutation = { cartCreate?: StorefrontAPI.Maybe<{ cart?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Cart, 'id'>> }> };

      interface GeneratedQueryTypes {
        "#graphql\\n  query layout {\\n    shop {\\n      name\\n      description\\n    }\\n  }\\n": {return: LayoutQuery, variables: LayoutQueryVariables},
      }

      interface GeneratedMutationTypes {
        "#graphql\\n  mutation cartCreate($input: CartInput!) {\\n    cartCreate(input: $input) {\\n      cart {\\n        id\\n      }\\n    }\\n  }\\n": {return: CartCreateMutation, variables: CartCreateMutationVariables},
      }

      declare module '@shopify/hydrogen' {
        interface StorefrontQueries extends GeneratedQueryTypes {}
        interface StorefrontMutations extends GeneratedMutationTypes {}
      }
      "
    `);
  });

  it('generates types for complex queries with fragments, directives and variables', async () => {
    const result = await executeCodegen(
      getCodegenOptions('complex-operations.ts'),
    );

    expect(result).toHaveLength(1);

    const generatedCode = result.find(
      (file) => file.filename === 'out.d.ts',
    )!.content;

    expect(generatedCode).toMatchInlineSnapshot(`
      "/* eslint-disable eslint-comments/disable-enable-pair */
      /* eslint-disable eslint-comments/no-unlimited-disable */
      /* eslint-disable */
      import * as StorefrontAPI from '@shopify/hydrogen/storefront-api-types';

      type Media_ExternalVideo_Fragment = (
        { __typename: 'ExternalVideo' }
        & Pick<StorefrontAPI.ExternalVideo, 'id' | 'embedUrl' | 'host' | 'mediaContentType' | 'alt'>
        & { previewImage?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Image, 'url'>> }
      );

      type Media_MediaImage_Fragment = (
        { __typename: 'MediaImage' }
        & Pick<StorefrontAPI.MediaImage, 'id' | 'mediaContentType' | 'alt'>
        & { image?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Image, 'url' | 'width' | 'height'>>, previewImage?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Image, 'url'>> }
      );

      type Media_Model3d_Fragment = (
        { __typename: 'Model3d' }
        & Pick<StorefrontAPI.Model3d, 'id' | 'mediaContentType' | 'alt'>
        & { sources: Array<Pick<StorefrontAPI.Model3dSource, 'mimeType' | 'url'>>, previewImage?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Image, 'url'>> }
      );

      type Media_Video_Fragment = (
        { __typename: 'Video' }
        & Pick<StorefrontAPI.Video, 'id' | 'mediaContentType' | 'alt'>
        & { sources: Array<Pick<StorefrontAPI.VideoSource, 'mimeType' | 'url'>>, previewImage?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Image, 'url'>> }
      );

      export type MediaFragment = Media_ExternalVideo_Fragment | Media_MediaImage_Fragment | Media_Model3d_Fragment | Media_Video_Fragment;

      export type CollectionContentFragment = (
        Pick<StorefrontAPI.Collection, 'id' | 'handle' | 'title' | 'descriptionHtml'>
        & { heading?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Metafield, 'value'>>, byline?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Metafield, 'value'>>, cta?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Metafield, 'value'>>, spread?: StorefrontAPI.Maybe<{ reference?: StorefrontAPI.Maybe<(
            { __typename: 'MediaImage' }
            & Pick<StorefrontAPI.MediaImage, 'id' | 'mediaContentType' | 'alt'>
            & { image?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Image, 'url' | 'width' | 'height'>>, previewImage?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Image, 'url'>> }
          ) | (
            { __typename: 'Video' }
            & Pick<StorefrontAPI.Video, 'id' | 'mediaContentType' | 'alt'>
            & { sources: Array<Pick<StorefrontAPI.VideoSource, 'mimeType' | 'url'>>, previewImage?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Image, 'url'>> }
          )> }>, spreadSecondary?: StorefrontAPI.Maybe<{ reference?: StorefrontAPI.Maybe<(
            { __typename: 'MediaImage' }
            & Pick<StorefrontAPI.MediaImage, 'id' | 'mediaContentType' | 'alt'>
            & { image?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Image, 'url' | 'width' | 'height'>>, previewImage?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Image, 'url'>> }
          ) | (
            { __typename: 'Video' }
            & Pick<StorefrontAPI.Video, 'id' | 'mediaContentType' | 'alt'>
            & { sources: Array<Pick<StorefrontAPI.VideoSource, 'mimeType' | 'url'>>, previewImage?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Image, 'url'>> }
          )> }> }
      );

      export type CollectionContentTestQueryVariables = StorefrontAPI.Exact<{
        handle?: StorefrontAPI.InputMaybe<StorefrontAPI.Scalars['String']['input']>;
        country?: StorefrontAPI.InputMaybe<StorefrontAPI.CountryCode>;
        language?: StorefrontAPI.InputMaybe<StorefrontAPI.LanguageCode>;
      }>;


      export type CollectionContentTestQuery = { hero?: StorefrontAPI.Maybe<(
          Pick<StorefrontAPI.Collection, 'id' | 'handle' | 'title' | 'descriptionHtml'>
          & { heading?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Metafield, 'value'>>, byline?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Metafield, 'value'>>, cta?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Metafield, 'value'>>, spread?: StorefrontAPI.Maybe<{ reference?: StorefrontAPI.Maybe<(
              { __typename: 'MediaImage' }
              & Pick<StorefrontAPI.MediaImage, 'id' | 'mediaContentType' | 'alt'>
              & { image?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Image, 'url' | 'width' | 'height'>>, previewImage?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Image, 'url'>> }
            ) | (
              { __typename: 'Video' }
              & Pick<StorefrontAPI.Video, 'id' | 'mediaContentType' | 'alt'>
              & { sources: Array<Pick<StorefrontAPI.VideoSource, 'mimeType' | 'url'>>, previewImage?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Image, 'url'>> }
            )> }>, spreadSecondary?: StorefrontAPI.Maybe<{ reference?: StorefrontAPI.Maybe<(
              { __typename: 'MediaImage' }
              & Pick<StorefrontAPI.MediaImage, 'id' | 'mediaContentType' | 'alt'>
              & { image?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Image, 'url' | 'width' | 'height'>>, previewImage?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Image, 'url'>> }
            ) | (
              { __typename: 'Video' }
              & Pick<StorefrontAPI.Video, 'id' | 'mediaContentType' | 'alt'>
              & { sources: Array<Pick<StorefrontAPI.VideoSource, 'mimeType' | 'url'>>, previewImage?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Image, 'url'>> }
            )> }> }
        )>, shop: Pick<StorefrontAPI.Shop, 'name' | 'description'> };

      interface GeneratedQueryTypes {
        "#graphql\\n  query collectionContentTest($handle: String, $country: CountryCode, $language: LanguageCode)\\n  @inContext(country: $country, language: $language) {\\n    hero: collection(handle: $handle) {\\n      ...CollectionContent\\n    }\\n    shop {\\n      name\\n      description\\n    }\\n  }\\n  #graphql\\n  fragment CollectionContent on Collection {\\n    id\\n    handle\\n    title\\n    descriptionHtml\\n    heading: metafield(namespace: \\"hero\\", key: \\"title\\") {\\n      value\\n    }\\n    byline: metafield(namespace: \\"hero\\", key: \\"byline\\") {\\n      value\\n    }\\n    cta: metafield(namespace: \\"hero\\", key: \\"cta\\") {\\n      value\\n    }\\n    spread: metafield(namespace: \\"hero\\", key: \\"spread\\") {\\n      reference {\\n        ...Media\\n      }\\n    }\\n    spreadSecondary: metafield(namespace: \\"hero\\", key: \\"spread_secondary\\") {\\n      reference {\\n        ...Media\\n      }\\n    }\\n  }\\n  #graphql\\n  fragment Media on Media {\\n    __typename\\n    mediaContentType\\n    alt\\n    previewImage {\\n      url\\n    }\\n    ... on MediaImage {\\n      id\\n      image {\\n        url\\n        width\\n        height\\n      }\\n    }\\n    ... on Video {\\n      id\\n      sources {\\n        mimeType\\n        url\\n      }\\n    }\\n    ... on Model3d {\\n      id\\n      sources {\\n        mimeType\\n        url\\n      }\\n    }\\n    ... on ExternalVideo {\\n      id\\n      embedUrl\\n      host\\n    }\\n  }\\n\\n\\n": {return: CollectionContentTestQuery, variables: CollectionContentTestQueryVariables},
      }

      interface GeneratedMutationTypes {
      }

      declare module '@shopify/hydrogen' {
        interface StorefrontQueries extends GeneratedQueryTypes {}
        interface StorefrontMutations extends GeneratedMutationTypes {}
      }
      "
    `);
  });

  it('generates types for mixed queries using suffixes', async () => {
    const codegenConfig = getCodegenOptions(
      'mixed-operations.ts',
      'storefront.out.d.ts',
    );

    codegenConfig.generates['customer-account.out.d.ts'] = {
      preset,
      schema: getSchema('customer-account'),
      presetConfig: {
        gqlSuffix: 'customer',
      },
    };

    const result = await executeCodegen(codegenConfig);

    expect(result).toHaveLength(2);

    const generatedStorefrontCode = result.find(
      (file) => file.filename === 'storefront.out.d.ts',
    )!.content;

    const generatedCustomerAccountCode = result.find(
      (file) => file.filename === 'customer-account.out.d.ts',
    )!.content;

    expect(generatedStorefrontCode).toMatchInlineSnapshot(`
      "/* eslint-disable eslint-comments/disable-enable-pair */
      /* eslint-disable eslint-comments/no-unlimited-disable */
      /* eslint-disable */
      import * as StorefrontAPI from '@shopify/hydrogen/storefront-api-types';

      export type ShopIdQueryVariables = StorefrontAPI.Exact<{ [key: string]: never; }>;


      export type ShopIdQuery = { shop: Pick<StorefrontAPI.Shop, 'id'> };

      export type ShopNameQueryVariables = StorefrontAPI.Exact<{ [key: string]: never; }>;


      export type ShopNameQuery = { shop: Pick<StorefrontAPI.Shop, 'name'> };

      interface GeneratedQueryTypes {
        "#graphql\\n  query ShopId {\\n    shop {\\n      id\\n    }\\n  }\\n": {return: ShopIdQuery, variables: ShopIdQueryVariables},
        "\\n  query ShopName {\\n    shop {\\n      name\\n    }\\n  }\\n": {return: ShopNameQuery, variables: ShopNameQueryVariables},
      }

      interface GeneratedMutationTypes {
      }

      declare module '@shopify/hydrogen' {
        interface StorefrontQueries extends GeneratedQueryTypes {}
        interface StorefrontMutations extends GeneratedMutationTypes {}
      }
      "
    `);

    expect(generatedCustomerAccountCode).toMatchInlineSnapshot(`
      "/* eslint-disable eslint-comments/disable-enable-pair */
      /* eslint-disable eslint-comments/no-unlimited-disable */
      /* eslint-disable */
      import * as CustomerAccountAPI from '@shopify/hydrogen/customer-account-api-types';

      export type CustomerNameQueryVariables = CustomerAccountAPI.Exact<{ [key: string]: never; }>;


      export type CustomerNameQuery = { customer: Pick<CustomerAccountAPI.Customer, 'firstName'> };

      interface GeneratedQueryTypes {
        "#graphql:customer\\n  query CustomerName {\\n    customer {\\n      firstName\\n    }\\n  }\\n": {return: CustomerNameQuery, variables: CustomerNameQueryVariables},
      }

      interface GeneratedMutationTypes {
      }

      declare module '@shopify/hydrogen' {
        interface CustomerAccountQueries extends GeneratedQueryTypes {}
        interface CustomerAccountMutations extends GeneratedMutationTypes {}
      }
      "
    `);
  });
});
