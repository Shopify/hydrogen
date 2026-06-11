type CartLineConnection = { nodes?: unknown };

type StandardActionsCart<TCart extends Record<string, unknown>> = Omit<TCart, "lines"> & {
  lines: unknown[];
};

export function toStandardActionsCart<TCart extends Record<string, unknown>>(
  cart: TCart | null,
): StandardActionsCart<TCart> | null {
  if (!cart) return null;

  const lines = cart.lines;
  if (Array.isArray(lines)) {
    return { ...cart, lines };
  }

  if (lines && typeof lines === "object") {
    const nodes = (lines as CartLineConnection).nodes;
    if (Array.isArray(nodes)) return { ...cart, lines: nodes };
  }

  return { ...cart, lines: [] };
}
