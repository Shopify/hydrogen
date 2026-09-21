/** Escapes text for safe interpolation into a double-quoted HTML attribute value. */
export function escapeAttribute(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Narrows an optional string to one containing non-whitespace content. */
export function hasContent(value: string | undefined): value is string {
  return typeof value === "string" && value.trim() !== "";
}
