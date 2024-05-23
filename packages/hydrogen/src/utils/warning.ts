const warnings = new Set<string>();
export const warnOnce = (string: string) => {
  if (!warnings.has(string)) {
    console.warn(string);
    warnings.add(string);
  }
};
