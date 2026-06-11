import type { Config } from "@react-router/dev/config";

export default {
  // Server-side render by default, to enable SPA mode set this to `false`
  ssr: true,
  future: {
    // Enables route module `middleware` exports. The middleware and
    // `RouterContextProvider` APIs are stable as of 7.9, but framework mode
    // still gates them on this flag because turning them on is a type-level
    // breaking change for `getLoadContext`.
    v8_middleware: true,
  },
} satisfies Config;
