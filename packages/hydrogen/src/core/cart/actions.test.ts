import { describe, it, expect } from "vitest";

import { parseCartRequest } from "./actions";

function jsonRequest(body: unknown): Request {
  return new Request("http://localhost/api/cart", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function formRequest(fields: Record<string, string>): Request {
  const params = new URLSearchParams(fields);
  return new Request("http://localhost/api/cart", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });
}

function multipartRequest(fields: Record<string, string>): Request {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    form.append(key, value);
  }
  return new Request("http://localhost/api/cart", {
    method: "POST",
    body: form,
  });
}

describe("parseCartRequest", () => {
  describe("JSON — line classification", () => {
    it("classifies lines with merchandiseId and no id as add", async () => {
      const action = await parseCartRequest(
        jsonRequest({
          lines: [{ merchandiseId: "gid://shopify/ProductVariant/1", quantity: 2 }],
        }),
      );
      expect(action).toEqual({
        intent: "add",
        lines: [{ merchandiseId: "gid://shopify/ProductVariant/1", quantity: 2 }],
      });
    });

    it("preserves optional attributes and sellingPlanId on add lines", async () => {
      const action = await parseCartRequest(
        jsonRequest({
          lines: [
            {
              merchandiseId: "gid://shopify/ProductVariant/1",
              quantity: 1,
              attributes: [{ key: "gift", value: "true" }],
              sellingPlanId: "gid://shopify/SellingPlan/1",
            },
          ],
        }),
      );
      expect(action).toEqual({
        intent: "add",
        lines: [
          {
            merchandiseId: "gid://shopify/ProductVariant/1",
            quantity: 1,
            attributes: [{ key: "gift", value: "true" }],
            sellingPlanId: "gid://shopify/SellingPlan/1",
          },
        ],
      });
    });

    it("classifies lines with id and quantity > 0 as update", async () => {
      const action = await parseCartRequest(
        jsonRequest({
          lines: [{ id: "gid://shopify/CartLine/1", quantity: 3 }],
        }),
      );
      expect(action).toEqual({
        intent: "update",
        lines: [{ id: "gid://shopify/CartLine/1", quantity: 3 }],
      });
    });

    it("classifies lines with id and quantity === 0 as remove", async () => {
      const action = await parseCartRequest(
        jsonRequest({
          lines: [{ id: "gid://shopify/CartLine/1", quantity: 0 }],
        }),
      );
      expect(action).toEqual({
        intent: "remove",
        lineIds: ["gid://shopify/CartLine/1"],
      });
    });

    it("handles multiple remove lines", async () => {
      const action = await parseCartRequest(
        jsonRequest({
          lines: [
            { id: "gid://shopify/CartLine/1", quantity: 0 },
            { id: "gid://shopify/CartLine/2", quantity: 0 },
          ],
        }),
      );
      expect(action).toEqual({
        intent: "remove",
        lineIds: ["gid://shopify/CartLine/1", "gid://shopify/CartLine/2"],
      });
    });

    it("rejects mixed add and update lines", async () => {
      await expect(
        parseCartRequest(
          jsonRequest({
            lines: [
              { merchandiseId: "gid://shopify/ProductVariant/1", quantity: 1 },
              { id: "gid://shopify/CartLine/2", quantity: 3 },
            ],
          }),
        ),
      ).rejects.toThrow(/mixed/i);
    });

    it("rejects mixed add and remove lines", async () => {
      await expect(
        parseCartRequest(
          jsonRequest({
            lines: [
              { merchandiseId: "gid://shopify/ProductVariant/1", quantity: 1 },
              { id: "gid://shopify/CartLine/2", quantity: 0 },
            ],
          }),
        ),
      ).rejects.toThrow(/mixed/i);
    });

    it("rejects mixed update and remove lines", async () => {
      await expect(
        parseCartRequest(
          jsonRequest({
            lines: [
              { id: "gid://shopify/CartLine/1", quantity: 5 },
              { id: "gid://shopify/CartLine/2", quantity: 0 },
            ],
          }),
        ),
      ).rejects.toThrow(/mixed/i);
    });
  });

  describe("JSON — discount and note payloads", () => {
    it("parses discountCodes array as discount-update", async () => {
      const action = await parseCartRequest(jsonRequest({ discountCodes: ["SAVE10", "BOGO"] }));
      expect(action).toEqual({
        intent: "discount-update",
        discountCodes: ["SAVE10", "BOGO"],
      });
    });

    it("parses note string as note-update", async () => {
      const action = await parseCartRequest(jsonRequest({ note: "Please gift wrap" }));
      expect(action).toEqual({
        intent: "note-update",
        note: "Please gift wrap",
      });
    });

    it("parses empty note string as note-update", async () => {
      const action = await parseCartRequest(jsonRequest({ note: "" }));
      expect(action).toEqual({ intent: "note-update", note: "" });
    });
  });

  describe("JSON — validation errors", () => {
    it("rejects empty body", async () => {
      await expect(parseCartRequest(jsonRequest({}))).rejects.toThrow();
    });

    it("rejects empty lines array", async () => {
      await expect(parseCartRequest(jsonRequest({ lines: [] }))).rejects.toThrow();
    });

    it("rejects negative quantity", async () => {
      await expect(
        parseCartRequest(
          jsonRequest({
            lines: [{ merchandiseId: "gid://shopify/ProductVariant/1", quantity: -1 }],
          }),
        ),
      ).rejects.toThrow(/quantity/i);
    });

    it("rejects non-integer quantity", async () => {
      await expect(
        parseCartRequest(
          jsonRequest({
            lines: [{ merchandiseId: "gid://shopify/ProductVariant/1", quantity: 1.5 }],
          }),
        ),
      ).rejects.toThrow(/quantity/i);
    });

    it("rejects non-numeric quantity", async () => {
      await expect(
        parseCartRequest(
          jsonRequest({
            lines: [{ merchandiseId: "gid://shopify/ProductVariant/1", quantity: "two" }],
          }),
        ),
      ).rejects.toThrow(/quantity/i);
    });

    it("rejects add line with missing merchandiseId", async () => {
      await expect(parseCartRequest(jsonRequest({ lines: [{ quantity: 1 }] }))).rejects.toThrow();
    });

    it("rejects add line with empty merchandiseId", async () => {
      await expect(
        parseCartRequest(jsonRequest({ lines: [{ merchandiseId: "", quantity: 1 }] })),
      ).rejects.toThrow();
    });

    it("rejects update line with empty id", async () => {
      await expect(
        parseCartRequest(jsonRequest({ lines: [{ id: "", quantity: 1 }] })),
      ).rejects.toThrow();
    });
  });

  describe("FormData — line intents", () => {
    it("increase increments the quantity", async () => {
      const action = await parseCartRequest(
        formRequest({
          intent: "increase",
          lineId: "gid://shopify/CartLine/1",
          quantity: "5",
        }),
      );
      expect(action).toEqual({
        intent: "update",
        lines: [{ id: "gid://shopify/CartLine/1", quantity: 6 }],
      });
    });

    it("decrease decrements the quantity", async () => {
      const action = await parseCartRequest(
        formRequest({
          intent: "decrease",
          lineId: "gid://shopify/CartLine/1",
          quantity: "5",
        }),
      );
      expect(action).toEqual({
        intent: "update",
        lines: [{ id: "gid://shopify/CartLine/1", quantity: 4 }],
      });
    });

    it("decrease from quantity 1 becomes remove", async () => {
      const action = await parseCartRequest(
        formRequest({
          intent: "decrease",
          lineId: "gid://shopify/CartLine/1",
          quantity: "1",
        }),
      );
      expect(action).toEqual({
        intent: "remove",
        lineIds: ["gid://shopify/CartLine/1"],
      });
    });

    it("decrease from quantity 0 becomes remove", async () => {
      const action = await parseCartRequest(
        formRequest({
          intent: "decrease",
          lineId: "gid://shopify/CartLine/1",
          quantity: "0",
        }),
      );
      expect(action).toEqual({
        intent: "remove",
        lineIds: ["gid://shopify/CartLine/1"],
      });
    });

    it("remove intent produces remove action", async () => {
      const action = await parseCartRequest(
        formRequest({
          intent: "remove",
          lineId: "gid://shopify/CartLine/1",
        }),
      );
      expect(action).toEqual({
        intent: "remove",
        lineIds: ["gid://shopify/CartLine/1"],
      });
    });

    it("set intent uses quantity as-is (no arithmetic)", async () => {
      const action = await parseCartRequest(
        formRequest({
          intent: "set",
          lineId: "gid://shopify/CartLine/1",
          quantity: "7",
        }),
      );
      expect(action).toEqual({
        intent: "update",
        lines: [{ id: "gid://shopify/CartLine/1", quantity: 7 }],
      });
    });

    it("set intent with quantity 0 becomes remove", async () => {
      const action = await parseCartRequest(
        formRequest({
          intent: "set",
          lineId: "gid://shopify/CartLine/1",
          quantity: "0",
        }),
      );
      expect(action).toEqual({
        intent: "remove",
        lineIds: ["gid://shopify/CartLine/1"],
      });
    });

    it("set intent with negative quantity becomes remove", async () => {
      const action = await parseCartRequest(
        formRequest({
          intent: "set",
          lineId: "gid://shopify/CartLine/1",
          quantity: "-5",
        }),
      );
      expect(action).toEqual({
        intent: "remove",
        lineIds: ["gid://shopify/CartLine/1"],
      });
    });

    it("merchandiseId without lineId infers add", async () => {
      const action = await parseCartRequest(
        formRequest({
          merchandiseId: "gid://shopify/ProductVariant/42",
          quantity: "2",
        }),
      );
      expect(action).toEqual({
        intent: "add",
        lines: [{ merchandiseId: "gid://shopify/ProductVariant/42", quantity: 2 }],
      });
    });

    it("merchandiseId defaults quantity to 1", async () => {
      const action = await parseCartRequest(
        formRequest({
          merchandiseId: "gid://shopify/ProductVariant/42",
        }),
      );
      expect(action).toEqual({
        intent: "add",
        lines: [{ merchandiseId: "gid://shopify/ProductVariant/42", quantity: 1 }],
      });
    });

    it("implicit add includes sellingPlanId when present", async () => {
      const action = await parseCartRequest(
        formRequest({
          merchandiseId: "gid://shopify/ProductVariant/42",
          quantity: "1",
          sellingPlanId: "gid://shopify/SellingPlan/1",
        }),
      );
      expect(action).toEqual({
        intent: "add",
        lines: [
          {
            merchandiseId: "gid://shopify/ProductVariant/42",
            quantity: 1,
            sellingPlanId: "gid://shopify/SellingPlan/1",
          },
        ],
      });
    });

    it("implicit add without sellingPlanId does not include the key", async () => {
      const action = await parseCartRequest(
        formRequest({
          merchandiseId: "gid://shopify/ProductVariant/42",
          quantity: "1",
        }),
      );
      expect(action).toEqual({
        intent: "add",
        lines: [{ merchandiseId: "gid://shopify/ProductVariant/42", quantity: 1 }],
      });
      expect("sellingPlanId" in (action as { lines: Record<string, unknown>[] }).lines[0]).toBe(
        false,
      );
    });
  });

  describe("FormData — explicit add intent", () => {
    it("intent=add with merchandiseId produces add action", async () => {
      const action = await parseCartRequest(
        formRequest({
          intent: "add",
          merchandiseId: "gid://shopify/ProductVariant/42",
          quantity: "3",
        }),
      );
      expect(action).toEqual({
        intent: "add",
        lines: [{ merchandiseId: "gid://shopify/ProductVariant/42", quantity: 3 }],
      });
    });

    it("intent=add defaults quantity to 1", async () => {
      const action = await parseCartRequest(
        formRequest({
          intent: "add",
          merchandiseId: "gid://shopify/ProductVariant/42",
        }),
      );
      expect(action).toEqual({
        intent: "add",
        lines: [{ merchandiseId: "gid://shopify/ProductVariant/42", quantity: 1 }],
      });
    });

    it("intent=add without merchandiseId rejects", async () => {
      await expect(parseCartRequest(formRequest({ intent: "add" }))).rejects.toThrow(
        /merchandiseId/i,
      );
    });

    it("intent=add with sellingPlanId includes it in the line", async () => {
      const action = await parseCartRequest(
        formRequest({
          intent: "add",
          merchandiseId: "gid://shopify/ProductVariant/42",
          sellingPlanId: "gid://shopify/SellingPlan/1",
        }),
      );
      expect(action).toEqual({
        intent: "add",
        lines: [
          {
            merchandiseId: "gid://shopify/ProductVariant/42",
            quantity: 1,
            sellingPlanId: "gid://shopify/SellingPlan/1",
          },
        ],
      });
    });

    it("intent=add with all fields composes correctly", async () => {
      const action = await parseCartRequest(
        formRequest({
          intent: "add",
          merchandiseId: "gid://shopify/ProductVariant/42",
          quantity: "5",
          sellingPlanId: "gid://shopify/SellingPlan/99",
        }),
      );
      expect(action).toEqual({
        intent: "add",
        lines: [
          {
            merchandiseId: "gid://shopify/ProductVariant/42",
            quantity: 5,
            sellingPlanId: "gid://shopify/SellingPlan/99",
          },
        ],
      });
    });
  });

  describe("FormData — discount intents", () => {
    it("discount-apply produces discount-apply action", async () => {
      const action = await parseCartRequest(
        formRequest({ intent: "discount-apply", discountCode: "SAVE10" }),
      );
      expect(action).toEqual({ intent: "discount-apply", code: "SAVE10" });
    });

    it("discount-remove produces discount-remove action", async () => {
      const action = await parseCartRequest(
        formRequest({ intent: "discount-remove", discountCode: "SAVE10" }),
      );
      expect(action).toEqual({ intent: "discount-remove", code: "SAVE10" });
    });
  });

  describe("FormData — note intent", () => {
    it("note-update produces note-update action", async () => {
      const action = await parseCartRequest(
        formRequest({ intent: "note-update", note: "Please gift wrap" }),
      );
      expect(action).toEqual({ intent: "note-update", note: "Please gift wrap" });
    });

    it("note-update with empty note is valid", async () => {
      const action = await parseCartRequest(formRequest({ intent: "note-update", note: "" }));
      expect(action).toEqual({ intent: "note-update", note: "" });
    });

    it("note-update without note field rejects", async () => {
      await expect(parseCartRequest(formRequest({ intent: "note-update" }))).rejects.toThrow(
        /note/i,
      );
    });
  });

  describe("FormData — validation errors", () => {
    it("rejects missing lineId with increase intent", async () => {
      await expect(
        parseCartRequest(formRequest({ intent: "increase", quantity: "3" })),
      ).rejects.toThrow(/lineId/i);
    });

    it("rejects missing quantity with increase intent", async () => {
      await expect(
        parseCartRequest(formRequest({ intent: "increase", lineId: "gid://shopify/CartLine/1" })),
      ).rejects.toThrow(/quantity/i);
    });

    it("rejects missing discountCode with discount-apply", async () => {
      await expect(parseCartRequest(formRequest({ intent: "discount-apply" }))).rejects.toThrow(
        /discountCode/i,
      );
    });

    it("rejects unknown intent value", async () => {
      await expect(parseCartRequest(formRequest({ intent: "explode" }))).rejects.toThrow(/intent/i);
    });
  });

  describe("content-type dispatch", () => {
    it("dispatches application/json to JSON parsing", async () => {
      const action = await parseCartRequest(jsonRequest({ note: "test" }));
      expect(action.intent).toBe("note-update");
    });

    it("dispatches application/x-www-form-urlencoded to FormData parsing", async () => {
      const action = await parseCartRequest(
        formRequest({ intent: "remove", lineId: "gid://shopify/CartLine/1" }),
      );
      expect(action.intent).toBe("remove");
    });

    it("dispatches multipart/form-data to FormData parsing", async () => {
      const action = await parseCartRequest(
        multipartRequest({ intent: "remove", lineId: "gid://shopify/CartLine/1" }),
      );
      expect(action.intent).toBe("remove");
    });

    it("rejects unsupported content-type", async () => {
      const request = new Request("http://localhost/api/cart", {
        method: "POST",
        headers: { "content-type": "text/plain" },
        body: "hello",
      });
      await expect(parseCartRequest(request)).rejects.toThrow(/content-type/i);
    });
  });
});
