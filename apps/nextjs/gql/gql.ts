/* eslint-disable */
import * as types from './graphql';
import { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';

const documents = {
    "\n  query IndexQuery {\n    shop {\n      name\n    }\n    products(first: 1) {\n      nodes {\n        # if you uncomment 'blah', it should have a GraphQL validation error in your IDE if you have a GraphQL plugin. It should also give an error during 'npm run dev'\n        # blah\n        id\n        title\n        publishedAt\n        handle\n        variants(first: 1) {\n          nodes {\n            id\n            image {\n              url\n              altText\n              width\n              height\n            }\n          }\n        }\n      }\n    }\n  }\n": types.IndexQueryDocument,
};

export function graphql(source: "\n  query IndexQuery {\n    shop {\n      name\n    }\n    products(first: 1) {\n      nodes {\n        # if you uncomment 'blah', it should have a GraphQL validation error in your IDE if you have a GraphQL plugin. It should also give an error during 'npm run dev'\n        # blah\n        id\n        title\n        publishedAt\n        handle\n        variants(first: 1) {\n          nodes {\n            id\n            image {\n              url\n              altText\n              width\n              height\n            }\n          }\n        }\n      }\n    }\n  }\n"): (typeof documents)["\n  query IndexQuery {\n    shop {\n      name\n    }\n    products(first: 1) {\n      nodes {\n        # if you uncomment 'blah', it should have a GraphQL validation error in your IDE if you have a GraphQL plugin. It should also give an error during 'npm run dev'\n        # blah\n        id\n        title\n        publishedAt\n        handle\n        variants(first: 1) {\n          nodes {\n            id\n            image {\n              url\n              altText\n              width\n              height\n            }\n          }\n        }\n      }\n    }\n  }\n"];

export function graphql(source: string): unknown;
export function graphql(source: string) {
  return (documents as any)[source] ?? {};
}

export type DocumentType<TDocumentNode extends DocumentNode<any, any>> = TDocumentNode extends DocumentNode<  infer TType,  any>  ? TType  : never;