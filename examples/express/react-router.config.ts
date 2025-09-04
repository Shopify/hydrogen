import type {Config} from '@react-router/dev/config';

export default {
  // Server-side rendering is enabled by default
  ssr: true,
  
  // Enable middleware to get proper Hydrogen context typing
  future: {
    unstable_middleware: true,
  },
} satisfies Config;