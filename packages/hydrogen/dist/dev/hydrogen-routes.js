// src/dev/hydrogen-routes.ts
async function hydrogenRoutes(currentRoutes) {
  const env = process.env.NODE_ENV;
  if (env === "production") {
    return currentRoutes;
  }
  const { getVirtualRoutesV3 } = await import("./get-virtual-routes-ZEUPNZWL.js");
  const { layout, routes: virtualRoutes } = await getVirtualRoutesV3();
  const childVirtualRoutes = virtualRoutes.map(({ path, file, index, id }) => {
    return {
      file,
      id,
      index,
      path
    };
  });
  const virtualLayout = {
    file: layout.file,
    children: childVirtualRoutes
  };
  return [...currentRoutes, virtualLayout];
}
export {
  hydrogenRoutes
};
