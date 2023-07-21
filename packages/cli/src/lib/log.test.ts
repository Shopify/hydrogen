import {fileURLToPath} from 'node:url';
import {describe, it, expect, afterEach, beforeEach, afterAll} from 'vitest';
import {mockAndCaptureOutput} from '@shopify/cli-kit/node/testing/output';
import {resetAllLogs, enhanceH2Logs} from './log.js';

describe('log replacer', () => {
  describe('enhanceH2Logs', () => {
    const graphiqlUrl = 'http://localhost:3000/graphiql';
    const rootDirectory = fileURLToPath(import.meta.url);
    const outputMock = mockAndCaptureOutput();

    beforeEach(() => {
      resetAllLogs();
      outputMock.clear();
    });

    afterAll(() => {
      resetAllLogs();
      outputMock.clear();
    });

    describe('enhances h2:info pattern', () => {
      it('renders in an info banner', () => {
        enhanceH2Logs({graphiqlUrl, rootDirectory});

        console.warn('[h2:info:storefront.query] Tip');

        const message = outputMock.info();
        expect(message).not.toMatch('h2');
        expect(message).toMatch('info');
        expect(message).toMatch("In Hydrogen's `storefront.query`");
        expect(message).toMatch('Tip');
      });
    });

    describe('enhances h2:warn pattern', () => {
      it('renders in a warning banner', () => {
        enhanceH2Logs({graphiqlUrl, rootDirectory});

        console.warn('[h2:warn:storefront.query] Wrong query 1');

        const warning = outputMock.warn();
        expect(warning).not.toMatch('h2');
        expect(warning).toMatch('warning');
        expect(warning).toMatch("In Hydrogen's `storefront.query`");
        expect(warning).toMatch('Wrong query');
      });

      it('shows links from the last line as a list', () => {
        enhanceH2Logs({graphiqlUrl, rootDirectory});

        console.warn(
          '[h2:warn:storefront.query] Wrong query.\nhttps://docs.com/something',
        );

        const warning = outputMock.warn();
        expect(warning).toMatch(
          /\s+Reference:?\s+.+?\s+https?:\/\/docs\.com\/something\s/is,
        );
      });
    });

    describe('enhances h2:error pattern', () => {
      it('renders in an error banner', () => {
        enhanceH2Logs({graphiqlUrl, rootDirectory});

        console.error(new Error('[h2:error:storefront.query] Wrong query 2'));

        const error = outputMock.error();
        // Stack trace includes 'h2'
        expect(error.split('stack trace:')[0]).not.toMatch('h2');
        expect(error).toMatch('error');
        expect(error).toMatch("In Hydrogen's `storefront.query`");
        expect(error).toMatch('Wrong query');
      });

      it('shows a GraphiQL link when the error is related to a GraphQL query', () => {
        enhanceH2Logs({graphiqlUrl, rootDirectory});

        console.error(
          new Error('[h2:error:storefront.query] Wrong query 3', {
            cause: {
              graphql: {query: 'query test {}', variables: '{"var1": true}'},
            },
          }),
        );

        const error = outputMock.error();
        expect(error).toMatch('GraphiQL');
        expect((error.match(/\s+GraphiQL\s+\(\s+([^\)]+)\s+\)/) ?? [])[1])
          .toMatchInlineSnapshot(`
          "http://localhost:3000/grap  │
          │  hiql?query=query%20test%20%7B%7D&variables=%7B%22var1%22%3A%20true%7D"
        `);
      });

      it('trims stack traces when the error is related to a GraphQL query', () => {
        enhanceH2Logs({graphiqlUrl, rootDirectory});

        console.error(
          new Error('[h2:error:storefront.query] Wrong query 4', {
            cause: {graphql: {query: 'query test {}'}},
          }),
        );

        const error = outputMock.error();
        const stack = error.split('stack trace:')[1] ?? '';
        const shortenedAppDir = rootDirectory.split('/cli/').pop()!;
        expect(stack).toMatch(shortenedAppDir);
        expect(stack).not.toMatch('node_modules');
      });
    });
  });
});
