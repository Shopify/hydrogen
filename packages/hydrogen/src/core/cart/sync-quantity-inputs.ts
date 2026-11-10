export function syncQuantityInputs(
  updates: Array<{ id: string; quantity: number }>,
  cartEndpoint: string,
): void {
  const forms = document.querySelectorAll<HTMLFormElement>(
    `form[action="${CSS.escape(cartEndpoint)}"]`,
  );

  for (const form of forms) {
    for (const { id, quantity } of updates) {
      const lineIdInput = form.querySelector<HTMLInputElement>(
        `input[name="lineId"][value="${CSS.escape(id)}"]`,
      );
      if (!lineIdInput) continue;

      const quantityInput = form.querySelector<HTMLInputElement>('input[name="quantity"]');
      if (!quantityInput) continue;
      if (quantityInput.type === "hidden") continue;
      if (document.activeElement === quantityInput) continue;

      quantityInput.value = String(quantity);
    }
  }
}
