const FIRST_SUBMIT_BUTTON_SELECTOR = "button:not([type=button])";

/**
 * Submits a cart form when the customer changes the form's quantity input.
 *
 * Make the form's first submit button the set button from `register("set")`. The function throws when the first submit button is any other button.
 *
 * In React, register the quantity field with `interactive: true` in useCartForm, which calls the function for you. Call the function yourself in Vue and in frameworks without a binding.
 *
 * @param inputEl The quantity input that submits the form on change.
 * @param formEl The cart form that holds the input and the set button.
 * @returns A function that stops the automatic submits. Call the function when you remove the input.
 * @throws If the form's first submit button isn't the set button, which has `name="intent"` and `value="set"`.
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
 * @publicDocs
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
