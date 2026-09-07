// Server-function input validators. They only check shape and types; the
// storefront meaning of the search string is interpreted once, server-side,
// by Hydrogen's own parsers.

function isRecord(input: unknown): input is Record<string, unknown> {
  return typeof input === "object" && input !== null;
}

export function searchInput(input: unknown): { search: string } {
  if (!isRecord(input) || typeof input.search !== "string") {
    throw new Error("Expected { search: string }.");
  }
  return { search: input.search };
}

export function handleAndSearchInput(input: unknown): { handle: string; search: string } {
  if (
    !isRecord(input) ||
    typeof input.handle !== "string" ||
    input.handle.length === 0 ||
    typeof input.search !== "string"
  ) {
    throw new Error("Expected { handle: string; search: string }.");
  }
  return { handle: input.handle, search: input.search };
}

export function handleInput(input: unknown): { handle: string } {
  if (!isRecord(input) || typeof input.handle !== "string" || input.handle.length === 0) {
    throw new Error("Expected { handle: string }.");
  }
  return { handle: input.handle };
}
