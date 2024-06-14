const warnings = new Set<string>();
export const warnOnce = (string: string) => {
  if (!warnings.has(string)) {
    console.warn(string);
    warnings.add(string);
  }
};

const errors = new Set<string>();
export const errorOnce = (string: string) => {
  if (!errors.has(string)) {
    console.error(new Error(string));
    errors.add(string);
  }
};
