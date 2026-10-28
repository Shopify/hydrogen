import { describe, expect, it } from "vitest";

import { detectFriction } from "./friction";

describe("detectFriction", () => {
  it("finds nothing in a clean run", () => {
    // Real notes from a passing healthy run.
    const clean = [
      "I can see the product page. I need to select Size: Large and Material: Fleece. Let me click Large.",
      "Size: Large and Material: Fleece are selected. Now let me increase the quantity to 2.",
      "Quantity is now 2. Now let me click Add to cart.",
      "The cart now shows 2 items. Now I'll click Checkout to proceed.",
    ];
    expect(detectFriction(clean)).toEqual([]);
  });

  it("flags the notes where the agent worked around the store", () => {
    // Real notes from the quantity-ignored fault: the agent fixed the quantity in the cart.
    const workaround = [
      "Quantity is now 2. Now let me click Add to cart.",
      "I can see the cart shows only 1 item. I need to increase the quantity to 2.",
      "The cart now shows 2 items.",
    ];
    expect(detectFriction(workaround)).toEqual([workaround[1]]);
  });

  it("flags retries after an error or a wrong item", () => {
    expect(
      detectFriction([
        "I see an error message. Let me try again.",
        "The cart still shows Small / Cotton.",
      ]),
    ).toHaveLength(2);
  });
});
