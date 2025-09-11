// Edge case: Mixed imports from multiple sources
import { Analytics, Money } from '@shopify/hydrogen';
import { data, Link, redirect } from 'react-router';
import { ServerRouter } from 'react-router';
import type { Route } from './+types/edge-cases';

// Edge case: Complex destructuring with type annotations
export async function loader({ 
  request, 
  params, 
  context 
}: Route.LoaderArgs) {
  // Edge case: Nested property access
  const language = context.customerAccount.i18n.language;
  const country = context.customerAccount.i18n.country;
  
  // Edge case: defer with complex data
  return data({
    product: await getProduct(params.handle),
    recommendations: getRecommendations(),
    reviews: getReviews()
  });
}

// Edge case: Multiple error handlers without types
export async function errorHandlingExample() {
  try {
    await someOperation();
  } catch (e: unknown) {
    console.error(e);
    try {
      await fallbackOperation();
    } catch (fallbackError: unknown) {
      throw fallbackError;
    }
  }
}

// Edge case: Dynamic imports
export async function dynamicImportsExample() {
  const handler = await import('@shopify/hydrogen/oxygen');
  const build = await import('virtual:react-router/server-build');
  return { handler, build };
}

// Edge case: Component with both old and new names
export default function Entry() {
  return (
    <ServerRouter>
      <Analytics />
      <Money />
    </ServerRouter>
  );
}

// Edge case: Re-exports
export { createHydrogenRouterContext } from './lib/context';
export type LoaderArgs = Route.LoaderArgs;
export type ActionArgs = Route.ActionArgs;

// Edge case: Complex type imports
import type { 
  Route.MetaFunction,
  Route.LinksFunction,
  Route.HeadersFunction 
} from 'react-router';

// Edge case: Aliased imports
import { data as jsonResponse } from 'react-router';

// Edge case: Function with same name as component
function ServerRouter() {
  return null;
}

const additionalContext = {
  extraProp: 'value'
} as const;

declare namespace ReactRouter {
  interface AppLoadContext {
    extraProp: any;
  }
}

// Edge case: Spread in context
export function createHydrogenRouterContext(request: Request, env: Env) {
  const hydrogenContext = createHydrogenContext({ request, env });
  const customContext = getCustomContext();
  
  return Object.assign({}, hydrogenContext, customContext, additionalContext);
}