---
'skeleton': patch
'@shopify/create-hydrogen': patch
---

Update root to use [Remix's Layout Export pattern](https://remix.run/docs/en/main/file-conventions/root#layout-export) and eliminate the use of `useLoaderData` in root.

The diff below showcase how you can make this refactor in existing application.

```diff
import {
  Outlet,
-  useLoaderData,
+  useRouteLoaderData,
} from '@remix-run/react';
-import {Layout} from '~/components/Layout';
+import {PageLayout} from '~/components/PageLayout';

-export default function App() {
+export function Layout({children}: {children?: React.ReactNode}) {
  const nonce = useNonce();
-  const data = useLoaderData<typeof loader>();
+  const data = useRouteLoaderData<typeof loader>('root');

  return (
    <html>
    ...
      <body>
-        <Layout {...data}>
-          <Outlet />
-        </Layout>
+        {data? (
+          <PageLayout {...data}>{children}</PageLayout>
+         ) : (
+          children
+        )}
      </body>
    </html>
  );
}

+export default function App() {
+  return <Outlet />;
+}

export function ErrorBoundary() {
  const rootData = useLoaderData<typeof loader>();

  return (
-    <html>
-    ...
-      <body>
-        <Layout {...rootData}>
-          <div className="route-error">
-            <h1>Error</h1>
-            ...
-          </div>
-        </Layout>
-      </body>
-    </html>
+    <div className="route-error">
+      <h1>Error</h1>
+      ...
+    </div>
  );
}

```
