import type {ProductVariantFragment} from 'storefrontapi.generated';
import {Image} from '@shopify/hydrogen';
import {BundleBadge} from './BundleBadge';

export function ProductImage({
  image,
  isBundle = false,
}: {
  image: ProductVariantFragment['image'];
  isBundle: boolean;
}) {
  if (!image) {
    return <div className="product-image" />;
  }
  return (
    <div className="product-image">
      <Image
        alt={image.altText || 'Product Image'}
        aspectRatio="1/1"
        data={image}
        key={image.id}
        sizes="(min-width: 45em) 50vw, 100vw"
      />
      {isBundle ? <BundleBadge /> : null}
    </div>
  );
}
