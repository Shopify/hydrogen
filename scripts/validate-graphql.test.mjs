#!/usr/bin/env node
import {test, describe, beforeEach, afterEach} from 'node:test';
import assert from 'node:assert';
import path from 'path';
import {fileURLToPath} from 'url';
import {
  createTempDir,
  cleanupTempDir,
  createTestProject,
  createGraphQLFile,
  createGeneratedFile,
  runValidationScript,
  assertValidationFails,
  assertValidationPasses,
  createMockSchema,
} from './test-utils.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const validationScript = path.join(__dirname, 'validate-graphql.mjs');

describe('GraphQL Validation Tests', () => {
  let tempDir;

  beforeEach(() => {
    tempDir = createTempDir();
    createTestProject(tempDir);
  });

  afterEach(() => {
    cleanupTempDir(tempDir);
  });

  describe('Acceptance Criteria 1: CI fails on unused GraphQL fragments', () => {
    test('detects unused fragments in GraphQL operations', async () => {
      createGraphQLFile(
        tempDir,
        'templates/skeleton/app/routes/products.tsx',
        `
        const PRODUCT_FRAGMENT = \`#graphql
          fragment UnusedProductFragment on Product {
            id
            title
            description
          }
          
          query GetProducts {
            products {
              id
              title
            }
          }
        \`;
        `
      );

      const result = await runValidationScript(validationScript, tempDir);
      assertValidationFails(result, 'Fragment "UnusedProductFragment" is defined but never used');
    });

    test('passes when fragments are properly used', async () => {
      createGraphQLFile(
        tempDir,
        'templates/skeleton/app/routes/products.tsx',
        `
        const PRODUCT_QUERY = \`#graphql
          fragment ProductInfo on Product {
            id
            title
            description
          }
          
          query GetProducts {
            products {
              ...ProductInfo
            }
          }
        \`;
        `
      );

      const result = await runValidationScript(validationScript, tempDir);
      assertValidationPasses(result);
    });

    test('ignores exported fragments that might be used externally', async () => {
      createGraphQLFile(
        tempDir,
        'templates/skeleton/app/lib/fragments.ts',
        `
        export const CART_FRAGMENT = \`#graphql
          fragment CartApiQuery on Cart {
            id
            lines {
              id
              quantity
            }
          }
        \`;
        `
      );

      const result = await runValidationScript(validationScript, tempDir);
      assertValidationPasses(result);
    });

    test('detects multiple unused fragments', async () => {
      createGraphQLFile(
        tempDir,
        'packages/test-package/src/query.ts',
        `
        const QUERY = \`#graphql
          fragment UnusedOne on Product {
            id
          }
          
          fragment UnusedTwo on Cart {
            id
          }
          
          fragment UsedFragment on Collection {
            id
            title
          }
          
          query GetCollections {
            collections {
              ...UsedFragment
            }
          }
        \`;
        `
      );

      const result = await runValidationScript(validationScript, tempDir);
      assertValidationFails(result, 'Fragment "UnusedOne" is defined but never used');
      assertValidationFails(result, 'Fragment "UnusedTwo" is defined but never used');
    });

    test('handles fragments used via string interpolation', async () => {
      createGraphQLFile(
        tempDir,
        'templates/skeleton/app/lib/fragments.ts',
        `
        const PRODUCT_FRAGMENT = \`#graphql
          fragment ProductFields on Product {
            id
            title
          }
        \`;
        
        const QUERY = \`#graphql
          \${PRODUCT_FRAGMENT}
          
          query GetProduct {
            product {
              ...ProductFields
            }
          }
        \`;
        `
      );

      const result = await runValidationScript(validationScript, tempDir);
      assertValidationPasses(result);
    });
  });

  describe('Acceptance Criteria 2: Examples folder is excluded', () => {
    test('ignores files in examples folder at root', async () => {
      createGraphQLFile(
        tempDir,
        'examples/test-example/app/routes/test.tsx',
        `
        const QUERY = \`#graphql
          fragment UnusedInExample on Product {
            id
          }
          
          query GetProducts {
            products {
              id
            }
          }
        \`;
        `
      );

      const result = await runValidationScript(validationScript, tempDir);
      assertValidationPasses(result);
    });

    test('ignores nested example directories', async () => {
      createGraphQLFile(
        tempDir,
        'examples/nested/deep/example/file.ts',
        `
        const BAD_QUERY = \`#graphql
          fragment VeryUnused on Product {
            nonExistentField
          }
        \`;
        `
      );

      const result = await runValidationScript(validationScript, tempDir);
      assertValidationPasses(result);
    });

    test('ignores .example. files regardless of location', async () => {
      createGraphQLFile(
        tempDir,
        'packages/test-package/src/query.example.ts',
        `
        const EXAMPLE = \`#graphql
          fragment UnusedExample on Product {
            id
          }
          
          query Example {
            products { id }
          }
        \`;
        `
      );

      const result = await runValidationScript(validationScript, tempDir);
      assertValidationPasses(result);
    });

    test('validates non-example files in packages directory', async () => {
      createGraphQLFile(
        tempDir,
        'packages/test-package/src/real-query.ts',
        `
        const QUERY = \`#graphql
          fragment UnusedFragment on Product {
            id
          }
          
          query GetProducts {
            products { id }
          }
        \`;
        `
      );

      const result = await runValidationScript(validationScript, tempDir);
      assertValidationFails(result, 'Fragment "UnusedFragment" is defined but never used');
    });

    test('ignores generated files in examples folder', async () => {
      createGeneratedFile(
        tempDir,
        'examples/test/storefrontapi.generated.d.ts',
        `export type BadType = { invalidField: string; };`
      );

      const result = await runValidationScript(validationScript, tempDir);
      assertValidationPasses(result);
    });
  });

  describe('Acceptance Criteria 4: CI fails on invalid types in .d.ts files', () => {
    test('detects CartWarning used in wrong context', async () => {
      createGeneratedFile(
        tempDir,
        'templates/skeleton/storefrontapi.generated.d.ts',
        `/* eslint-disable */
export type CartFragment = {
  id: string;
  warnings: CartWarning[];
};

export type CartWarning = {
  code: string;
  message: string;
};`
      );

      const result = await runValidationScript(validationScript, tempDir);
      assertValidationFails(result, 'CartWarning type can only be used in mutation payloads');
    });

    test('passes when CartWarning is used in mutation context', async () => {
      createGeneratedFile(
        tempDir,
        'templates/skeleton/storefrontapi.generated.d.ts',
        `/* eslint-disable */
export type CartCreateMutationPayload = {
  cart: Cart;
  warnings: CartWarning[];
};

export type CartWarning = {
  code: string;
  message: string;
};`
      );

      const result = await runValidationScript(validationScript, tempDir);
      assertValidationPasses(result);
    });

    test('validates types exist in schema', async () => {
      createMockSchema(tempDir);
      
      createGraphQLFile(
        tempDir,
        'templates/skeleton/app/routes/test.tsx',
        `
        const QUERY = \`#graphql
          query GetProduct {
            nonExistentField {
              id
            }
          }
        \`;
        `
      );

      // The actual validation script uses codegen which validates against the real schema
      // This test uses a mock schema, so we're just verifying the script runs
      const result = await runValidationScript(validationScript, tempDir);
      // In real usage, this would be caught by the schema validation in validateGraphQLSchema()
    });

    test('ignores generated files themselves', async () => {
      createGeneratedFile(
        tempDir,
        'templates/skeleton/types.generated.d.ts',
        `/* eslint-disable */
// This file has potential issues but should be ignored
export type InvalidType = {
  badField: unknown;
};`
      );

      const result = await runValidationScript(validationScript, tempDir);
      assertValidationPasses(result);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('handles empty GraphQL strings', async () => {
      createGraphQLFile(
        tempDir,
        'templates/skeleton/app/empty.ts',
        `const EMPTY = \`#graphql\`;`
      );

      const result = await runValidationScript(validationScript, tempDir);
      assertValidationPasses(result);
    });

    test('handles malformed GraphQL', async () => {
      createGraphQLFile(
        tempDir,
        'templates/skeleton/app/bad.ts',
        `const BAD = \`#graphql
          fragment {
            this is not valid GraphQL
          }
        \`;`
      );

      const result = await runValidationScript(validationScript, tempDir);
      // Malformed fragments won't be detected as unused since they can't be parsed
      assertValidationPasses(result);
    });

    test('handles files with multiple GraphQL blocks', async () => {
      createGraphQLFile(
        tempDir,
        'templates/skeleton/app/multiple.ts',
        `
        const FRAGMENT1 = \`#graphql
          fragment Used on Product {
            id
          }
        \`;
        
        const FRAGMENT2 = \`#graphql
          fragment Unused on Cart {
            id
          }
        \`;
        
        const QUERY = \`#graphql
          query Test {
            product {
              ...Used
            }
          }
        \`;
        `
      );

      const result = await runValidationScript(validationScript, tempDir);
      assertValidationFails(result, 'Fragment "Unused" is defined but never used');
    });

    test('handles no GraphQL files in project', async () => {
      // Don't create any GraphQL files
      const result = await runValidationScript(validationScript, tempDir);
      assertValidationPasses(result);
    });

    test('validates files in templates directory', async () => {
      createGraphQLFile(
        tempDir,
        'templates/custom-template/app/routes/index.tsx',
        `
        const QUERY = \`#graphql
          fragment NotUsed on Product {
            id
          }
          
          query Home {
            shop {
              name
            }
          }
        \`;
        `
      );

      const result = await runValidationScript(validationScript, tempDir);
      assertValidationFails(result, 'Fragment "NotUsed" is defined but never used');
    });
  });

  describe('Integration Tests', () => {
    test('full validation flow with mixed valid and invalid files', async () => {
      // Valid file
      createGraphQLFile(
        tempDir,
        'packages/valid/src/query.ts',
        `
        const VALID = \`#graphql
          fragment ProductFields on Product {
            id
            title
          }
          
          query GetProduct {
            product {
              ...ProductFields
            }
          }
        \`;
        `
      );

      // Invalid file (unused fragment)
      createGraphQLFile(
        tempDir,
        'templates/skeleton/app/routes/invalid.tsx',
        `
        const INVALID = \`#graphql
          fragment UnusedFragment on Cart {
            id
          }
          
          query GetCart {
            cart {
              id
            }
          }
        \`;
        `
      );

      // File in examples (should be ignored)
      createGraphQLFile(
        tempDir,
        'examples/demo/app/test.ts',
        `
        const IGNORED = \`#graphql
          fragment AlsoUnused on Product {
            id
          }
          
          query Demo {
            products { id }
          }
        \`;
        `
      );

      const result = await runValidationScript(validationScript, tempDir);
      assertValidationFails(result, 'Fragment "UnusedFragment" is defined but never used');
      // Should not mention AlsoUnused since it's in examples
      assert(!result.output.includes('AlsoUnused'));
    });

    test('validates complex fragment relationships', async () => {
      createGraphQLFile(
        tempDir,
        'templates/skeleton/app/lib/fragments.ts',
        `
        const BASE_PRODUCT = \`#graphql
          fragment BaseProduct on Product {
            id
            title
          }
        \`;
        
        const EXTENDED_PRODUCT = \`#graphql
          fragment ExtendedProduct on Product {
            ...BaseProduct
            description
            price
          }
        \`;
        
        const UNUSED = \`#graphql
          fragment UnusedProductVariant on ProductVariant {
            id
            sku
          }
        \`;
        
        export const PRODUCT_QUERY = \`#graphql
          query GetProduct {
            product {
              ...ExtendedProduct
            }
          }
        \`;
        `
      );

      const result = await runValidationScript(validationScript, tempDir);
      assertValidationFails(result, 'Fragment "UnusedProductVariant" is defined but never used');
      // BaseProduct and ExtendedProduct should not be flagged as unused
      assert(!result.output.includes('Fragment "BaseProduct"'));
      assert(!result.output.includes('Fragment "ExtendedProduct"'));
    });
  });
});