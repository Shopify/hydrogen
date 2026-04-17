const warnings = new Set<string>();
export const warnOnce = (string: string, type: 'warn' | 'info' = 'warn') => {
  if (!warnings.has(string)) {
    console[type](string);
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
