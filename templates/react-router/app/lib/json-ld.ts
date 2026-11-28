/**
 * Serializes JSON-LD for a `<script type="application/ld+json">` element.
 * Escapes `<` so a value such as a collection title cannot close the script.
 */
export function jsonLdScript(data: object): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
