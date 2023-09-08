import {
  Await,
  useLoaderData,
  useAsyncError,
  useRouteError,
} from '@remix-run/react';
import {type LoaderArgs, defer} from '@shopify/remix-oxygen';
import {Suspense} from 'react';

export async function loader({context}: LoaderArgs) {
  // does not block the rest of the loader
  Promise.reject('it broke');

  // Causes an error because nameA isn't in the schema
  // But it gets caught by Remix
  const a = context.storefront.query(
    `#graphql
  query a { 
    shop {
      nameA
    }
  }`,
  );

  // Same here, make another bad request
  const b = context.storefront.query(
    `#graphql
  query b {
    shop {
      nameB
    }
  }`,
  );

  const c = await context.storefront.query(`#graphql
  query c {
    shop {
      name
    }
  }
  `);

  return defer({a, b, c});
}

function ErrorElement({label}: {label: string}) {
  const error = useAsyncError() as any;
  return (
    <h1 className="bg-red-600 text-white">
      {label}: {error.message}
    </h1>
  );
}

export default function () {
  const {a, b, c} = useLoaderData();

  return (
    <div>
      <Suspense fallback={<div>Loading ...</div>}>
        <Await errorElement={<ErrorElement label="A" />} resolve={a}>
          {(a) => <h1>A: {JSON.stringify(a)}</h1>}
        </Await>
        <Await errorElement={<ErrorElement label="B" />} resolve={b}>
          {(b) => <h1>B: {JSON.stringify(b)}</h1>}
        </Await>
      </Suspense>
      <h1>C: {JSON.stringify(c)}</h1>
    </div>
  );
}

export function ErrorBoundary() {
  const error = useRouteError() as any;
  return <div>The whole page broke: {error.message}</div>;
}
