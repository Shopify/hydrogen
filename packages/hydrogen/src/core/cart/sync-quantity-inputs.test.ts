// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from "vitest";

import { syncQuantityInputs } from "./sync-quantity-inputs";

const CART_ENDPOINT = "/api/cart";

function createCartForm(lineId: string, quantity: string, inputType = "text"): HTMLFormElement {
  const form = document.createElement("form");
  form.action = CART_ENDPOINT;

  const lineInput = document.createElement("input");
  lineInput.type = "hidden";
  lineInput.name = "lineId";
  lineInput.value = lineId;
  form.appendChild(lineInput);

  const qtyInput = document.createElement("input");
  qtyInput.type = inputType;
  qtyInput.name = "quantity";
  qtyInput.value = quantity;
  form.appendChild(qtyInput);

  document.body.appendChild(form);
  return form;
}

beforeEach(() => {
  while (document.body.firstChild) {
    document.body.removeChild(document.body.firstChild);
  }
});

describe("syncQuantityInputs", () => {
  it("updates visible input with matching lineId", () => {
    createCartForm("line-1", "1");

    syncQuantityInputs([{ id: "line-1", quantity: 5 }], CART_ENDPOINT);

    const input = document.querySelector('input[name="quantity"]') as HTMLInputElement;
    expect(input.value).toBe("5");
  });

  it("leaves hidden inputs unchanged", () => {
    createCartForm("line-1", "1", "hidden");

    syncQuantityInputs([{ id: "line-1", quantity: 5 }], CART_ENDPOINT);

    const input = document.querySelector('input[name="quantity"]') as HTMLInputElement;
    expect(input.value).toBe("1");
  });

  it("does not overwrite focused input", () => {
    createCartForm("line-1", "7");
    const input = document.querySelector('input[name="quantity"]') as HTMLInputElement;
    input.focus();

    syncQuantityInputs([{ id: "line-1", quantity: 5 }], CART_ENDPOINT);

    expect(input.value).toBe("7");
  });

  it("updates multiple forms matching the endpoint", () => {
    createCartForm("line-1", "1");
    createCartForm("line-2", "2");

    syncQuantityInputs(
      [
        { id: "line-1", quantity: 10 },
        { id: "line-2", quantity: 20 },
      ],
      CART_ENDPOINT,
    );

    const inputs = document.querySelectorAll(
      'input[name="quantity"]',
    ) as NodeListOf<HTMLInputElement>;
    expect(inputs[0].value).toBe("10");
    expect(inputs[1].value).toBe("20");
  });

  it("ignores forms with different actions", () => {
    const form = document.createElement("form");
    form.action = "/other-endpoint";
    const lineInput = document.createElement("input");
    lineInput.type = "hidden";
    lineInput.name = "lineId";
    lineInput.value = "line-1";
    form.appendChild(lineInput);
    const qtyInput = document.createElement("input");
    qtyInput.type = "text";
    qtyInput.name = "quantity";
    qtyInput.value = "1";
    form.appendChild(qtyInput);
    document.body.appendChild(form);

    syncQuantityInputs([{ id: "line-1", quantity: 5 }], CART_ENDPOINT);

    expect(qtyInput.value).toBe("1");
  });

  it("updates input that was blurred after Enter key submission", () => {
    createCartForm("line-1", "999");
    const input = document.querySelector('input[name="quantity"]') as HTMLInputElement;

    expect(document.activeElement).not.toBe(input);

    syncQuantityInputs([{ id: "line-1", quantity: 100 }], CART_ENDPOINT);

    expect(input.value).toBe("100");
  });

  it("skips form when lineId input is missing", () => {
    const form = document.createElement("form");
    form.action = CART_ENDPOINT;
    const qtyInput = document.createElement("input");
    qtyInput.type = "text";
    qtyInput.name = "quantity";
    qtyInput.value = "1";
    form.appendChild(qtyInput);
    document.body.appendChild(form);

    syncQuantityInputs([{ id: "line-1", quantity: 5 }], CART_ENDPOINT);

    expect(qtyInput.value).toBe("1");
  });
});
