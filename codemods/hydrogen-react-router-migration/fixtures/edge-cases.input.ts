// Edge case: Mixed imports from multiple sources
import { json, defer } from '@shopify/hydrogen';
import { Link } from '@remix-run/react';
import { redirect } from '@remix-run/node';
import { Analytics, Money } from '@shopify/hydrogen';
import { RemixServer } from 'react-router';

// Edge case: Complex destructuring with type annotations
export async function loader({ 
  request, 
  params, 
  context 
}: any) {
  // Edge case: Nested property access
  const language = context.storefront.i18n.language;
  const country = context.storefront.i18n.country;
  
  // Edge case: defer with complex data
  return defer({
    product: await getProduct(params.handle),
    recommendations: getRecommendations(),
    reviews: getReviews()
  });
}

// Edge case: Multiple error handlers without types
export async function errorHandlingExample() {
  try {
    await someOperation();
  } catch (e) {
    console.error(e);
    try {
      await fallbackOperation();
    } catch (fallbackError) {
      throw fallbackError;
    }
  }
}

// Edge case: Dynamic imports
export async function dynamicImportsExample() {
  const handler = await import('@shopify/remix-oxygen');
  const build = await import('virtual:remix/server-build');
  return { handler, build };
}

// Edge case: Component with both old and new names
export default function Entry() {
  return (
    <RemixServer>
      <Analytics />
      <Money />
    </RemixServer>
  );
}

// Edge case: Re-exports
export { createAppLoadContext } from './lib/context';
export type { LoaderArgs, ActionArgs } from '@remix-run/node';

// Edge case: Complex type imports
import type { 
  MetaFunction,
  LinksFunction,
  HeadersFunction 
} from '@remix-run/react';

// Edge case: Aliased imports
import { json as jsonResponse } from '@shopify/hydrogen';

// Edge case: Function with same name as component
function RemixServer() {
  return null;
}

// Edge case: Spread in context
export function createAppLoadContext(request: Request, env: Env) {
  const hydrogenContext = createHydrogenContext({ request, env });
  const customContext = getCustomContext();
  
  return {
    ...hydrogenContext,
    ...customContext,
    extraProp: 'value'
  };
}