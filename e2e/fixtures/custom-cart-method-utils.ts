import {expect, Locator} from '@playwright/test';

export class CustomCartMethodUtil {
  async waitForOptionSelectors(lineItem: Locator) {
    const optionSelectors = lineItem.getByRole('combobox');
    await expect(optionSelectors.first()).toBeVisible();
    return optionSelectors;
  }

  async selectDifferentOption(optionSelect: Locator) {
    const optionName = await optionSelect.getAttribute('name');
    if (!optionName) {
      throw new Error('Expected option select to have a name attribute');
    }

    const initialValue = await optionSelect.inputValue();
    const enabledOptionValues = await optionSelect.evaluate((element) => {
      const selectElement = element as HTMLSelectElement;
      return Array.from(selectElement.options)
        .filter((option) => !option.disabled && option.value.trim() !== '')
        .map((option) => option.value);
    });

    expect(enabledOptionValues.length).toBeGreaterThan(1);

    const nextValue = enabledOptionValues.find(
      (value) => value !== initialValue,
    );
    if (!nextValue) {
      throw new Error(
        'Expected option select to have at least two different values',
      );
    }

    await optionSelect.selectOption(nextValue);
    await expect(optionSelect).toHaveValue(nextValue);

    return {optionName, nextValue};
  }
}
