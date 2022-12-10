import {useLoaderData} from '@remix-run/react';

export function loader({context: {storefront}}) {
  // console.log(storefront);
  // await storefront.query({query: 'query { shop { name } }'});
  // return {foo: 'bar'}
}
export default function Index() {
  const data = useLoaderData();

  return (
    <p>
      Edit this route in <em>app/routes/index.tsx</em>.
    </p>
  );
}
