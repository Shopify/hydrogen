import {useState} from 'react';
import {Grid, ProductCard} from '~/components';
import {getImageLoadingPriority} from '~/lib/const';
import type {ProductConnection} from '@shopify/hydrogen-ui-alpha/storefront-api-types';
import {MoreGridItems} from './MoreGridItems';

export function ProductGridInfinite({
  products: initialProducts,
}: {
  products: ProductConnection;
}) {
  const [products, setProducts] = useState<ProductConnection['nodes'] | []>(
    initialProducts?.nodes || []
  );
  const [hasNextPage, setHasNextPage] = useState<boolean>(
    initialProducts?.pageInfo?.hasNextPage || false
  );
  const [cursor, setCursor] = useState<string | null>(
    initialProducts?.pageInfo?.endCursor || null
  );

  return (
    <>
      <Grid layout="products">
        {products.map((product: any, index) => {
          return (
            <ProductCard
              key={product.id}
              product={product}
              loading={getImageLoadingPriority(index)}
            />
          );
        })}
      </Grid>

      {/* Load additional collection products on scroll */}
      {hasNextPage && cursor && (
        <MoreGridItems
          cursor={cursor}
          key={cursor}
          className="grid-flow-row grid gap-2 gap-y-6 md:gap-4 lg:gap-6 grid-cols-2 md:grid-cols-2 lg:grid-cols-4"
          pageBy={4}
          placeholderItem={
            <div className="h-[244px] sm:h-[280px] md:h-[500px] lg:h-[300px] xl:h-[348px] 2xl:h-[500px] bg-gray-100"></div>
          }
          resource="products"
          setCursor={setCursor}
          setHasNextPage={setHasNextPage}
          setItems={setProducts}
        />
      )}
    </>
  );
}
