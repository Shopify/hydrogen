import path from 'path';

// src/vite/get-virtual-routes.ts
function fileUrlToPath(url) {
  if (typeof url !== "string") {
    throw new TypeError('The "url" argument must be of type string.');
  }
  if (!url.startsWith("file://")) {
    throw new TypeError("The URL must be a file URL.");
  }
  let path2 = url.replace(/^file:\/\/\/*/, "");
  if (/^[a-zA-Z]:/.test(path2)) {
    path2 = "/" + path2;
  } else {
    path2 = "/" + path2;
  }
  path2 = decodeURIComponent(path2);
  return path2;
}
var VIRTUAL_ROUTES_DIR = "vite/virtual-routes/routes";
var VIRTUAL_ROUTES_ROUTES_DIR_PARTS = [
  "vite",
  "virtual-routes",
  "routes"
];
var VIRTUAL_ROUTES_DIR_PARTS = ["vite", "virtual-routes"];
var VIRTUAL_ROOT = "vite/virtual-routes/virtual-root";
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
var VIRTUAL_ROUTES_DIR_ORIG = "virtual-routes/routes";
var VIRTUAL_ROOT_ORIG = "virtual-routes/virtual-root-with-layout";
async function getVirtualRoutes() {
  const distPath = path.dirname(fileUrlToPath(import.meta.url));
  path.join(distPath, VIRTUAL_ROUTES_DIR_ORIG);
  return {
    //routes,
    root: {
      id: VIRTUAL_ROOT_ORIG,
      path: "",
      file: path.join(distPath, VIRTUAL_ROOT_ORIG + ".jsx")
    }
  };
}

export { VIRTUAL_ROOT, VIRTUAL_ROOT_ORIG, VIRTUAL_ROUTES_DIR, VIRTUAL_ROUTES_DIR_ORIG, VIRTUAL_ROUTES_DIR_PARTS, VIRTUAL_ROUTES_ROUTES_DIR_PARTS, fileUrlToPath, getVirtualRoutes, getVirtualRoutesV3 };
//# sourceMappingURL=get-virtual-routes-3EHDQRMK.js.map
//# sourceMappingURL=get-virtual-routes-3EHDQRMK.js.map