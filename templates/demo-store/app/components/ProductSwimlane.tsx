import type {HomepageFeaturedProductsQuery} from 'storefrontapi.generated';
import {ProductCard} from '~/components';

const mockProducts = {
  nodes: new Array(12).fill(''),
};

export function ProductSwimlane({
  products = mockProducts,
  count,
}: HomepageFeaturedProductsQuery & {count?: number}) {
  const limitTo = count ?? products.nodes.length;
  return (
    <div className="swimlane hiddenScroll md:pb-8 md:scroll-px-8 lg:scroll-px-12 md:px-8 lg:px-12">
      {products.nodes.slice(0, limitTo).map((product) => (
        <ProductCard
          product={product}
          key={product.id}
          className="snap-start w-80"
        />
      ))}
    </div>
  );
}
