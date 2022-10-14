import { json, type LoaderArgs,type  MetaFunction } from "@remix-run/cloudflare";
import { useLoaderData } from "@remix-run/react";
import type { ProductConnection } from "@shopify/hydrogen-ui-alpha/storefront-api-types";
import { PageHeader, Section, ProductGrid } from "~/components";
import { getAllProducts } from "~/data";

export async function loader({ request, params }: LoaderArgs) {
  const cursor = new URL(request.url).searchParams.get("cursor") ?? undefined;
  return json({
    products: await getAllProducts({ cursor, params })
  })
}

export const meta: MetaFunction = () => {
  return {
    title: "All Products",
    description: "All Products",
  };
};

export default function AllProducts() {
  const {products} = useLoaderData<typeof loader>();


  return (
    <>
      <PageHeader heading="All Products" variant="allCollections" />
      <Section>
        <ProductGrid
          key="products"
          products={products as ProductConnection}
        />
      </Section>
    </>
  );
}
