import type {LoaderFunctionArgs} from 'react-router';
import type {Storefront} from '../storefront';
import type {CustomerAccount} from '../customer/types';

type GraphiQLLoader = (args: LoaderFunctionArgs) => Promise<Response>;

export const graphiqlLoader: GraphiQLLoader = async function graphiqlLoader({
  request,
  context,
}: LoaderFunctionArgs) {
  // For some reason, types are properly recognized by the editor,
  // but not at build time on CI. Cast types here to ensure it builds.
  const storefront = context.storefront as undefined | Storefront;
  const customerAccount = context.customerAccount as
    | undefined
    | CustomerAccount;

  const url = new URL(request.url);

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
      icon: string;
    };
  } = {};

  if (storefront) {
    const authHeader = 'X-Shopify-Storefront-Access-Token';
    schemas.storefront = {
      name: 'Storefront API',
      authHeader,
      accessToken: storefront.getPublicTokenHeaders()[authHeader],
      apiUrl: storefront.getApiUrl(),
      icon: 'SF',
    };
  }

  // In order to authenticate the CAAPI requests the user must be logged in via the CAAPI.
  // The graphiql request will then use the correct
  if (customerAccount) {
    // CustomerAccount API does not support introspection to the same URL.
    // Read it from a file using the asset server:
    const customerAccountSchema = await (
      await fetch(url.origin + '/graphiql/customer-account.schema.json')
    ).json();

    const accessToken = await customerAccount.getAccessToken();

    if (customerAccountSchema) {
      schemas['customer-account'] = {
        name: 'Customer Account API',
        value: customerAccountSchema,
        authHeader: 'Authorization',
        accessToken,
        apiUrl: customerAccount.getApiUrl(),
        icon: 'CA',
      };
    }
  }

  // GraphiQL icon from their GitHub repo
  const favicon = `https://avatars.githubusercontent.com/u/12972006?s=48&v=4`;

  // Add code highlighting to the HTML template
  const html = String.raw;

  // NOTE: based on https://github.com/graphql/graphiql/blob/main/examples/graphiql-cdn/index.html
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

            .graphiql-api-toolbar-label {
              position: absolute;
              bottom: -6px;
              right: -4px;
              font-size: 8px;
            }
          </style>

          <link
            rel="stylesheet"
            href="https://esm.sh/graphiql/dist/style.css"
          />

          <link
            rel="stylesheet"
            href="https://esm.sh/@graphiql/plugin-explorer/dist/style.css"
          />
          <script type="importmap">
            {
              "imports": {
                "react": "https://esm.sh/react@19.1.0",
                "react/jsx-runtime": "https://esm.sh/react@19.1.0/jsx-runtime",
                "react-dom": "https://esm.sh/react-dom@19.1.0",
                "react-dom/client": "https://esm.sh/react-dom@19.1.0/client",

                "graphql": "https://esm.sh/graphql@16.11.0",

                "graphiql": "https://esm.sh/graphiql?standalone&external=react,react-dom,@graphiql/react,graphql",
                "@graphiql/plugin-explorer": "https://esm.sh/@graphiql/plugin-explorer?standalone&external=react,@graphiql/react,graphql",
                "@graphiql/react": "https://esm.sh/@graphiql/react?standalone&external=react,react-dom,graphql",
                "@graphiql/toolkit": "https://esm.sh/@graphiql/toolkit?standalone&external=graphql"
              }
            }
          </script>
          <script type="module">
            // Import React and ReactDOM
            import React from 'react';
            import ReactDOM from 'react-dom/client';

            // Import GraphiQL and the Explorer plugin
            import {GraphiQL, HISTORY_PLUGIN} from 'graphiql';
            import {createGraphiQLFetcher} from '@graphiql/toolkit';
            import {explorerPlugin} from '@graphiql/plugin-explorer';
            import {ToolbarButton} from '@graphiql/react';

            import createJSONWorker from 'https://esm.sh/monaco-editor/esm/vs/language/json/json.worker.js?worker';
            import createGraphQLWorker from 'https://esm.sh/monaco-graphql/esm/graphql.worker.js?worker';
            import createEditorWorker from 'https://esm.sh/monaco-editor/esm/vs/editor/editor.worker.js?worker';
            import {parse, print} from 'graphql';

            globalThis.MonacoEnvironment = {
              getWorker(_workerId, label) {
                switch (label) {
                  case 'json':
                    return createJSONWorker();
                  case 'graphql':
                    return createGraphQLWorker();
                }
                return createEditorWorker();
              },
            };

            const windowUrl = new URL(document.URL);
            const startingSchemaKey =
              windowUrl.searchParams.get('schema') || 'storefront';

            let initialQuery = '{ shop { name } }';
            if (windowUrl.searchParams.has('query')) {
              initialQuery = decodeURIComponent(
                windowUrl.searchParams.get('query') ?? query,
              );
            }

            // Prettify query
            initialQuery = print(parse(initialQuery));

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
            let lastTabAmount = -1;

            const TAB_STATE_KEY = 'graphiql:tabState';
            const storage = {
              getTabState: () =>
                JSON.parse(localStorage.getItem(TAB_STATE_KEY)),
              setTabState: (state) =>
                localStorage.setItem(TAB_STATE_KEY, JSON.stringify(state)),
            };

            let nextSchemaKey;

            function App() {
              const [activeSchema, setActiveSchema] =
                React.useState(startingSchemaKey);

              const schema = schemas[activeSchema];

              if (!schema) {
                throw new Error('No schema found for ' + activeSchema);
              }

              const fetcher = createGraphiQLFetcher({
                url: schema.apiUrl,
                headers: {[schema.authHeader]: schema.accessToken},
                enableIncrementalDelivery: false,
              });

              // We create a custom fetcher because createGraphiQLFetcher attempts to introspect the schema
              // and the Customer Account API does not support introspection.
              // We  override the fetcher to return the schema directly only for the CAAPI introspection query.
              function createJsonFetcher(options, httpFetch) {
                if (activeSchema === 'storefront') {
                  return fetcher(options, httpFetch);
                } else {
                  // CAAPI requires a custom fetcher
                  if (options.operationName === 'IntrospectionQuery') {
                    return {data: schema.value};
                  } else {
                    return fetcher(options, httpFetch);
                  }
                }
              }

              const keys = Object.keys(schemas);

              function onTabChange(state) {
                const {activeTabIndex, tabs} = state;
                const activeTab = tabs[activeTabIndex];

                if (
                  activeTabIndex === lastActiveTabIndex &&
                  lastTabAmount === tabs.length
                ) {
                  if (
                    nextSchemaKey &&
                    activeTab &&
                    activeTab.schemaKey !== nextSchemaKey
                  ) {
                    activeTab.schemaKey = nextSchemaKey;
                    nextSchemaKey = undefined;

                    // Sync state to localStorage. GraphiQL resets the state
                    // asynchronously, so we need to do it in a timeout.
                    storage.setTabState(state);
                    setTimeout(() => storage.setTabState(state), 500);
                  }

                  // React rerrendering, skip
                  return;
                }

                if (activeTab) {
                  if (!activeTab.schemaKey) {
                    // Creating a new tab
                    if (lastTabAmount < tabs.length) {
                      activeTab.schemaKey = activeSchema;
                      storage.setTabState(state);
                    }
                  }

                  const nextSchema = activeTab.schemaKey || 'storefront';

                  if (nextSchema !== activeSchema) {
                    setActiveSchema(nextSchema);
                  }
                }

                lastActiveTabIndex = activeTabIndex;
                lastTabAmount = tabs.length;
              }

              const plugins = [HISTORY_PLUGIN, explorerPlugin()];

              const props = {
                fetcher: createJsonFetcher,
                defaultEditorToolsVisibility: true,
                initialQuery,
                variables,
                schema: schema.value,
                plugins,
                onTabChange,
              };

              function toggleSelectedApi() {
                const activeKeyIndex = keys.indexOf(activeSchema);
                nextSchemaKey = keys[(activeKeyIndex + 1) % keys.length];

                // This triggers onTabChange
                if (nextSchemaKey) setActiveSchema(nextSchemaKey);
              }

              const CustomToolbar = React.createElement(
                GraphiQL.Toolbar,
                {
                  key: 'Custom Toolbar',
                },
                [
                  React.createElement(
                    ToolbarButton,
                    {
                      key: 'api-wrapper',
                      onClick: toggleSelectedApi,
                      label: 'Toggle between different API schemas',
                    },
                    [
                      React.createElement(
                        'div',
                        {
                          key: 'icon',
                          style: {
                            textAlign: 'center',
                          },
                        },
                        [
                          schema.icon,
                          React.createElement(
                            'div',
                            {
                              key: 'icon-label',
                              className: 'graphiql-api-toolbar-label',
                            },
                            'API',
                          ),
                        ],
                      ),
                    ],
                  ),
                ],
              );

              const CustomLogo = React.createElement(
                GraphiQL.Logo,
                {
                  key: 'Logo replacement',
                },
                [
                  React.createElement(
                    'div',
                    {
                      key: 'Logo wrapper',
                      style: {display: 'flex', alignItems: 'center'},
                    },
                    [
                      React.createElement(
                        'div',
                        {
                          key: 'api',
                          className: 'graphiql-logo',
                          style: {
                            paddingRight: 0,
                            whiteSpace: 'nowrap',
                          },
                        },
                        [schema.name],
                      ),
                      React.createElement(GraphiQL.Logo, {key: 'logo'}),
                    ],
                  ),
                ],
              );

              // const children = [CustomToolbar, CustomLogo];
              const children = [CustomToolbar];

              return React.createElement(GraphiQL, props, children);
            }

            const container = document.getElementById('graphiql');

            const root = ReactDOM.createRoot(container);

            root.render(React.createElement(App));
          </script>
        </head>

        <body>
          <div id="graphiql">
            <div class="placeholder">Loading GraphiQL...</div>
          </div>
        </body>
      </html>
    `,
    {status: 200, headers: {'content-type': 'text/html'}},
  );
};
