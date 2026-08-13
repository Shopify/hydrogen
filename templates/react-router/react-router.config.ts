import type { Config } from "@react-router/dev/config";

export default {
  appDirectory: "app",
  buildDirectory: "dist",
  ssr: true,
  // Oxygen serves the built assets itself, so React Router's SRI manifest is unnecessary
  subResourceIntegrity: false,
  future: {
    v8_middleware: true,
    unstable_optimizeDeps: true,
  },
} satisfies Config;
