import {Image} from '@shopify/hydrogen';
import type {ImageTextFragment} from 'storefrontapi.generated';

export function ImageText({heading, image}: ImageTextFragment) {
  return (
    <section className="section_image_text">
      {image?.reference?.image && (
        <Image
          sizes="100vw"
          data={image.reference.image}
          style={{
            height: 600,
            objectFit: 'cover',
          }}
        />
      )}
      {heading && <h1>{heading.value}</h1>}
    </section>
  );
}
