const FIRST_SUBMIT_BUTTON_SELECTOR = "button:not([type=button])";

/**
 * Attaches interactive quantity behavior to a DOM `<input>` inside a cart form.
 *
 * When the input's value changes, the form is automatically submitted via the
 * first submit button (which must carry `name="intent" value="set"`). Returns
 * a cleanup function that removes the event listener.
 *
 * The form must contain a `"set"` button as its first submit element — use
 * `register("set")` from `createCartFormRegister` to produce it.
 *
 * @throws If the form's first submit button is not a `name="intent" value="set"` button.
 *
 * @example
 * ```ts
 * const input = document.querySelector<HTMLInputElement>('input[name="quantity"]');
 * const form = input?.closest('form');
 *
 * if (input && form) {
 *   const detach = attachQuantityInput(input, form);
 *   // Input changes now auto-submit the form
 *
 *   // Clean up when unmounting
 *   detach();
 * }
 * ```
 */
export function attachQuantityInput(
  inputEl: HTMLInputElement,
  formEl: HTMLFormElement,
): () => void {
  const firstSubmitButton = formEl.querySelector(
    FIRST_SUBMIT_BUTTON_SELECTOR,
  ) as HTMLButtonElement | null;

  if (
    !firstSubmitButton ||
    firstSubmitButton.name !== "intent" ||
    firstSubmitButton.value !== "set"
  ) {
    throw new Error(
      `The first button in cart form must have a name of "intent" and value of "set". Your UI will not behave as expected.`,
      { cause: formEl },
    );
  }

  const handleChange = (e: Event) => {
    if (formEl.isConnected && e.target === inputEl) {
      formEl.requestSubmit(firstSubmitButton);
    }
  };

  inputEl.addEventListener("change", handleChange);

  return () => {
    inputEl.removeEventListener("change", handleChange);
  };
}
