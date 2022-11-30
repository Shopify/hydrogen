export function stripGId(text = ''): number {
  return parseInt(stripId(text));
}

export function stripId(text = ''): string {
  return text.substring(text.lastIndexOf('/') + 1);
}

export function addDataIf(
  keyValuePairs: Record<string, string | number | boolean>,
  formattedData: any,
): any {
  Object.entries(keyValuePairs).forEach(([key, value]) => {
    if (value) {
      formattedData[key] = value;
    }
  });
  return formattedData;
}
