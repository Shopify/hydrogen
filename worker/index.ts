import {createRequestHandler} from '@hydrogen/remix';
// The build remix app provided by remix build
import * as remixBuild from 'remix-build';

const requestHandler = createRequestHandler({
  build: remixBuild,
  mode: process.env.NODE_ENV,
  shouldProxyAsset: () => false,
});

export default {
  async fetch(
    request: Request,
    env: Env,
    context: ExecutionContext,
  ): Promise<Response> {
    try {
      return await requestHandler(request, {
        env,
        context,
        storefront: {
          publicStorefrontToken: '3b580e70970c4528da70c98e097c2fa0',
          storeDomain: 'hydrogen-preview',
          storefrontApiVersion: '2022-10',
        },
      });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error);
      return new Response('An unexpected error occurred', {status: 500});
    }
  },
};
