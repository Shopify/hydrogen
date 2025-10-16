function r(){return{name:"hydrogen-2025.7.0",reactRouterConfig:()=>({appDirectory:"app",buildDirectory:"dist",ssr:!0,future:{v8_middleware:!0,unstable_optimizeDeps:!0,unstable_splitRouteModules:!0,unstable_subResourceIntegrity:!1,unstable_viteEnvironmentApi:!1}}),reactRouterConfigResolved:({reactRouterConfig:e})=>{if(e.basename&&e.basename!=="/")throw new Error(`[Hydrogen Preset] basename is not supported in Hydrogen 2025.7.0.
Reason: Requires major CLI infrastructure modernization.
Workaround: Use reverse proxy or CDN path rewriting for subdirectory hosting.`);if(e.prerender)throw new Error(`[Hydrogen Preset] prerender is not supported in Hydrogen 2025.7.0.
Reason: React Router plugin incompatibility with Hydrogen CLI build pipeline.
Workaround: Use external static generation tools or server-side caching.`);if(e.serverBundles)throw new Error(`[Hydrogen Preset] serverBundles is not supported in Hydrogen 2025.7.0.
Reason: React Router plugin manifest incompatibility with Hydrogen CLI.
Alternative: Route-level code splitting via unstable_splitRouteModules is enabled.`);if(e.buildEnd)throw new Error(`[Hydrogen Preset] buildEnd is not supported in Hydrogen 2025.7.0.
Reason: Hydrogen CLI bypasses React Router buildEnd hook execution.
Workaround: Use external build scripts or package.json post-build hooks.`);if(e.future?.unstable_subResourceIntegrity===!0)throw new Error(`[Hydrogen Preset] unstable_subResourceIntegrity cannot be enabled.
Reason: Conflicts with Hydrogen CSP nonce-based authentication.
Impact: Would break Content Security Policy and cause script execution failures.`)}}}export{r as hydrogenPreset};
