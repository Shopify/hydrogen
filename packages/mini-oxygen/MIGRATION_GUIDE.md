# Migration Guide: Using @cloudflare/vite-plugin with @shopify/mini-oxygen

This guide helps you use `@cloudflare/vite-plugin` alongside `@shopify/mini-oxygen` for Vite-based development. The `oxygenExtensions` plugin provides Oxygen-specific features that are not available in the base Cloudflare plugin.

## Overview

This migration has two parts:

### 1. Vite Plugin Migration (Recommended)
For Vite-based development, you can use `@cloudflare/vite-plugin` with the new `oxygenExtensions` plugin to get Oxygen-specific features.

### 2. Core Dependencies Update (Complete)
The old `@miniflare/*` v2 dependencies have been removed and replaced with `miniflare` v4. The worker implementation (`@shopify/mini-oxygen/worker`) already uses Miniflare v4.

**Note**: The node implementation (`@shopify/mini-oxygen/node`) has been updated to use Miniflare v4, but some features may require adjustments due to API changes between Miniflare v2 and v4.

## Dependencies Update

### Add the Cloudflare Vite plugin:
```json
{
  "dependencies": {
    "@shopify/mini-oxygen": "^3.2.1"
  },
  "devDependencies": {
+   "@cloudflare/vite-plugin": "^1.2.4"
  }
}
```

**Note**: The existing mini-oxygen dependencies remain unchanged. This is an additive change for Vite-based development only.

## Configuration Changes

### Before (mini-oxygen only):
```typescript
// vite.config.ts
import { oxygen } from '@shopify/mini-oxygen/vite';

export default {
  plugins: [
    oxygen({
      entry: './server',
      env: { /* environment variables */ },
      debug: false,
      inspectorPort: 9229,
      logRequestLine: true
    })
  ]
};
```

### After (cloudflare + mini-oxygen):
```typescript
// vite.config.ts
import { cloudflare } from '@cloudflare/vite-plugin';
import { oxygenExtensions } from '@shopify/mini-oxygen/vite';

export default {
  plugins: [
    cloudflare({
      // Basic Worker configuration
      configPath: './wrangler.toml',
      persist: true,
      
      // Development server options
      dev: {
        port: 8080,
        inspector: {
          port: 9229
        }
      }
    }),
    
    // Oxygen-specific extensions
    oxygenExtensions({
      // Oxygen headers injection
      oxygenHeaders: true,
      
      // Request/response hooks for debugging
      requestHook: async (info) => {
        console.log(`${info.request.method} ${info.request.url} - ${info.response.status}`);
      },
      
      // Static asset handling
      staticAssets: {
        directory: './dist/client',
        urlPrefix: '/mini-oxygen/00000/11111/22222/33333/'
      },
      
      // Cross-boundary setup for proxy support
      crossBoundarySetup: [
        {
          script: () => {
            // Setup code that runs in the worker
          }
        }
      ]
    })
  ]
};
```

## Feature Implementation Guide

### 1. Oxygen Headers System

The Cloudflare plugin doesn't inject Oxygen-specific headers. Mini-oxygen now provides an extension:

```typescript
// @shopify/mini-oxygen/vite
export function oxygenExtensions(options) {
  return {
    name: 'oxygen-extensions',
    configureServer(server) {
      // Inject Oxygen headers into requests
      server.middlewares.use((req, res, next) => {
        if (options.oxygenHeaders) {
          req.headers['oxygen-buyer-ip'] = req.socket.remoteAddress;
          req.headers['oxygen-buyer-country'] = 'US';
          // Add other Oxygen headers...
        }
        next();
      });
    }
  };
}
```

### 2. Request/Response Hook System

Cloudflare plugin doesn't provide request hooks. Implement in mini-oxygen:

```typescript
// Usage in vite.config.ts
oxygenExtensions({
  requestHook: async (info) => {
    // Log request details
    console.log(`[${info.meta.durationMs}ms] ${info.request.method} ${info.request.url} - ${info.response.status}`);
    
    // Send to monitoring service
    await sendToMonitoring(info);
  }
})
```

### 3. Static Asset Handling

Cloudflare plugin serves assets differently. Mini-oxygen provides CDN-like URLs:

```typescript
oxygenExtensions({
  staticAssets: {
    directory: './dist/client',
    urlPrefix: '/mini-oxygen/00000/11111/22222/33333/',
    
    // Optional: custom asset extensions
    extensions: ['PNG', 'JPG', 'CSS', 'JS', 'WOFF2']
  }
})
```

### 4. Proxy Support (Cross-Boundary Setup)

For complex setups requiring communication between Node.js and Worker:

```typescript
oxygenExtensions({
  crossBoundarySetup: [
    {
      // Function that runs in the worker
      script: (binding) => {
        globalThis.myService = {
          async getData() {
            // Call back to Node.js process
            return await binding('getData');
          }
        };
      },
      
      // Function that runs in Node.js
      binding: async (action) => {
        if (action === 'getData') {
          return await fetchDataFromDatabase();
        }
      }
    }
  ]
})
```

## Migration Steps

1. **Update package.json** with new dependencies
2. **Create wrangler.toml** for Cloudflare configuration:
   ```toml
   name = "my-oxygen-app"
   compatibility_date = "2025-03-06"
   
   [vars]
   # Environment variables
   ```

3. **Update vite.config.ts** to use both plugins
4. **Test all features**:
   - Verify Oxygen headers are present
   - Check request logging works
   - Ensure static assets are served correctly
   - Test any cross-boundary communication

## Limitations and Workarounds

### Missing Features in @cloudflare/vite-plugin:
1. **No built-in request hooks** - Implemented via mini-oxygen extension
2. **Different asset serving** - Mini-oxygen provides CDN-like URLs
3. **No Oxygen headers** - Added by mini-oxygen middleware
4. **Limited debugging options** - Enhanced via request hooks

### Benefits of Migration:
1. **Better alignment with Cloudflare ecosystem**
2. **Access to latest Miniflare v4 features**
3. **Improved performance and stability**
4. **Future-proof architecture**

## Troubleshooting

### Common Issues:

1. **Headers not appearing**: Ensure `oxygenHeaders: true` is set
2. **Assets 404**: Check `staticAssets.directory` path is correct
3. **Request hooks not firing**: Verify hook function is async
4. **Cross-boundary errors**: Ensure both script and binding are defined

### Debug Mode:

Enable detailed logging:
```typescript
oxygenExtensions({
  debug: true,
  requestHook: async (info) => {
    console.log('Request:', JSON.stringify(info, null, 2));
  }
})
```

## Example Project Structure

```
my-oxygen-app/
├── vite.config.ts
├── wrangler.toml
├── server.ts           # Worker entry point
├── src/               # Frontend code
└── dist/
    ├── client/        # Built frontend assets
    └── server/        # Built worker code
```

## Next Steps

1. Review the [Cloudflare Vite Plugin docs](https://developers.cloudflare.com/workers/vite-plugin/)
2. Check [Miniflare v4 migration guide](https://miniflare.dev/get-started/migrating)
3. Test thoroughly in development before deploying
4. Report any issues to the mini-oxygen repository