import type {Config} from '@react-router/dev/config';

export default {
  ssr: true,
  future: {
    unstable_viteEnvironmentApi: true,
  },
  buildDirectory: 'dist',
} satisfies Config;
