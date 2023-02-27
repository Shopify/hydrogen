var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf,
  __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, {get: all[name], enumerable: !0});
  },
  __copyProps = (to, from, except, desc) => {
    if ((from && typeof from == 'object') || typeof from == 'function')
      for (let key of __getOwnPropNames(from))
        !__hasOwnProp.call(to, key) &&
          key !== except &&
          __defProp(to, key, {
            get: () => from[key],
            enumerable:
              !(desc = __getOwnPropDesc(from, key)) || desc.enumerable,
          });
    return to;
  };
var __toESM = (mod, isNodeMode, target) => (
    (target = mod != null ? __create(__getProtoOf(mod)) : {}),
    __copyProps(
      isNodeMode || !mod || !mod.__esModule
        ? __defProp(target, 'default', {value: mod, enumerable: !0})
        : target,
      mod,
    )
  ),
  __toCommonJS = (mod) =>
    __copyProps(__defProp({}, '__esModule', {value: !0}), mod);

// <stdin>
var stdin_exports = {};
__export(stdin_exports, {
  assets: () => assets_manifest_default,
  assetsBuildDirectory: () => assetsBuildDirectory,
  entry: () => entry,
  future: () => future,
  publicPath: () => publicPath,
  routes: () => routes,
});
module.exports = __toCommonJS(stdin_exports);

// app/entry.server.jsx
var entry_server_exports = {};
__export(entry_server_exports, {
  default: () => handleRequest,
});
var import_stream = require('stream'),
  import_node = require('@remix-run/node'),
  import_react = require('@remix-run/react'),
  import_isbot = __toESM(require('isbot')),
  import_server = require('react-dom/server'),
  import_jsx_dev_runtime = require('react/jsx-dev-runtime'),
  ABORT_DELAY = 5e3;
function handleRequest(
  request,
  responseStatusCode,
  responseHeaders,
  remixContext,
) {
  return (0, import_isbot.default)(request.headers.get('user-agent'))
    ? handleBotRequest(
        request,
        responseStatusCode,
        responseHeaders,
        remixContext,
      )
    : handleBrowserRequest(
        request,
        responseStatusCode,
        responseHeaders,
        remixContext,
      );
}
function handleBotRequest(
  request,
  responseStatusCode,
  responseHeaders,
  remixContext,
) {
  return new Promise((resolve, reject) => {
    let didError = !1,
      {pipe, abort} = (0, import_server.renderToPipeableStream)(
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(
          import_react.RemixServer,
          {context: remixContext, url: request.url},
          void 0,
          !1,
          {
            fileName: 'app/entry.server.jsx',
            lineNumber: 40,
            columnNumber: 7,
          },
          this,
        ),
        {
          onAllReady() {
            let body = new import_stream.PassThrough();
            responseHeaders.set('Content-Type', 'text/html'),
              resolve(
                new import_node.Response(body, {
                  headers: responseHeaders,
                  status: didError ? 500 : responseStatusCode,
                }),
              ),
              pipe(body);
          },
          onShellError(error) {
            reject(error);
          },
          onError(error) {
            (didError = !0), console.error(error);
          },
        },
      );
    setTimeout(abort, ABORT_DELAY);
  });
}
function handleBrowserRequest(
  request,
  responseStatusCode,
  responseHeaders,
  remixContext,
) {
  return new Promise((resolve, reject) => {
    let didError = !1,
      {pipe, abort} = (0, import_server.renderToPipeableStream)(
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(
          import_react.RemixServer,
          {context: remixContext, url: request.url},
          void 0,
          !1,
          {
            fileName: 'app/entry.server.jsx',
            lineNumber: 81,
            columnNumber: 7,
          },
          this,
        ),
        {
          onShellReady() {
            let body = new import_stream.PassThrough();
            responseHeaders.set('Content-Type', 'text/html'),
              resolve(
                new import_node.Response(body, {
                  headers: responseHeaders,
                  status: didError ? 500 : responseStatusCode,
                }),
              ),
              pipe(body);
          },
          onShellError(err) {
            reject(err);
          },
          onError(error) {
            (didError = !0), console.error(error);
          },
        },
      );
    setTimeout(abort, ABORT_DELAY);
  });
}

// app/root.jsx
var root_exports = {};
__export(root_exports, {
  default: () => App,
  links: () => links,
  loader: () => loader,
  meta: () => meta,
});
var import_react2 = require('@remix-run/react');

// app/styles/app.css
var app_default = '/build/_assets/app-SLSXLQQQ.css';

// public/favicon.svg
var favicon_default = '/build/_assets/favicon-5FIZBM2K.svg';

// app/root.jsx
var import_jsx_dev_runtime2 = require('react/jsx-dev-runtime'),
  links = () => [
    {rel: 'stylesheet', href: app_default},
    {
      rel: 'preconnect',
      href: 'https://cdn.shopify.com',
    },
    {
      rel: 'preconnect',
      href: 'https://shop.app',
    },
    {rel: 'icon', type: 'image/svg+xml', href: favicon_default},
  ],
  meta = () => ({
    charset: 'utf-8',
    viewport: 'width=device-width,initial-scale=1',
  });
