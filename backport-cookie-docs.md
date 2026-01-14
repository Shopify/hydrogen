# Back-port Cookie Documentation Plan

## Overview

This document provides instructions for back-porting cookie-related documentation changes to older Hydrogen versions. The primary goal is to ensure `getTrackingValues` appears in the generated API documentation for back-fixed branches.

## Background

### Why This Is Needed

The `getTrackingValues` function was added to the codebase and back-fixed to older Hydrogen versions as part of the new Shopify cookie architecture. However, the **documentation files** were not back-ported along with the implementation. Hydrogen's documentation system requires explicit `.doc.ts` files to include functions in the generated API docs.

### How Hydrogen Documentation Works

1. **Source of truth**: `*.doc.ts` files in `packages/hydrogen-react/src/` define what appears in docs
2. **Compilation**: `npm run build-docs` compiles `.doc.ts` files into `generated_docs_data.json`
3. **Cross-package sharing**: `packages/hydrogen/docs/copy-hydrogen-react-docs.cjs` copies specific docs from hydrogen-react to hydrogen using a whitelist (`docsToCopy` array)
4. **No `.doc.ts` = no documentation**: Functions without `.doc.ts` files are excluded from generated docs, even if exported

### Reference PR

These changes originate from PR #3328 on main: "Update docs for cookies and remove references to remix-oxygen package"

---

## Prerequisites

Before executing this plan, verify:

1. [ ] The `getTrackingValues` function exists in `packages/hydrogen-react/src/tracking-utils.ts`
2. [ ] The function is exported from `packages/hydrogen-react/src/index.ts`
3. [ ] The function is re-exported from `packages/hydrogen/src/index.ts`
4. [ ] You are on the correct branch (e.g., `2025-05`, `2025-04`, etc.)

If any of these are false, the implementation may not have been back-fixed to this version.

---

## Changes to Make

### 1. Create `tracking-utils.doc.ts`

**Path:** `packages/hydrogen-react/src/tracking-utils.doc.ts`

```typescript
import {ReferenceEntityTemplateSchema} from '@shopify/generate-docs';

const data: ReferenceEntityTemplateSchema = {
  name: 'getTrackingValues',
  category: 'utilities',
  isVisualComponent: false,
  related: [
    {
      subtitle: 'Hook',
      name: 'useShopifyCookies',
      url: '/api/hydrogen-react/hooks/useShopifyCookies',
      type: 'tool',
    },
    {
      subtitle: 'Utility',
      name: 'getShopifyCookies',
      url: '/api/hydrogen-react/utilities/getShopifyCookies',
      type: 'gear',
    },
  ],
  description:
    'Retrieves user session tracking values for analytics and marketing from the browser environment. It reads from `server-timing` headers in Storefront API responses and falls back to deprecated cookies for backward compatibility.',
  type: 'utility',
  defaultExample: {
    description: 'I am the default example',
    codeblock: {
      tabs: [
        {
          title: 'JavaScript',
          code: './tracking-utils.example.jsx',
          language: 'jsx',
        },
        {
          title: 'TypeScript',
          code: './tracking-utils.example.tsx',
          language: 'tsx',
        },
      ],
      title: 'Example code',
    },
  },
  definitions: [
    {
      title: 'getTrackingValues',
      type: 'GetTrackingValuesGeneratedType',
      description:
        'Returns an object containing `uniqueToken`, `visitToken`, and `consent` values.',
    },
  ],
};

export default data;
```

### 2. Create `tracking-utils.example.jsx`

**Path:** `packages/hydrogen-react/src/tracking-utils.example.jsx`

```jsx
import {getTrackingValues} from '@shopify/hydrogen-react';

export function sendCustomAnalyticsEvent(eventName) {
  const {uniqueToken, visitToken} = getTrackingValues();

  // Use tracking values in your custom analytics implementation
  fetch('/api/analytics', {
    method: 'POST',
    body: JSON.stringify({
      event: eventName,
      uniqueToken,
      visitToken,
    }),
  });
}
```

### 3. Create `tracking-utils.example.tsx`

**Path:** `packages/hydrogen-react/src/tracking-utils.example.tsx`

```tsx
import {getTrackingValues} from '@shopify/hydrogen-react';

export function sendCustomAnalyticsEvent(eventName: string) {
  const {uniqueToken, visitToken} = getTrackingValues();

  // Use tracking values in your custom analytics implementation
  fetch('/api/analytics', {
    method: 'POST',
    body: JSON.stringify({
      event: eventName,
      uniqueToken,
      visitToken,
    }),
  });
}
```

