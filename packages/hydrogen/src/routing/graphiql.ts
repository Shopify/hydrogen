import type {LoaderFunctionArgs} from '@remix-run/server-runtime';
import type {Storefront} from '../storefront';

type GraphiQLLoader = (args: LoaderFunctionArgs) => Promise<Response>;

export const graphiqlLoader: GraphiQLLoader = async function graphiqlLoader({
  context,
}: LoaderFunctionArgs) {
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

  // Add code highlighting to the HTML template
  const html = String.raw;

  return new Response(
    html`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <title>GraphiQL</title>
          <link rel="icon" type="image/x-icon" href="${favicon}" />
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
          <link
            rel="stylesheet"
            href="https://unpkg.com/graphiql@3/graphiql.min.css"
          />
        </head>

        <body>
          <div id="graphiql">Loading...</div>

          <script
            src="https://unpkg.com/graphiql@3/graphiql.min.js"
            type="application/javascript"
            crossorigin="anonymous"
          ></script>
          <script>
            const windowUrl = new URL(document.URL);

            let query = '{ shop { name } }';
            if (windowUrl.searchParams.has('query')) {
              query = decodeURIComponent(
                windowUrl.searchParams.get('query') ?? query,
              );
            }

            // Prettify query
            query = GraphiQL.GraphQL.print(GraphiQL.GraphQL.parse(query));

            let variables;
            if (windowUrl.searchParams.has('variables')) {
              variables = decodeURIComponent(
                windowUrl.searchParams.get('variables') ?? '',
              );
            }

            // Prettify variables
            if (variables) {
              variables = JSON.stringify(JSON.parse(variables), null, 2);
            }

            const root = ReactDOM.createRoot(
              document.getElementById('graphiql'),
            );
            root.render(
              React.createElement(GraphiQL, {
                fetcher: GraphiQL.createFetcher({
                  url: '${url}',
                  headers: {
                    'X-Shopify-Storefront-Access-Token': '${accessToken}',
                  },
                }),
                defaultEditorToolsVisibility: true,
                query,
                variables,
              }),
            );
          </script>
        </body>
      </html>
    `,
    {status: 200, headers: {'content-type': 'text/html'}},
  );
};
