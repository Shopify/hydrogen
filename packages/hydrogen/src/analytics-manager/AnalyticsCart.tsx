import { useEffect } from "react";
import { type CartReturn } from "../cart/queries/cart-types";
import { useAnalyticsProvider } from "./AnalyticsProvider";

export function AnalyticsCart({
  currentCart,
  onCartDiff,
}: {
  currentCart: CartReturn | null;
  onCartDiff?: ({
    previousCart,
    currentCart,
    publish,
  }: {
    previousCart: CartReturn | null;
    currentCart: CartReturn | null;
    publish: (event: string, payload: Record<string, unknown>) => void;
  }) => void;
}) {
  const {publish, getCartRef} = useAnalyticsProvider();
  const cartRef = getCartRef();
  const previousCart = cartRef.current;

  useEffect(() => {
    cartRef.current = currentCart;
    if (!currentCart) return;

    // Compare previous cart against current cart lines
    // Detect quantity changes and missing cart lines
    previousCart?.lines.nodes.forEach((line) => {
      const matchedLineId = currentCart?.lines.nodes.filter((currentLine) => line.id === currentLine.id);
      if (matchedLineId.length === 1) {
        const matchedLine = matchedLineId[0];
        if (line.quantity < matchedLine.quantity) {
          publish('product_added_to_cart', {
            line,
            quantity: matchedLine.quantity,
          });
        } else if (line.quantity > matchedLine.quantity) {
          publish('product_removed_from_cart', {
            line,
            quantity: matchedLine.quantity,
          });
        }
      } else {
        publish('product_removed_from_cart', {
          line,
          quantity: 0,
        });
      }
    });

    // Compare current cart against previous cart lines
    // Detect new cart lines
    currentCart?.lines.nodes.forEach((line) => {
      const matchedLineId = previousCart?.lines.nodes.filter((previousLine) => line.id === previousLine.id);
      if (!matchedLineId || matchedLineId.length === 0) {
        publish('product_added_to_cart', {
          line,
          quantity: 1,
        });
      }
    });

    onCartDiff?.({previousCart, currentCart, publish});

  }, [previousCart, currentCart]);
  return null;
}
