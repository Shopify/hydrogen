import type {Config} from '@react-router/dev/config';

export default {
  appDirectory: 'app',
  buildDirectory: 'dist',
  ssr: true,
  future: {
    unstable_viteEnvironmentApi: true,
  },
} satisfies Config;
