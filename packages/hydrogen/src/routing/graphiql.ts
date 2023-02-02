import type {LoaderArgs} from '@remix-run/server-runtime';
import type {I18nBase, StorefrontClient} from '../storefront';

export function graphiqlLoader(
  {context} = {} as LoaderArgs & {
    context: LoaderArgs['context'] & StorefrontClient<I18nBase>;
  },
) {
  if (!context?.storefront) {
    throw new Error(
      `GraphiQL: Hydrogen's storefront client must be injected in the loader context.`,
    );
  }

  const url = context.storefront.getApiUrl();
  const accessToken =
    context.storefront.getPublicTokenHeaders()[
      'X-Shopify-Storefront-Access-Token'
    ];

  return new Response(
    `
<!DOCTYPE html>
<html lang="en">
  <head>
    <title>GraphiQL</title>
    <style>
      body {
        height: 100%;
        margin: 0;
        width: 100%;
        overflow: hidden;
      }

      #graphiql {
        height: 100vh;
      }
    </style>

    <script
      src="https://unpkg.com/react@17/umd/react.development.js"
      integrity="sha512-Vf2xGDzpqUOEIKO+X2rgTLWPY+65++WPwCHkX2nFMu9IcstumPsf/uKKRd5prX3wOu8Q0GBylRpsDB26R6ExOg=="
      crossorigin="anonymous"
    ></script>
    <script
      src="https://unpkg.com/react-dom@17/umd/react-dom.development.js"
      integrity="sha512-Wr9OKCTtq1anK0hq5bY3X/AvDI5EflDSAh0mE9gma+4hl+kXdTJPKZ3TwLMBcrgUeoY0s3dq9JjhCQc7vddtFg=="
      crossorigin="anonymous"
    ></script>
    <link rel="stylesheet" href="https://unpkg.com/graphiql/graphiql.min.css" />
  </head>

  <body>
    <div id="graphiql">Loading...</div>
    <script
      src="https://unpkg.com/graphiql/graphiql.min.js"
      type="application/javascript"
    ></script>
    <script>
      ReactDOM.render(
        React.createElement(GraphiQL, {
          fetcher: GraphiQL.createFetcher({
            url: '${url}',
            headers: {
              'X-Shopify-Storefront-Access-Token': '${accessToken}',
            }
          }),
          defaultEditorToolsVisibility: true,
          initialTabs: [{query: '{\\n  shop {\\n    name\\n  }\\n}'}]
        }),
        document.getElementById('graphiql'),
      );
    </script>
  </body>
</html>
  `,
    {status: 200, headers: {'content-type': 'text/html'}},
  );
}