async function loader({context}) {
  return {layout: await context.storefront.query(LAYOUT_QUERY)};
}
function App() {
  let data = (0, import_react2.useLoaderData)(),
    {name} = data.layout.shop;
  return /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)(
    'html',
    {
      lang: 'en',
      children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)(
          'head',
          {
            children: [
              /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)(
                import_react2.Meta,
                {},
                void 0,
                !1,
                {
                  fileName: 'app/root.jsx',
                  lineNumber: 45,
                  columnNumber: 9,
                },
                this,
              ),
              /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)(
                import_react2.Links,
                {},
                void 0,
                !1,
                {
                  fileName: 'app/root.jsx',
                  lineNumber: 46,
                  columnNumber: 9,
                },
                this,
              ),
            ],
          },
          void 0,
          !0,
          {
            fileName: 'app/root.jsx',
            lineNumber: 44,
            columnNumber: 7,
          },
          this,
        ),
        /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)(
          'body',
          {
            children: [
              /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)(
                'h1',
                {children: ['Hello, ', name]},
                void 0,
                !0,
                {
                  fileName: 'app/root.jsx',
                  lineNumber: 49,
                  columnNumber: 9,
                },
                this,
              ),
              /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)(
                'p',
                {children: 'This is a custom storefront powered by Hydrogen'},
                void 0,
                !1,
                {
                  fileName: 'app/root.jsx',
                  lineNumber: 50,
                  columnNumber: 9,
                },
                this,
              ),
              /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)(
                import_react2.Outlet,
                {},
                void 0,
                !1,
                {
                  fileName: 'app/root.jsx',
                  lineNumber: 51,
                  columnNumber: 9,
                },
                this,
              ),
              /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)(
                import_react2.ScrollRestoration,
                {},
                void 0,
                !1,
                {
                  fileName: 'app/root.jsx',
                  lineNumber: 52,
                  columnNumber: 9,
                },
                this,
              ),
              /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)(
                import_react2.Scripts,
                {},
                void 0,
                !1,
                {
                  fileName: 'app/root.jsx',
                  lineNumber: 53,
                  columnNumber: 9,
                },
                this,
              ),
            ],
          },
          void 0,
          !0,
          {
            fileName: 'app/root.jsx',
            lineNumber: 48,
            columnNumber: 7,
          },
          this,
        ),
      ],
    },
    void 0,
    !0,
    {
      fileName: 'app/root.jsx',
      lineNumber: 43,
      columnNumber: 5,
    },
    this,
  );
}
var LAYOUT_QUERY = `#graphql
  query layout {
    shop {
      name
      description
    }
  }
`;

// app/routes/index.jsx
var routes_exports = {};
__export(routes_exports, {
  default: () => Index,
});
var import_jsx_dev_runtime3 = require('react/jsx-dev-runtime');
function Index() {
  return /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)(
    'div',
    {children: 'hello yey'},
    void 0,
    !1,
    {
      fileName: 'app/routes/index.jsx',
      lineNumber: 2,
      columnNumber: 10,
    },
    this,
  );
}

// server-assets-manifest:@remix-run/dev/assets-manifest
var assets_manifest_default = {
  version: '06f1133f',
  entry: {
    module: '/build/entry.client-PFIEV5BU.js',
    imports: [
      '/build/_shared/chunk-KPGEA3KA.js',
      '/build/_shared/chunk-EETRBLDB.js',
    ],
  },
  routes: {
    root: {
      id: 'root',
      parentId: void 0,
      path: '',
      index: void 0,
      caseSensitive: void 0,
      module: '/build/root-7DNCSQHF.js',
      imports: void 0,
      hasAction: !1,
      hasLoader: !0,
      hasCatchBoundary: !1,
      hasErrorBoundary: !1,
    },
    'routes/index': {
      id: 'routes/index',
      parentId: 'root',
      path: void 0,
      index: !0,
      caseSensitive: void 0,
      module: '/build/routes/index-VUMCQ67O.js',
      imports: void 0,
      hasAction: !1,
      hasLoader: !1,
      hasCatchBoundary: !1,
      hasErrorBoundary: !1,
    },
  },
  cssBundleHref: void 0,
  url: '/build/manifest-06F1133F.js',
};

// server-entry-module:@remix-run/dev/server-build
var assetsBuildDirectory = 'public/build',
  future = {
    unstable_cssModules: !1,
    unstable_cssSideEffectImports: !1,
    unstable_dev: !1,
    unstable_vanillaExtract: !1,
    v2_errorBoundary: !1,
    v2_meta: !1,
    v2_routeConvention: !1,
  },
  publicPath = '/build/',
  entry = {module: entry_server_exports},
  routes = {
    root: {
      id: 'root',
      parentId: void 0,
      path: '',
      index: void 0,
      caseSensitive: void 0,
      module: root_exports,
    },
    'routes/index': {
      id: 'routes/index',
      parentId: 'root',
      path: void 0,
      index: !0,
      caseSensitive: void 0,
      module: routes_exports,
    },
  };
// Annotate the CommonJS export names for ESM import in node:
0 &&
  (module.exports = {
    assets,
    assetsBuildDirectory,
    entry,
    future,
    publicPath,
    routes,
  });
//# sourceMappingURL=index.js.map
