---
"skeleton": patch
"@shopify/cli-hydrogen": patch
---

Moved the `Layout` component back into `root.tsx` to avoid issues with styled errors.

1. If you have a separate `app/layout.tsx` file, delete it and move its default exported component into your `root.tsx`. For example:

    ```ts
    // /app/root.tsx
    export function Layout({children}: {children?: React.ReactNode}) {
      const nonce = useNonce();
      const data = useRouteLoaderData<RootLoader>('root');

      return (
        <html lang="en">
        ...
      );
    }
    ```
