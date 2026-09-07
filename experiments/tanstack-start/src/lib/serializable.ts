/**
 * Recursively drops `[key: string]: unknown` index signatures from a type.
 *
 * TanStack Start validates that server-function return types are serializable
 * and rejects `unknown` values. Hydrogen's `CartData` types keep open index
 * signatures so custom cart fragments can add fields, which trips that check.
 * Annotating the returned value with `StripIndexSignatures<T>` narrows the type
 * structurally (no assertion) while leaving the runtime value untouched.
 */
export type StripIndexSignatures<T> = T extends readonly (infer U)[]
  ? StripIndexSignatures<U>[]
  : T extends object
    ? {
        [K in keyof T as string extends K
          ? never
          : number extends K
            ? never
            : K]: StripIndexSignatures<T[K]>;
      }
    : T;
