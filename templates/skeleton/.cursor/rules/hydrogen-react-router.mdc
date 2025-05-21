---
description: 
globs: 
alwaysApply: true
---

# React Router Import Rule for Hydrogen

## Overview

This Hydrogen project is based on React Router, not Remix. When working with documentation or code examples, you should always use imports from the appropriate React Router packages instead of Remix packages.

## Import Replacements

When you see imports from Remix packages, replace them with their equivalent React Router v7 packages. Here are the common replacements:

| Remix v2 Package | React Router v7 Package |
|------------------|-------------------------|
| `@remix-run/react` | `react-router` |
| `@remix-run/dev` | `@react-router/dev` |
| `@remix-run/architect` | `@react-router/architect` |
| `@remix-run/cloudflare` | `@react-router/cloudflare` |
| `@remix-run/express` | `@react-router/express` |
| `@remix-run/fs-routes` | `@react-router/fs-routes` |
| `@remix-run/node` | `@react-router/node` |
| `@remix-run/route-config` | `@react-router/dev` |
| `@remix-run/routes-option-adapter` | `@react-router/remix-routes-option-adapter` |
| `@remix-run/serve` | `@react-router/serve` |
| `@remix-run/server-runtime` | `react-router` |
| `@remix-run/testing` | `react-router` |

NEVER USE 'react-router-dom' imports!

## Common Import Examples

```js
// INCORRECT (Remix style)
import { useLoaderData, Link, Form, useActionData, useNavigation, useSubmit } from '@remix-run/react';

// CORRECT (React Router style)
import { useLoaderData, Link, Form, useActionData, useNavigation, useSubmit } from 'react-router';
```

## Development Guidelines

1. Always check existing code in the project to understand which specific React Router hooks and components are being used
2. When generating new code or modifying existing code, ensure all routing-related imports come from the correct React Router packages
3. If following documentation or examples based on Remix, adapt the code to use React Router equivalents

When working in this codebase, always follow the React Router patterns that are already established in the existing code.

For more information, consult the official Remix to React Router upgrade guide: https://reactrouter.com/upgrading/remix