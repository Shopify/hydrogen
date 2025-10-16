// src/vite/get-virtual-routes.ts
var VIRTUAL_ROUTES_DIR = "vite/virtual-routes/routes";
var VIRTUAL_ROUTES_ROUTES_DIR_PARTS = [
  "vite",
  "virtual-routes",
  "routes"
];
var VIRTUAL_ROUTES_DIR_PARTS = ["vite", "virtual-routes"];
function getVirtualRoutesPath(pathParts, forFile) {
  const basePath = new URL("../", import.meta.url);
  const virtualRoutesPath = pathParts.reduce((working, dirPart) => {
    return new URL(`${dirPart}/`, working);
  }, basePath);
  return new URL(forFile, virtualRoutesPath).pathname.replace(
    /^\/[a-zA-Z]:\//,
    "/"
  );
}
async function getVirtualRoutesV3() {
  return {
    routes: [
      {
        id: `${VIRTUAL_ROUTES_DIR}/graphiql`,
        path: "graphiql",
        file: getVirtualRoutesPath(
          VIRTUAL_ROUTES_ROUTES_DIR_PARTS,
          "graphiql.jsx"
        ),
        index: false
      },
      {
        id: `${VIRTUAL_ROUTES_DIR}/subrequest-profiler`,
        path: "subrequest-profiler",
        file: getVirtualRoutesPath(
          VIRTUAL_ROUTES_ROUTES_DIR_PARTS,
          "subrequest-profiler.jsx"
        ),
        index: false
      },
      {
        id: `${VIRTUAL_ROUTES_DIR}/[.]well-known.appspecific.com[.]chrome[.]devtools[.]json`,
        path: ".well-known/appspecific/com.chrome.devtools.json",
        file: getVirtualRoutesPath(
          VIRTUAL_ROUTES_ROUTES_DIR_PARTS,
          "[.]well-known.appspecific.com[.]chrome[.]devtools[.]json.jsx"
        ),
        index: false
      },
      {
        id: `${VIRTUAL_ROUTES_DIR}/index`,
        path: "",
        file: getVirtualRoutesPath(
          VIRTUAL_ROUTES_ROUTES_DIR_PARTS,
          "index.jsx"
        ),
        index: true
      }
    ],
    layout: {
      file: getVirtualRoutesPath(VIRTUAL_ROUTES_DIR_PARTS, "layout.jsx")
    }
  };
}

export { VIRTUAL_ROUTES_DIR, VIRTUAL_ROUTES_DIR_PARTS, VIRTUAL_ROUTES_ROUTES_DIR_PARTS, getVirtualRoutesV3 };
//# sourceMappingURL=get-virtual-routes-XE7G57DS.js.map
//# sourceMappingURL=get-virtual-routes-XE7G57DS.js.map