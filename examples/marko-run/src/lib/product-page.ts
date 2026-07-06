const SWATCHES: Record<string, string> = {
  Green: "#7ea993",
  Clay: "#7d6635",
  Ocean: "#5b8aa6",
  Purple: "#5e4a8a",
  Red: "#a26a72",
};

export function isColor(name: string): boolean {
  return name.toLowerCase() === "color";
}

export function swatchColor(value: {
  name: string;
  swatch?: { color?: string | null } | null;
}): string {
  return value.swatch?.color ?? SWATCHES[value.name] ?? "#999";
}

export function variantSearch(
  product: { options: { name: string }[] },
  selectedOptions: { name: string; value: string }[],
  currentSearch: string,
): string {
  const params = new URLSearchParams(currentSearch);
  for (const option of product.options) params.delete(option.name);
  for (const option of selectedOptions) params.set(option.name, option.value);
  const search = params.toString();
  return search ? `?${search}` : "";
}

export function isSelected(
  optionName: string,
  valueName: string,
  selectedOptions: { name: string; value: string }[],
): boolean {
  return selectedOptions.some((option) => option.name === optionName && option.value === valueName);
}
