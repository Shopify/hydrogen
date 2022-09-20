import type { Product } from "@shopify/hydrogen-ui-alpha/storefront-api-types";
import { ProductCard, Section } from "~/components";

const mockProducts = new Array(12).fill("");

export function ProductSwimlane({
  title = "Featured Products",
  data = mockProducts,
  count = 12,
  ...props
}) {
  return (
    <Section heading={title} padding="y" {...props}>
      <div className="swimlane hiddenScroll md:pb-8 md:scroll-px-8 lg:scroll-px-12 md:px-8 lg:px-12">
        <ProductCards products={data} />
      </div>
    </Section>
  );
}

function ProductCards({ products }: { products: Product[] }) {
  return (
    <>
      {products.map((product) => (
        <ProductCard
          product={product}
          key={product.id}
          className="snap-start w-80"
        />
      ))}
    </>
  );
}
