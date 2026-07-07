import type { StorefrontClient } from "../../client";
import type { GraphiQLOptions } from "../types";

const DEV_SCHEMA_FETCH_TIMEOUT_MS = 10_000;

export async function handleGraphiql(
  request: Request,
  storefrontClient: StorefrontClient,
  graphiqlOptions?: GraphiQLOptions,
): Promise<Response | null> {
  const url = new URL(request.url);
  if (request.method !== "GET" || url.pathname !== "/graphiql") return null;

  const schemas: Record<
    string,
    {
      name: string;
      value?: object;
      accessToken?: string;
      authHeader: string;
      apiUrl: string;
      icon: string;
    }
  > = {};

  const sfapiUrl = `${storefrontClient.storeUrl}/api/unstable/graphql.json`;

  schemas.storefront = {
    name: "Storefront API",
    authHeader: "X-Shopify-Storefront-Access-Token",
    apiUrl: sfapiUrl,
    icon: "SF",
  };

  if (graphiqlOptions?.customerAccount) {
    const { apiUrl, accessToken, schemaUrl } = graphiqlOptions.customerAccount;

    try {
      const schemaResponse = await fetch(schemaUrl, {
        signal: AbortSignal.timeout(DEV_SCHEMA_FETCH_TIMEOUT_MS),
      });
      const schemaJson: unknown = await schemaResponse.json();

      if (typeof schemaJson === "object" && schemaJson !== null) {
        schemas["customer-account"] = {
          name: "Customer Account API",
          value: schemaJson as object,
          authHeader: "Authorization",
          accessToken,
          apiUrl,
          icon: "CA",
        };
      }
    } catch {
      // CAAPI schema unavailable — skip the tab silently
    }
  }

  const favicon = "https://avatars.githubusercontent.com/u/12972006?s=48&v=4";

  const html = String.raw;

  return new Response(
    html`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <title>GraphiQL</title>
          <link rel="icon" type="image/x-icon" href="${favicon}" />
          <meta charset="utf-8" />
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
          <link rel="stylesheet" href="https://esm.sh/graphiql/dist/style.css" />
          <link rel="stylesheet" href="https://esm.sh/@graphiql/plugin-explorer/dist/style.css" />
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
            import React from "react";
            import ReactDOM from "react-dom/client";
            import { GraphiQL, HISTORY_PLUGIN } from "graphiql";
            import { createGraphiQLFetcher } from "@graphiql/toolkit";
            import { explorerPlugin } from "@graphiql/plugin-explorer";
            import { ToolbarButton } from "@graphiql/react";
            import createJSONWorker from "https://esm.sh/monaco-editor/esm/vs/language/json/json.worker.js?worker";
            import createGraphQLWorker from "https://esm.sh/monaco-graphql/esm/graphql.worker.js?worker";
            import createEditorWorker from "https://esm.sh/monaco-editor/esm/vs/editor/editor.worker.js?worker";
            import { parse, print } from "graphql";

            globalThis.MonacoEnvironment = {
              getWorker(_workerId, label) {
                switch (label) {
                  case "json":
                    return createJSONWorker();
                  case "graphql":
                    return createGraphQLWorker();
                }
                return createEditorWorker();
              },
            };

            const windowUrl = new URL(document.URL);
            const startingSchemaKey = windowUrl.searchParams.get("schema") || "storefront";

            let initialQuery = "{ shop { name } }";
            if (windowUrl.searchParams.has("query")) {
              initialQuery = decodeURIComponent(windowUrl.searchParams.get("query") ?? initialQuery);
            }

            initialQuery = print(parse(initialQuery));

            let variables;
            if (windowUrl.searchParams.has("variables")) {
              variables = decodeURIComponent(windowUrl.searchParams.get("variables") ?? "");
            }

            if (variables) {
              variables = JSON.stringify(JSON.parse(variables), null, 2);
            }

            const schemas = ${JSON.stringify(schemas).replace(/</g, '\\u003c')};

            let lastActiveTabIndex = -1;
            let lastTabAmount = -1;

            const TAB_STATE_KEY = "graphiql:tabState";
            const storage = {
              getTabState: () => JSON.parse(localStorage.getItem(TAB_STATE_KEY)),
              setTabState: (state) => localStorage.setItem(TAB_STATE_KEY, JSON.stringify(state)),
            };

            let nextSchemaKey;

            function App() {
              const [activeSchema, setActiveSchema] = React.useState(startingSchemaKey);

              const schema = schemas[activeSchema];

              if (!schema) {
                throw new Error("No schema found for " + activeSchema);
              }

              const requestHeaders = schema.accessToken
                ? { [schema.authHeader]: schema.accessToken }
                : {};

              const fetcher = createGraphiQLFetcher({
                url: schema.apiUrl,
                headers: requestHeaders,
                enableIncrementalDelivery: false,
              });

              function createJsonFetcher(options, httpFetch) {
                if (activeSchema === "storefront") {
                  return fetcher(options, httpFetch);
                } else {
                  if (options.operationName === "IntrospectionQuery") {
                    return { data: schema.value };
                  } else {
                    return fetcher(options, httpFetch);
                  }
                }
              }

              const keys = Object.keys(schemas);

              function onTabChange(state) {
                const { activeTabIndex, tabs } = state;
                const activeTab = tabs[activeTabIndex];

                if (activeTabIndex === lastActiveTabIndex && lastTabAmount === tabs.length) {
                  if (nextSchemaKey && activeTab && activeTab.schemaKey !== nextSchemaKey) {
                    activeTab.schemaKey = nextSchemaKey;
                    nextSchemaKey = undefined;
                    storage.setTabState(state);
                    setTimeout(() => storage.setTabState(state), 500);
                  }
                  return;
                }

                if (activeTab) {
                  if (!activeTab.schemaKey) {
                    if (lastTabAmount < tabs.length) {
                      activeTab.schemaKey = activeSchema;
                      storage.setTabState(state);
                    }
                  }

                  const nextSchema = activeTab.schemaKey || "storefront";

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
                if (nextSchemaKey) setActiveSchema(nextSchemaKey);
              }

              const CustomToolbar = React.createElement(GraphiQL.Toolbar, { key: "Custom Toolbar" }, [
                React.createElement(
                  ToolbarButton,
                  {
                    key: "api-wrapper",
                    onClick: toggleSelectedApi,
                    label: "Toggle between different API schemas",
                  },
                  [
                    React.createElement("div", { key: "icon", style: { textAlign: "center" } }, [
                      schema.icon,
                      React.createElement(
                        "div",
                        {
                          key: "icon-label",
                          className: "graphiql-api-toolbar-label",
                        },
                        "API",
                      ),
                    ]),
                  ],
                ),
              ]);

              const CustomLogo = React.createElement(GraphiQL.Logo, { key: "Logo replacement" }, [
                React.createElement(
                  "div",
                  {
                    key: "Logo wrapper",
                    style: { display: "flex", alignItems: "center" },
                  },
                  [
                    React.createElement(
                      "div",
                      {
                        key: "api",
                        className: "graphiql-logo",
                        style: { paddingRight: 0, whiteSpace: "nowrap" },
                      },
                      [schema.name],
                    ),
                    React.createElement(GraphiQL.Logo, { key: "logo" }),
                  ],
                ),
              ]);

              return React.createElement(GraphiQL, props, [CustomToolbar, CustomLogo]);
            }

            const container = document.getElementById("graphiql");
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
    { status: 200, headers: { "content-type": "text/html" } },
  );
}
