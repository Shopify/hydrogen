Basic CLI

- [] shadow route
- [] generate a route
- [] generate all routes

`h2 generate route page/products/product-details --path /es/productos`

does this route need a loader?

h2 g route products

```
// routes/products.tsx

import {useLoaderData} from '@remix-run/react`

export function loader({context: {storefront}}) {
  return json({
    products: await storefront.query({query: PRODUCTS_QUERY)
  })
}

export default function products() {
  const {products} = useLoaderData();


  return (
    <div>
      <p>this route is fetching is fetching this data...</p>
      <pre>{JSON.stringify(products, null, 2)}</p>
      <p>Edit this file at `routes/products`.</p>
    </div>
  )
}


const PRODUCTS_QUERY = gql`...`

```

what route...\\

[x] products
[x] collection
[x] cart
