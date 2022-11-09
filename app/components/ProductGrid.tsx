import {Link} from '~/components';
import type {
  Product,
  ProductConnection,
} from '@shopify/hydrogen-ui-alpha/storefront-api-types';
import {Paginated} from '~/components/Paginated';
import {ProductGridInfinite} from '~/components/ProductGridInfinite';
import {Grid, ProductCard} from '~/components';
import {getImageLoadingPriority} from '~/lib/const';

export function ProductGrid({
  paginated = true,
  products,
  ...props
}: {
  paginated?: boolean;
  products: ProductConnection;
  [key: string]: any;
}) {
  if (!products?.nodes?.length) {
    return (
      <>
        <p>No products found on this collection</p>
        <Link to="/products">
          <p className="underline">Browse catalog</p>
        </Link>
      </>
    );
  }

  return paginated ? (
    <Paginated connection={products}>
      <Paginated.Grid>
        {({nodes}) => {
          return (
            <Grid layout="products">
              {nodes.map((product, i: number) => (
                <ProductCard
                  key={product.id}
                  product={product as Product}
                  loading={getImageLoadingPriority(i)}
                />
              ))}
            </Grid>
          );
        }}
      </Paginated.Grid>
      {/* TODO:
        Consider adding <Paginated.Buttons> so that we can add
        rendering flexibility for Paginated.Previous and Paginated.Next
        e.g render them inside a flex container
      */}
      <Paginated.Previous>
        {({isLoading}) => <span>{isLoading ? 'Loading...' : 'Previous'}</span>}
      </Paginated.Previous>

      <Paginated.Next>
        {({isLoading}) => <span>{isLoading ? 'Loading...' : 'Next'}</span>}
      </Paginated.Next>
    </Paginated>
  ) : (
    <ProductGridInfinite {...props} products={products} />
  );
}
