import type {LoaderArgs} from '@remix-run/server-runtime';
import type {Storefront} from '../storefront';

type GraphiQLLoader = (args: LoaderArgs) => Promise<Response>;

export const graphiqlLoader: GraphiQLLoader = async function graphiqlLoader({
  context,
}: LoaderArgs) {
  const storefront = context?.storefront as Storefront | undefined;
  if (!storefront) {
    throw new Error(
      `GraphiQL: Hydrogen's storefront client must be injected in the loader context.`,
    );
  }

  const url = storefront.getApiUrl();
  const accessToken =
    storefront.getPublicTokenHeaders()['X-Shopify-Storefront-Access-Token'];

  // GraphiQL icon from their GitHub repo
  const favicon = `https://avatars.githubusercontent.com/u/12972006?s=48&v=4`;

  return new Response(
    `
<!DOCTYPE html>
<html lang="en">
  <head>
    <title>GraphiQL</title>
    <link rel="icon" type="image/x-icon" href="${favicon}">
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
      crossorigin
      src="https://unpkg.com/react@18/umd/react.development.js"
    ></script>
    <script
      crossorigin
      src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"
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
      const url = new URL(document.URL);
      const query = decodeURIComponent(url.searchParams.get('query') ?? '');
      const variables = decodeURIComponent(url.searchParams.get('variables') ?? '');

      const root = ReactDOM.createRoot(document.getElementById('graphiql'));
      root.render(
        React.createElement(GraphiQL, {
          fetcher: GraphiQL.createFetcher({
            url: '${url}',
            headers: {'X-Shopify-Storefront-Access-Token': '${accessToken}'}
          }),
          defaultEditorToolsVisibility: true,
          initialTabs: [{query: '{\\n  shop {\\n    name\\n  }\\n}'}],
          query,
          variables
        }),
      );
    </script>
  </body>
</html>
  `,
    {status: 200, headers: {'content-type': 'text/html'}},
  );
};
