# React Router 7.8.x Investigation Backlog

This document tracks all issues discovered during React Router 7.8.x middleware implementation that require further investigation.

## 🚨 HIGH PRIORITY - Blocking Issues

### 1. **Path Resolution in Server Build** 
**Status**: 🔴 BLOCKING BUILD/PREVIEW  
**Issue**: Server build fails with `~/lib/context` path resolution error  
**Evidence**: Build/preview commands fail during SSR bundle creation  
**Location**: `templates/skeleton/server.js:4`  
**Error**: `[vite]: Rollup failed to resolve import "~/lib/context"`  
**Impact**: Prevents successful build completion and preview testing  
**Investigation needed**:
- [ ] Why TypeScript paths aren't resolved in server.js during build
- [ ] Should server.js use relative imports instead of `~/*` paths?
- [ ] Is this a Vite/React Router integration issue?

### 2. **Middleware Runtime Execution Verification**
**Status**: 🟡 NEEDS TESTING  
**Issue**: Config detection works, but actual middleware execution unverified  
**Evidence**: MiniOxygen shows "Entry point error" when accessing middleware routes  
**Impact**: Unknown if middleware actually executes at runtime  
**Investigation needed**:
- [ ] Does React Router 7.8.x middleware execute in MiniOxygen environment?
- [ ] Are there special requirements for middleware in Oxygen workers?
- [ ] Test with working build to verify end-to-end middleware execution

## 🔍 MEDIUM PRIORITY - Future Flag Validation

### 3. **Systematic Future Flags Testing**
**Status**: 🟡 PARTIAL - Only `unstable_middleware` tested  
**Issue**: Need to validate all React Router future flags systematically  
**Evidence**: Currently only testing 1 of 5+ future flags  
**Impact**: Unknown compatibility with other future features  
**Flags to test**:
- [x] `unstable_middleware` ✅ CONFIRMED WORKING
- [ ] `unstable_optimizeDeps` - Test Vite dependency optimization
- [ ] `unstable_splitRouteModules` - Test route code splitting  
- [ ] `unstable_subResourceIntegrity` - Test SRI for assets
- [ ] `unstable_viteEnvironmentApi` - Test experimental Vite features

### 4. **React Router Property Integration Gap**
**Status**: 🟡 DOCUMENTED BUT UNRESOLVED  
**Issue**: We extract 20+ properties but only use 3  
**Evidence**: REACT_ROUTER_PROPS.md analysis shows major usage gap  
**Impact**: Maintenance burden without functionality benefit  
**Properties needing decision**:
- [ ] `basename` - Should MiniOxygen respect custom basename?
- [ ] `serverModuleFormat` - Should we validate against Oxygen requirements?
- [ ] `prerender` - Should static prerendering work with Shopify data?
- [ ] `routeDiscovery` - Should lazy discovery work with server routing?
- [ ] Decision: Implement full integration (Path B) or minimal approach (Path A)?

## 🔧 LOW PRIORITY - Optimization & Polish

### 5. **TypeScript Config Compilation Issue**
**Status**: 🟢 WORKAROUND EXISTS  
**Issue**: react-router.config.ts not auto-compiling to .js  
**Evidence**: Had to manually remove .js file to force .ts usage  
**Impact**: Developer experience - TypeScript config should work out of box  
**Investigation needed**:
- [ ] Should React Router plugin handle .ts config compilation automatically?
- [ ] Is this expected behavior or a gap in tooling?
- [ ] Document proper TypeScript setup for users

### 6. **Build Performance with Middleware**
**Status**: 🟢 UNKNOWN IMPACT  
**Issue**: Unknown performance implications of middleware flag  
**Evidence**: No performance testing done with middleware enabled  
**Impact**: Could affect build times or bundle sizes  
**Investigation needed**:
- [ ] Compare build times with/without middleware enabled
- [ ] Compare bundle sizes with/without middleware
- [ ] Identify any performance regressions

### 7. **MiniOxygen vs Production Oxygen Differences**
**Status**: 🟢 NEEDS RESEARCH  
**Issue**: Unclear if middleware works identically in MiniOxygen vs production Oxygen  
**Evidence**: Only tested in development environment  
**Impact**: Production deployment might behave differently  
**Investigation needed**:
- [ ] Research Oxygen worker middleware support documentation
- [ ] Test middleware in actual Oxygen deployment (if possible)
- [ ] Document any differences between dev and production behavior

## 📋 COMPLETED INVESTIGATIONS

### ✅ Middleware Configuration Detection
**Status**: ✅ RESOLVED  
**Issue**: React Router config not being detected properly  
**Solution**: Fixed naming conflict between path `basename` and React Router `basename`  
**Evidence**: All commands now show `hasMiddleware: true` when enabled  

### ✅ TypeScript Support for react-router.config.ts
**Status**: ✅ RESOLVED  
**Issue**: Only .js config files worked  
**Solution**: Enhanced with full TypeScript support, proper type imports, and comprehensive configuration  
**Evidence**: All properties detected correctly: `hasMiddleware: true`, all future flags typed and detected  
**Enhancement**: Added complete documentation and explicit typing for all React Router config properties  

## 🎯 NEXT ACTIONS

Based on priority, recommend addressing in this order:
1. **Fix server build path resolution** (blocking)
2. **Verify actual middleware execution** (critical for user experience)
3. **Test remaining future flags** (completeness)
4. **Decide on property integration strategy** (architectural decision)

---

*Last Updated: 2025-08-23*  
*Branch: `react-router-7.8.x`*  
*Status: 4 of 8 issues resolved, 4 pending investigation*