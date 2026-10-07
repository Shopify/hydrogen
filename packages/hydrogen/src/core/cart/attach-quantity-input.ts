const FIRST_SUBMIT_BUTTON_SELECTOR = "button:not([type=button])";

/**
 * Submits a cart form when a customer changes the value of the form's quantity input.
 *
 * The function submits the form through the form's first submit button. Make that button the set button from `register("set")`. The function throws when the first submit button is any other button. The function submits only while the form is in the document.
 *
 * The React cart form hook attaches the behavior to an interactive quantity input. Call the function yourself in Vue and in frameworks without a binding.
 *
 * @param inputEl The quantity input whose change events submit the form.
 * @param formEl The cart form that contains the input and its set submit button.
 * @returns A cleanup function that removes the change listener.
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
