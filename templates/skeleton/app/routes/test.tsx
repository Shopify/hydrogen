import {Await, useLoaderData} from '@remix-run/react';
import {defer, json} from '@remix-run/server-runtime';
import {Suspense} from 'react';

export async function loader() {
  const stuff = new Promise((resolve) =>
    setTimeout(() => resolve('stuff'), 1000),
  );

  return json({
    stuff: await stuff,
  });
}
export default function Test() {
  const {stuff} = useLoaderData<typeof loader>();

  return <div>{stuff as string}</div>;
}
