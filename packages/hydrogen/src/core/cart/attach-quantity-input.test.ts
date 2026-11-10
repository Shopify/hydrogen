// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from "vitest";

import { attachQuantityInput } from "./attach-quantity-input";

function createFormWithInput(initialValue = "1"): {
  form: HTMLFormElement;
  input: HTMLInputElement;
  setButton: HTMLButtonElement;
} {
  const form = document.createElement("form");

  const input = document.createElement("input");
  input.type = "text";
  input.name = "quantity";
  input.value = initialValue;
  form.appendChild(input);

  const setButton = document.createElement("button");
  setButton.type = "submit";
  setButton.name = "intent";
  setButton.value = "set";
  setButton.hidden = true;
  form.appendChild(setButton);

  document.body.appendChild(form);
  return { form, input, setButton };
}

function changeInput(input: HTMLInputElement, value: string): void {
  input.value = value;
  input.dispatchEvent(new Event("change", { bubbles: true }));
}

beforeEach(() => {
  vi.restoreAllMocks();
  while (document.body.firstChild) {
    document.body.removeChild(document.body.firstChild);
  }
});

describe("attachQuantityInput", () => {
  it("submits with the explicit set button when the input changes", () => {
    const { form, input, setButton } = createFormWithInput();
    attachQuantityInput(input, form);

    const spy = vi.spyOn(form, "requestSubmit").mockImplementation(() => {});
    changeInput(input, "5");

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith(setButton);
  });

  it("does not submit on blur alone", () => {
    const { form, input } = createFormWithInput();
    attachQuantityInput(input, form);

    const spy = vi.spyOn(form, "requestSubmit").mockImplementation(() => {});
    input.value = "5";
    input.dispatchEvent(new FocusEvent("blur"));

    expect(spy).not.toHaveBeenCalled();
  });

  it("submits when a committed change is followed by tabbing to a submit button", () => {
    const { form, input, setButton } = createFormWithInput();
    const increaseButton = document.createElement("button");
    increaseButton.type = "submit";
    increaseButton.name = "intent";
    increaseButton.value = "increase";
    form.appendChild(increaseButton);
    attachQuantityInput(input, form);

    const spy = vi.spyOn(form, "requestSubmit").mockImplementation(() => {});
    changeInput(input, "5");
    input.dispatchEvent(new FocusEvent("blur", { relatedTarget: increaseButton }));

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith(setButton);
  });

  it("does not intercept Enter key behavior", () => {
    const { form, input } = createFormWithInput();
    attachQuantityInput(input, form);

    const spy = vi.spyOn(form, "requestSubmit").mockImplementation(() => {});
    const keyEvent = new KeyboardEvent("keydown", {
      key: "Enter",
      bubbles: true,
      cancelable: true,
    });
    const preventDefaultSpy = vi.spyOn(keyEvent, "preventDefault");

    input.dispatchEvent(keyEvent);

    expect(preventDefaultSpy).not.toHaveBeenCalled();
    expect(spy).not.toHaveBeenCalled();
  });

  it("throws when the set button is missing", () => {
    const form = document.createElement("form");
    const input = document.createElement("input");
    form.appendChild(input);
    document.body.appendChild(form);

    expect(() => attachQuantityInput(input, form)).toThrowError(
      `The first button in cart form must have a name of "intent" and value of "set". Your UI will not behave as expected.`,
    );
  });

  it("does not call requestSubmit when form is disconnected", () => {
    const { form, input } = createFormWithInput();
    attachQuantityInput(input, form);

    const spy = vi.spyOn(form, "requestSubmit").mockImplementation(() => {});
    document.body.removeChild(form);
    changeInput(input, "5");

    expect(spy).not.toHaveBeenCalled();
  });

  it("cleanup removes the change listener without removing the set button", () => {
    const { form, input, setButton } = createFormWithInput();
    const cleanup = attachQuantityInput(input, form);

    cleanup();

    const spy = vi.spyOn(form, "requestSubmit").mockImplementation(() => {});
    changeInput(input, "5");

    expect(spy).not.toHaveBeenCalled();
    expect(form.querySelector("button:not([type=button])")).toBe(setButton);
  });
});
