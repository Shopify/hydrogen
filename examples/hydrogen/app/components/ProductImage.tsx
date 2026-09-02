import { Image } from "~/components/Image";

type ProductImageData = {
  altText?: string | null;
  height?: number | null;
  id?: string | null;
  url: string;
  width?: number | null;
} | null;

export function ProductImage({ image }: { image: ProductImageData }) {
  if (!image) {
    return <div className="product-image" />;
  }
  return (
    <div className="product-image">
      <Image
        alt={image.altText || "Product Image"}
        aspectRatio="1/1"
        data={image}
        key={image.id}
        sizes="(min-width: 45em) 50vw, 100vw"
      />
    </div>
  );
}