### 4. Update `copy-hydrogen-react-docs.cjs`

**Path:** `packages/hydrogen/docs/copy-hydrogen-react-docs.cjs`

**Change A:** Add `'getTrackingValues'` to the `docsToCopy` array, after `'getShopifyCookies'`:

```javascript
const docsToCopy = [
  // ... existing entries ...
  'getShopifyCookies',
  'getTrackingValues',  // <-- ADD THIS LINE
  // ... remaining entries ...
];
```

**Change B:** Update the `copyFiles()` function to avoid duplicates. Find this block:

```javascript
if (!docData) {
  throw new Error(`Could not find doc "${doc}" in Hydrogen React docs`);
} else {
  hydrogenDocsData.push(updatePaths(docData));
}
```

Replace it with:

```javascript
if (!docData) {
  throw new Error(`Could not find doc "${doc}" in Hydrogen React docs`);
}

// Avoid duplicates if doc already exists in hydrogen docs
const existingIndex = hydrogenDocsData.findIndex((d) => d.name === doc);
if (existingIndex !== -1) {
  hydrogenDocsData[existingIndex] = updatePaths(docData);
} else {
  hydrogenDocsData.push(updatePaths(docData));
}
```

### 5. Update `get-shopify-cookies.doc.ts`

**Path:** `packages/hydrogen-react/src/get-shopify-cookies.doc.ts`

**Change A:** Add `getTrackingValues` to the `related` array:

```javascript
related: [
  {
    subtitle: 'Hook',
    name: 'useShopifyCookies',
    url: '/api/hydrogen-react/hooks/useShopifyCookies',
    type: 'tool',
  },
  {
    subtitle: 'Utility',
    name: 'getTrackingValues',
    url: '/api/hydrogen-react/utilities/getTrackingValues',
    type: 'gear',
  },
],
```

**Change B:** Update the description:

```javascript
description:
  'Parses cookie string and returns Shopify cookies. For tracking values, consider using `getTrackingValues` instead, which reads from modern Shopify cookies.',
```

### 6. Update `useShopifyCookies.doc.ts`

**Path:** `packages/hydrogen-react/src/useShopifyCookies.doc.ts`

**Change A:** In the `related` array, change the utility reference from `getShopifyCookies` to `getTrackingValues`:

```javascript
{
  subtitle: 'Utility',
  name: 'getTrackingValues',
  url: '/api/hydrogen-react/utilities/getTrackingValues',
  type: 'gear',
},
```

**Change B:** Update the main description:

```javascript
description:
  'Sets Shopify user and session cookies and refreshes the expiry time. Returns `true` when cookies are ready.',
```

**Change C:** Update the definition description:

```javascript
description:
  'Manages Shopify cookies. If `hasUserConsent` option is false, deprecated cookies will be removed. Returns `true` when cookies are ready.',
```

### 7. Update `useShopifyCookies.example.jsx`

**Path:** `packages/hydrogen-react/src/useShopifyCookies.example.jsx`

Replace the entire file content with:

```jsx
import * as React from 'react';
import {useShopifyCookies} from '@shopify/hydrogen-react';

export default function App({Component, pageProps}) {
  // Returns true when cookies are ready
  const cookiesReady = useShopifyCookies({hasUserConsent: true});

  if (!cookiesReady) {
    return null;
  }

  return <Component {...pageProps} />;
}
```

### 8. Update `useShopifyCookies.example.tsx`

**Path:** `packages/hydrogen-react/src/useShopifyCookies.example.tsx`

Replace the entire file content with:

```tsx
import * as React from 'react';
import {useShopifyCookies} from '@shopify/hydrogen-react';

export default function App({
  Component,
  pageProps,
}: {
  Component: React.ComponentType;
  pageProps: object;
}) {
  // Returns true when cookies are ready
  const cookiesReady = useShopifyCookies({hasUserConsent: true});

  if (!cookiesReady) {
    return null;
  }

  return <Component {...pageProps} />;
}
```

### 9. Regenerate Documentation

Run these commands from the repository root:

```bash
cd packages/hydrogen-react && npm run build-docs
cd ../hydrogen && npm run build-docs
```

---

## Acceptance Criteria

After completing all changes, verify:

