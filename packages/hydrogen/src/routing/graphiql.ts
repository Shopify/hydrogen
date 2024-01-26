import type {LoaderFunctionArgs} from '@remix-run/server-runtime';

type GraphiQLLoader = (args: LoaderFunctionArgs) => Promise<Response>;

export const graphiqlLoader: GraphiQLLoader = async function graphiqlLoader({
  request,
  context: {storefront, customerAccount},
}: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const schemaName = url.searchParams.get('schema') ?? 'storefront';

  if (!storefront) {
    throw new Error(
      `GraphiQL: Hydrogen's storefront client must be injected in the loader context.`,
    );
  }

  const schemas: {
    [key: string]: {
      name: string;
      value?: object;
      accessToken?: string;
      authHeader: string;
      apiUrl: string;
    };
  } = {};

  if (storefront) {
    const authHeader = 'X-Shopify-Storefront-Access-Token';
    schemas.storefront = {
      name: 'Storefront API',
      authHeader,
      accessToken: storefront.getPublicTokenHeaders()[authHeader],
      apiUrl: storefront.getApiUrl(),
    };
  }

  if (customerAccount) {
    // CustomerAccount API does not support introspection to the same URL.
    // Read it from a file using the asset server:
    const customerAccountSchema = await (
      await fetch(url.origin + '/graphiql/customer-account.schema.json')
    ).json();

    // @ts-ignore This is recognized in editor but not at build time
    const accessToken = await customerAccount.getAccessToken();

    if (customerAccountSchema) {
      schemas['customer-account'] = {
        name: 'Customer Account API',
        value: customerAccountSchema,
        authHeader: 'Authorization',
        accessToken,
        apiUrl: customerAccount.getApiUrl(),
      };
    }
  }

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
              background-color: hsl(219, 29%, 18%);
            }

            #graphiql {
              height: 100vh;
            }

            #graphiql > .placeholder {
              color: slategray;
              width: fit-content;
              margin: 40px auto;
              font-family: Arial;
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
          <link
            rel="stylesheet"
            href="https://unpkg.com/@graphiql/plugin-explorer/dist/style.css"
          />
        </head>

        <body>
          <div id="graphiql">
            <div class="placeholder">Loading GraphiQL...</div>
          </div>

          <script
            src="https://unpkg.com/graphiql@3/graphiql.min.js"
            type="application/javascript"
            crossorigin="anonymous"
          ></script>
          <script
            src="https://unpkg.com/@graphiql/plugin-explorer/dist/index.umd.js"
            type="application/javascript"
            crossorigin="anonymous"
          ></script>

          <script>
            const windowUrl = new URL(document.URL);
            const startingSchemaKey =
              windowUrl.searchParams.get('schema') || 'storefront';

            let query = '{ shop { name } }';
            if (windowUrl.searchParams.has('query')) {
              query = decodeURIComponent(
                windowUrl.searchParams.get('query') ?? query,
              );
            }

            // Prettify query
            query = GraphiQL.GraphQL.print(GraphiQL.GraphQL.parse(query));

            if (startingSchemaKey !== 'storefront') {
              query += ' #schema:' + startingSchemaKey;
            }

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

            const schemas = ${JSON.stringify(schemas)};
            let lastActiveTabIndex = -1;

            const root = ReactDOM.createRoot(
              document.getElementById('graphiql'),
            );

            root.render(React.createElement(RootWrapper));

            function RootWrapper() {
              const [activeSchema, setActiveSchema] =
                React.useState(startingSchemaKey);

              const schema = schemas[activeSchema];
              if (!schema) {
                throw new Error('No schema found for ' + activeSchema);
              }

              const keys = Object.keys(schemas);

              return React.createElement(GraphiQL, {
                fetcher: GraphiQL.createFetcher({
                  url: schema.apiUrl,
                  headers: {[schema.authHeader]: schema.accessToken},
                }),
                defaultEditorToolsVisibility: true,
                query,
                variables,
                schema: schema.value,
                plugins: [GraphiQLPluginExplorer.explorerPlugin()],
                onTabChange: ({tabs, activeTabIndex}) => {
                  if (activeTabIndex === lastActiveTabIndex) return;

                  lastActiveTabIndex = activeTabIndex;

                  const activeTab = tabs[activeTabIndex];
                  if (activeTab) {
                    const nextSchema =
                      activeTab.query.match(/#schema:([a-z-]+)/m)?.[1] ||
                      'storefront';

                    if (nextSchema !== activeSchema) {
                      setActiveSchema(nextSchema);
                    }
                  }
                },
                children: [
                  // React.createElement(GraphiQL.Toolbar, {}),
                  React.createElement(GraphiQL.Logo, {
                    key: 'Logo replacement',
                    children: [
                      React.createElement('div', {
                        key: 'Logo wrapper',
                        style: {display: 'flex', alignItems: 'center'},
                        children: [
                          React.createElement('div', {
                            key: 'api',
                            className: 'graphiql-logo',
                            style: {
                              paddingRight: 0,
                              whiteSpace: 'nowrap',
                              cursor: 'pointer',
                            },
                            onClick: () => {
                              clicked = true;
                              const activeKey = keys.indexOf(activeSchema);
                              const nextKey =
                                keys[(activeKey + 1) % keys.length];

                              setActiveSchema(nextKey);
                            },
                            children: [schema.name],
                          }),
                          React.createElement(GraphiQL.Logo, {key: 'logo'}),
                        ],
                      }),
                    ],
                  }),
                ],
              });
            }
          </script>
        </body>
      </html>
    `,
    {status: 200, headers: {'content-type': 'text/html'}},
  );
};
