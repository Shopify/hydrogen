export type HeaderCollection = {
  handle: string;
  title: string;
};

type HeaderCollectionNode =
  | {
      handle?: string | null;
      title?: string | null;
    }
  | null
  | undefined;

export const HEADER_COLLECTIONS_QUERY = `
  query HeaderCollections {
    collections(first: 3) {
      nodes {
        handle
        title
      }
    }
  }
`;

export function normalizeHeaderCollections(
  collections: readonly HeaderCollectionNode[] | null | undefined,
): HeaderCollection[] {
  return (
    collections
      ?.filter((collection): collection is HeaderCollection =>
        Boolean(collection?.handle && collection.title),
      )
      .map((collection) => ({
        handle: collection.handle,
        title: collection.title,
      })) ?? []
  );
}