1. [ ] `packages/hydrogen-react/src/tracking-utils.doc.ts` exists
2. [ ] `packages/hydrogen-react/src/tracking-utils.example.jsx` exists
3. [ ] `packages/hydrogen-react/src/tracking-utils.example.tsx` exists
4. [ ] `getTrackingValues` appears in `packages/hydrogen-react/docs/generated/generated_docs_data.json`
5. [ ] `getTrackingValues` appears in `packages/hydrogen/docs/generated/generated_docs_data.json`
6. [ ] No TypeScript errors when running `npm run typecheck`
7. [ ] The `build-docs` scripts complete without errors

**Verification commands:**

```bash
# Check getTrackingValues exists in generated docs
grep -l "getTrackingValues" packages/hydrogen-react/docs/generated/generated_docs_data.json
grep -l "getTrackingValues" packages/hydrogen/docs/generated/generated_docs_data.json

# Verify the entry is properly structured (should return a JSON object)
cat packages/hydrogen-react/docs/generated/generated_docs_data.json | jq '.[] | select(.name == "getTrackingValues")'
```

---

## Things to Avoid

1. **DO NOT** modify `packages/hydrogen-react/src/tracking-utils.ts` (the implementation file) - it should already exist and be correct

2. **DO NOT** modify any remix-oxygen related files - this back-port is scoped to cookie documentation only

3. **DO NOT** modify `packages/hydrogen/src/createRequestHandler.*` files - these changes from PR #3328 are out of scope

4. **DO NOT** modify files in `docs/shopify-dev/analytics-setup/` - these are shopify.dev examples, not API docs

5. **DO NOT** run `npm install` or modify `package.json`/`package-lock.json` unless dependencies are missing

6. **DO NOT** commit the generated JSON files separately - they should be committed together with the source `.doc.ts` changes

---

## Unsafe Assumptions

Be aware of these potential issues:

### 1. `getTrackingValues` implementation may differ between versions

The function signature or behavior might vary. Verify the type `GetTrackingValuesGeneratedType` exists in the generated types. If it doesn't, check `packages/hydrogen-react/src/tracking-utils.ts` for the actual exported type name.

### 2. `@shopify/generate-docs` version compatibility

The doc generation tooling may differ between branches. If `npm run build-docs` fails, check:
- Is `@shopify/generate-docs` installed?
- What version is in `package.json`?
- Are there any breaking changes in the doc schema?

### 3. File paths may vary

Some older branches may have different directory structures. Verify paths before creating files.

### 4. The `docsToCopy` array order may differ

The position of entries in `docsToCopy` array may vary between branches. Insert `'getTrackingValues'` in a logical position (after `'getShopifyCookies'`), but don't assume the exact line number.

### 5. Existing `.doc.ts` files may have different schemas

The structure of `get-shopify-cookies.doc.ts` and `useShopifyCookies.doc.ts` may differ slightly between branches. Read the files first before making modifications.

---

## Troubleshooting

### "Could not find doc 'getTrackingValues' in Hydrogen React docs"

This error from `copy-hydrogen-react-docs.cjs` means:
1. The `tracking-utils.doc.ts` file wasn't created, OR
2. The `npm run build-docs` wasn't run in `hydrogen-react` first, OR
3. The `.doc.ts` file has a syntax error

### TypeScript errors during build-docs

If the `.doc.ts` file has TypeScript errors:
1. Check that `@shopify/generate-docs` types are available
2. Verify the `ReferenceEntityTemplateSchema` import works
3. Run `npm run typecheck` to see specific errors

### Generated JSON is empty or missing entries

If `generated_docs_data.json` doesn't contain `getTrackingValues`:
1. Verify `tracking-utils.doc.ts` exports a `default` object
2. Check `docs/tsconfig.docs.json` includes `**/*.doc.ts`
3. Look for error output from the build-docs script

---

## Files Changed Summary

| Operation | Path |
|-----------|------|
| Create | `packages/hydrogen-react/src/tracking-utils.doc.ts` |
| Create | `packages/hydrogen-react/src/tracking-utils.example.jsx` |
| Create | `packages/hydrogen-react/src/tracking-utils.example.tsx` |
| Modify | `packages/hydrogen/docs/copy-hydrogen-react-docs.cjs` |
| Modify | `packages/hydrogen-react/src/get-shopify-cookies.doc.ts` |
| Modify | `packages/hydrogen-react/src/useShopifyCookies.doc.ts` |
| Modify | `packages/hydrogen-react/src/useShopifyCookies.example.jsx` |
| Modify | `packages/hydrogen-react/src/useShopifyCookies.example.tsx` |
| Regenerate | `packages/hydrogen-react/docs/generated/generated_docs_data.json` |
| Regenerate | `packages/hydrogen/docs/generated/generated_docs_data.json` |

