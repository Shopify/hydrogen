/* eslint-disable */
import * as types from './graphql';
import { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';

/**
 * Map of all GraphQL operations in the project.
 *
 * This map has several performance disadvantages:
 * 1. It is not tree-shakeable, so it will include all operations in the project.
 * 2. It is not minifiable, so the string of a GraphQL query will be multiple times inside the bundle.
 * 3. It does not support dead code elimination, so it will add unused operations.
 *
 * Therefore it is highly recommended to use the babel-plugin for production.
 */
const documents = {
    "\n  query Collection($handle: String!) {\n    collection(handle: $handle) {\n      id\n      handle\n      title\n      description\n    }\n  }\n": types.CollectionDocument,
    "\n  query IndexQuery {\n    shop {\n      name\n    }\n    products(first: 1) {\n      nodes {\n        # if you uncomment 'blah', it should have a GraphQL validation error in your IDE if you have a GraphQL plugin. It should also give an error during 'npm run dev'\n        # blah\n        id\n        title\n        publishedAt\n        handle\n        variants(first: 1) {\n          nodes {\n            id\n            image {\n              url\n              altText\n              width\n              height\n            }\n          }\n        }\n      }\n    }\n  }\n": types.IndexQueryDocument,
    "\n  query Product {\n    shop {\n      name\n    }\n    products(first: 1) {\n      nodes {\n        # if you uncomment 'blah', it should have a GraphQL validation error in your IDE if you have a GraphQL plugin. It should also give an error during 'npm run dev'\n        # blah\n        id\n        title\n        vendor\n        publishedAt\n        handle\n        variants(first: 1) {\n          nodes {\n            id\n            title\n            price {\n              amount\n            }\n            image {\n              url\n              altText\n              width\n              height\n            }\n          }\n        }\n      }\n    }\n  }\n": types.ProductDocument,
    "\n  query Search($searchTerm: String) {\n    products(first: 1, sortKey: RELEVANCE, query: $searchTerm) {\n      pageInfo {\n        startCursor\n        endCursor\n        hasNextPage\n        hasPreviousPage\n      }\n    }\n  }\n": types.SearchDocument,
};

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 *
 *
 * @example
 * ```ts
 * const query = gql(`query GetUser($id: ID!) { user(id: $id) { name } }`);
 * ```
 *
 * The query argument is unknown!
 * Please regenerate the types.
 */
export function graphql(source: string): unknown;

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query Collection($handle: String!) {\n    collection(handle: $handle) {\n      id\n      handle\n      title\n      description\n    }\n  }\n"): (typeof documents)["\n  query Collection($handle: String!) {\n    collection(handle: $handle) {\n      id\n      handle\n      title\n      description\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query IndexQuery {\n    shop {\n      name\n    }\n    products(first: 1) {\n      nodes {\n        # if you uncomment 'blah', it should have a GraphQL validation error in your IDE if you have a GraphQL plugin. It should also give an error during 'npm run dev'\n        # blah\n        id\n        title\n        publishedAt\n        handle\n        variants(first: 1) {\n          nodes {\n            id\n            image {\n              url\n              altText\n              width\n              height\n            }\n          }\n        }\n      }\n    }\n  }\n"): (typeof documents)["\n  query IndexQuery {\n    shop {\n      name\n    }\n    products(first: 1) {\n      nodes {\n        # if you uncomment 'blah', it should have a GraphQL validation error in your IDE if you have a GraphQL plugin. It should also give an error during 'npm run dev'\n        # blah\n        id\n        title\n        publishedAt\n        handle\n        variants(first: 1) {\n          nodes {\n            id\n            image {\n              url\n              altText\n              width\n              height\n            }\n          }\n        }\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query Product {\n    shop {\n      name\n    }\n    products(first: 1) {\n      nodes {\n        # if you uncomment 'blah', it should have a GraphQL validation error in your IDE if you have a GraphQL plugin. It should also give an error during 'npm run dev'\n        # blah\n        id\n        title\n        vendor\n        publishedAt\n        handle\n        variants(first: 1) {\n          nodes {\n            id\n            title\n            price {\n              amount\n            }\n            image {\n              url\n              altText\n              width\n              height\n            }\n          }\n        }\n      }\n    }\n  }\n"): (typeof documents)["\n  query Product {\n    shop {\n      name\n    }\n    products(first: 1) {\n      nodes {\n        # if you uncomment 'blah', it should have a GraphQL validation error in your IDE if you have a GraphQL plugin. It should also give an error during 'npm run dev'\n        # blah\n        id\n        title\n        vendor\n        publishedAt\n        handle\n        variants(first: 1) {\n          nodes {\n            id\n            title\n            price {\n              amount\n            }\n            image {\n              url\n              altText\n              width\n              height\n            }\n          }\n        }\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query Search($searchTerm: String) {\n    products(first: 1, sortKey: RELEVANCE, query: $searchTerm) {\n      pageInfo {\n        startCursor\n        endCursor\n        hasNextPage\n        hasPreviousPage\n      }\n    }\n  }\n"): (typeof documents)["\n  query Search($searchTerm: String) {\n    products(first: 1, sortKey: RELEVANCE, query: $searchTerm) {\n      pageInfo {\n        startCursor\n        endCursor\n        hasNextPage\n        hasPreviousPage\n      }\n    }\n  }\n"];

export function graphql(source: string) {
  return (documents as any)[source] ?? {};
}

export type DocumentType<TDocumentNode extends DocumentNode<any, any>> = TDocumentNode extends DocumentNode<  infer TType,  any>  ? TType  : never;