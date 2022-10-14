import {useState} from 'react';
import {Grid, ProductCard} from '~/components';
import {getImageLoadingPriority} from '~/lib/const';
import type {ProductConnection} from '@shopify/hydrogen-ui-alpha/storefront-api-types';
import {MoreGridItems} from './MoreGridItems';


export function ProductGridInfinite({
  products: initialProducts,
  ...props
}: {
  products: ProductConnection;
  [key: string]: any;
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
          {...props}
          cursor={cursor}
          key={cursor}
          setCursor={setCursor}
          setHasNextPage={setHasNextPage}
          setItems={setProducts}
        />
      )}
    </>
  );
}
