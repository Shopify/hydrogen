---
'skeleton': patch
---

Remove manual setting of session in headers and recommend setting it in server after response is created.

Step 1: Add `isPending` implementation in session

```diff
// in app/lib/session.ts
export class AppSession implements HydrogenSession {
+  public isPending = false;

  get unset() {
+    this.isPending = true;
    return this.#session.unset;
  }

  get set() {
+    this.isPending = true;
    return this.#session.set;
  }

  commit() {
+    this.isPending = false;
    return this.#sessionStorage.commitSession(this.#session);
  }
}
```

Step 2: update response header if `session.isPending` is true

```diff
// in server.ts
export default {
  async fetch(request: Request): Promise<Response> {
    try {
      const response = await handleRequest(request);

+      if (session.isPending) {
+        response.headers.set('Set-Cookie', await session.commit());
+      }

      return response;
    } catch (error) {
      ...
    }
  },
};
```

Step 3: remove setting cookie with session.commit() in routes

```diff
// in route files
export async function loader({context}: LoaderFunctionArgs) {
  return json({},
-    {
-      headers: {
-        'Set-Cookie': await context.session.commit(),
-      },
    },
  );
}
```
