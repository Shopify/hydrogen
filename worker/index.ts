import { createRequestHandler } from "@remix-run/oxygen";
// The build remix app provided by remix build
import * as remixBuild from "remix-build";

const requestHandler = createRequestHandler({
  build: remixBuild,
  mode: process.env.NODE_ENV,
  shouldProxyAsset: () => false
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
