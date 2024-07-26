export function someContext() {
  return {
    a: 1,
  };
}

export type SomeContext = ReturnType<typeof someContext>;
