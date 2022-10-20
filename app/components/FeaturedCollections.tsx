import {Image} from '@shopify/hydrogen-ui-alpha';
import type {Collection} from '@shopify/hydrogen-ui-alpha/storefront-api-types';
import {Link} from '@remix-run/react';
import {Heading, Section, Grid} from '~/components';
import { SerializeFrom } from '@remix-run/server-runtime';

export function FeaturedCollections({
  collections,
  title = 'Collections',
  ...props
}: {
  collections: SerializeFrom<Collection[]>;
  title?: string;
  [key: string]: any;
}) {
  const items = collections.filter((item) => item.image).length;
  const haveCollections = collections.length > 0;

  if (!haveCollections) return null;

  return (
    <Section {...props} heading={title}>
      <Grid items={items}>
        {collections.map((collection) => {
          if (!collection?.image) {
            return null;
          }
          return (
            <Link key={collection.id} to={`/collections/${collection.handle}`}>
              <div className="grid gap-4">
                <div className="card-image bg-primary/5 aspect-[3/2]">
                  {collection?.image && (
                    <Image
                      alt={`Image of ${collection.title}`}
                      data={collection.image}
                      height={400}
                      sizes="(max-width: 32em) 100vw, 33vw"
                      width={600}
                      widths={[400, 500, 600, 700, 800, 900]}
                      loaderOptions={{
                        scale: 2,
                        crop: 'center',
                      }}
                    />
                  )}
                </div>
                <Heading size="copy">{collection.title}</Heading>
              </div>
            </Link>
          );
        })}
      </Grid>
    </Section>
  );
}
