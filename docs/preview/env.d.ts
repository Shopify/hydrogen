/// <reference types="vite/client" />
/// <reference types="@react-router/node" />

declare module 'virtual:docs.json' {
  const value: Array<Record<string, any>>;
  export default value;
}
