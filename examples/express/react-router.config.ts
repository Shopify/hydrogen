// @ts-ignore - React Router dev types are in root node_modules (in Hydrogen monorepo)
import type {Config} from '@react-router/dev';

export default {
  appDirectory: 'app',
  serverModuleFormat: 'esm',
  ssr: true,
  serverBuildFile: 'index.js',
} satisfies Config;