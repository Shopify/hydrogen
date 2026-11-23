import { jsonLdScript } from "~/lib/json-ld";

export type BreadcrumbJsonLdItem = {
  name: string;
  /** Path from the site root, for example `/collections/shoes`. */
  path: string;
};

export function BreadcrumbJsonLd({
  items,
  origin,
}: {
  items: BreadcrumbJsonLdItem[];
  origin: string;
}) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: `${origin}${item.path}`,
    })),
  };

  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(jsonLd) }} />
  );
}
