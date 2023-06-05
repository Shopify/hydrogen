import {useFeaturedItems} from '~/hooks/useFeaturedItems';

import {FeaturedCollections} from './FeaturedCollections';
import {ProductSwimlane} from './ProductSwimlane';
import {Section} from './Text';

export function FeaturedSection({withSection = true}: {withSection?: boolean}) {
  const data = useFeaturedItems();

  if (!data) return null;

  const {featuredCollections, featuredProducts} = data;

  return (
    <>
      {featuredCollections.nodes.length &&
        (withSection ? (
          <Section title="Popular Collections">
            <FeaturedCollections collections={featuredCollections} />
          </Section>
        ) : (
          <FeaturedCollections collections={featuredCollections} />
        ))}
      {withSection ? (
        <Section title="Popular Products" padding="y">
          <ProductSwimlane products={featuredProducts} />
        </Section>
      ) : (
        <ProductSwimlane products={featuredProducts} />
      )}
    </>
  );
}
