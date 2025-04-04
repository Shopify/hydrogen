declare module "virtual:react-router/server-build" {
  import { ServerBuild } from "react-router";
  export const assets: ServerBuild["assets"];
  export const assetsBuildDirectory: ServerBuild["assetsBuildDirectory"];
  export const basename: ServerBuild["basename"];
  export const entry: ServerBuild["entry"];
  export const future: ServerBuild["future"];
  export const isSpaMode: ServerBuild["isSpaMode"];
  export const prerender: ServerBuild["prerender"];
  export const publicPath: ServerBuild["publicPath"];
  export const routes: ServerBuild["routes"];
  export const ssr: ServerBuild["ssr"];
  export const unstable_getCriticalCss: ServerBuild["unstable_getCriticalCss"];
}