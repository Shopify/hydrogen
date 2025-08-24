import type {Config} from '@react-router/dev/config';

export default {
  // Core configuration
  appDirectory: 'app',
  buildDirectory: 'dist',
  ssr: true,
  
  // React Router 7 unstable flags - configured for optimal Hydrogen experience
  future: {
    // ✅ ENABLED: Required for Hydrogen context integration (context.get/set)
    unstable_middleware: true,
    
    // ✅ ENABLED: Performance enhancement for faster dev builds
    unstable_optimizeDeps: true,
    
    // ✅ ENABLED: Code splitting for better ecommerce performance
    unstable_splitRouteModules: "enforce" as const,
    
    // ⚠️ EVALUATE: Security enhancement - enable based on requirements
    unstable_subResourceIntegrity: false,
    
    // ❌ DISABLED: Too experimental for production use
    unstable_viteEnvironmentApi: false,
  },
  
  // Additional React Router configuration validation ready for future properties
  // Current Config interface supports: appDirectory, buildDirectory, ssr, future
} satisfies Config;
