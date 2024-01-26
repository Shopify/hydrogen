import {SECTION_HERO_FRAGMENT, SectionHero} from '~/sections/SectionHero';
import {
  SECTION_FEATURED_PRODUCTS_FRAGMENT,
  SectionFeaturedProducts,
} from '~/sections/SectionFeaturedProducts';
import {
  SECTION_FEATURED_COLLECTIONS_FRAGMENT,
  SectionFeaturedCollections,
} from '~/sections/SectionFeaturedCollections';
import {
  SECTION_RICHTEXT_FRAGMENT,
  SectionRichText,
} from '~/sections/SectionRichText';
import {SECTION_STORES_FRAGMENT, SectionStores} from '~/sections/SectionStores';
import {
  SECTION_STORE_PROFILE_FRAGMENT,
  SectionStoreProfile,
} from '~/sections/SectionStoreProfile';

import type {SectionsFragment} from 'storefrontapi.generated';

export function Sections({sections}: {sections: SectionsFragment}) {
  return (
    <div className="sections">
      {sections?.references?.nodes.map((section) => {
        switch (section.type) {
          case 'section_hero':
            return <SectionHero {...section} key={section.id} />;
          case 'section_featured_products':
            return <SectionFeaturedProducts {...section} key={section.id} />;
          case 'section_featured_collections':
            return <SectionFeaturedCollections {...section} key={section.id} />;
          case 'section_richtext':
            return <SectionRichText {...section} key={section.id} />;
          case 'section_stores':
            return <SectionStores {...section} key={section.id} />;
          case 'section_store_profile':
            return <SectionStoreProfile {...section} key={section.id} />;
          // case 'section_another':
          //   return <AnotherSection />;
          default:
            // eslint-disable-next-line no-console
            console.log(`Unsupported section type: ${section.type}`);
            return null;
        }
      })}
    </div>
  );
}

export const SECTIONS_FRAGMENT = `#graphql
  fragment Sections on MetaobjectField {
    ... on MetaobjectField {
      references(first: 10) {
        nodes {
          ... on Metaobject {
            id
            type
            ...SectionHero
            ...SectionFeaturedProducts
            ...SectionFeaturedCollections
            ...SectionRichText
            ...SectionStores
            ...SectionStoreProfile
          }
        }
      }
    }
  }
  # All section fragments
  ${SECTION_HERO_FRAGMENT}
  ${SECTION_FEATURED_PRODUCTS_FRAGMENT}
  ${SECTION_FEATURED_COLLECTIONS_FRAGMENT}
  ${SECTION_RICHTEXT_FRAGMENT}
  ${SECTION_STORES_FRAGMENT}
  ${SECTION_STORE_PROFILE_FRAGMENT}
`;
