import type { Config } from "@react-router/dev/config";

export default {
  appDirectory: "app",
  buildDirectory: "dist",
  ssr: true,
  subResourceIntegrity: false,
  future: {
    v8_middleware: true,
    v8_splitRouteModules: true,
    v8_viteEnvironmentApi: false,
    unstable_optimizeDeps: true,
  },
} satisfies Config;
