/** @type {import("@remix-run/dev").AppConfig} */
export default {
  serverModuleFormat: 'esm',
  serverDependenciesToBundle: ['@remix-run/react'],
  future: {
    unstable_dev: {
      appServerPort: 3000,
      rebuildPollIntervalMs: 500,
    },
  },
};
