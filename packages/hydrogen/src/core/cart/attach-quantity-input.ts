const FIRST_SUBMIT_BUTTON_SELECTOR = "button:not([type=button])";

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
