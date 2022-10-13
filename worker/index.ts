import { createRequestHandler } from "@remix-run/oxygen";
// The build remix app provided by remix build
import * as remixBuild from "remix-build";

// Virtual module provided by wrangler -- TODO this shouldn't be needed here
import manifestJSON from "__STATIC_CONTENT_MANIFEST";
const assetManifest = JSON.parse(manifestJSON);

const requestHandler = createRequestHandler({
  build: remixBuild,
  mode: process.env.NODE_ENV,
  assetManifest,
});

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    try {
      return await requestHandler(request, { env, ctx });
    } catch (error) {
      console.error(error);
      return new Response("An unexpected error occurred", { status: 500 });
    }
  },
};
