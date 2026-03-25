import {hydrogenServerRoutes} from '@shopify/hydrogen-temp';
import {storefront} from 'lib/shopify';

async function handler(request: Request): Promise<Response> {
  const response = await hydrogenServerRoutes(request, {storefront});
  if (response) return response;

  return new Response('Not Found', {status: 404});
}

export const GET = handler;
export const POST = handler;
