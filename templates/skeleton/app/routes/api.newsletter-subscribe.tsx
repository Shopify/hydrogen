import type {ActionFunctionArgs} from '@shopify/remix-oxygen';
import {newsletterSubscribeHandler} from '~/lib/newsletter';

export async function action(args: ActionFunctionArgs) {
  return await newsletterSubscribeHandler(args);
}
