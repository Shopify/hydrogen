import {LoaderFunctionArgs, useLoaderData} from 'react-router';

export async function loader({context}: LoaderFunctionArgs) {
  const data = await context.storefront.query(
    `
  query ProductQuery($handle: String) {
    product(handle: $handle) {
      id
      handle
      ... @defer(label: "deferredFields") {
        title
        description
      }
    }
  }
`,
    {
      variables: {
        handle: 'v2-snowboard',
      },
    },
  );
  return data;
}

export default function Test() {
  const data = useLoaderData<typeof loader>();
  return <div>{data?.product?.title}</div>;
}
