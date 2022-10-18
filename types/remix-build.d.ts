declare module "remix-build" {
  import { type ServerBuild } from "@hydrogen/remix";

  export const assets: ServerBuild["assets"];
  export const assetsBuildDirectory: ServerBuild["assetsBuildDirectory"];
  export const entry: ServerBuild["entry"];
  export const publicPath: ServerBuild["publicPath"];
  export const routes: ServerBuild["routes"];
}
