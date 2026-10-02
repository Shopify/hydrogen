import {
  createBreadcrumbJsonLd,
  type BreadcrumbItem,
  type JsonLd,
  serializeJsonLd,
} from "@shopify/hydrogen";

/**
 * Renders a JSON-LD node as `<script type="application/ld+json">`. The
 * payload goes through `serializeJsonLd()` so a description containing
 * `</script>` cannot break out of the element (F6). Never pass JSON as a
 * text child of `<script>`: React would HTML-escape it into invalid JSON.
 */
export function JsonLdScript({ data }: { data: JsonLd | readonly JsonLd[] }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  );
}

/** Shared breadcrumb structured data; the home crumb is always first (F13). */
export function BreadcrumbJsonLd({
  origin,
  items,
}: {
  origin: string;
  items: readonly BreadcrumbItem[];
}) {
  return (
    <JsonLdScript data={createBreadcrumbJsonLd([{ name: "Home", url: `${origin}/` }, ...items])} />
  );
}
