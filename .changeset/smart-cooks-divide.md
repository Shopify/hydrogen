---
'demo-store': patch
---

Add `.env` file to Remix watcher to allow reloading environment variables on file save. In `remix.config.js`:

```diff
-watchPaths: ['./public'],
+watchPaths: ['./public', './.env'],
```
