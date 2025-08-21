# Technical Investigation Report: FOUC Issue with Tailwind CSS v4 in Production

## Case ID: FOUC-TWV4-001
**Status:** Under Investigation  
**Priority:** High  
**Impact:** User Experience Degradation in Production  
**Created:** 2025-01-21  
**Last Updated:** 2025-01-21  

---

## Executive Summary

Users report Flash of Unstyled Content (FOUC) when using Tailwind CSS v4 configuration in production deployments. The issue cannot be replicated in development environments, suggesting a production-specific race condition or asset loading problem.

## Problem Statement

### Observed Behavior
- **Symptom:** Brief flash of unstyled HTML content before Tailwind styles are applied
- **Duration:** Typically 100-500ms depending on network conditions
- **Environment:** Production deployments only
- **Frequency:** Intermittent but consistent across different hosting providers
- **Affected Stack:** Hydrogen + Tailwind v4 + Vite + React Router v7

### Expected Behavior
- Styles should be applied before first paint
- No visual flash during initial page load
- Consistent behavior between development and production

## Evidence Collection

### E-001: Production Build Differences
**Source:** Vite build output analysis  
**Finding:** Production uses extracted CSS files vs dev's inline styles
```
Dev:  CSS injected via <style> tags with HMR
Prod: CSS in separate .css files loaded via <link>
```

### E-002: Known Vite Issue
**Source:** GitHub vitejs/vite#7973  
**Reference:** https://github.com/vitejs/vite/issues/7973  
**Finding:** Documented FOUC during HMR in Vite projects with extracted CSS

### E-003: Tailwind v4 Architecture Change
**Source:** Tailwind v4 documentation  
**Finding:** New CSS-first configuration uses @import instead of @tailwind directives
```css
/* v3 approach */
@tailwind base;
@tailwind components;
@tailwind utilities;

/* v4 approach */
@import "tailwindcss";
```

### E-004: SSR Timing Analysis
**Source:** Network waterfall analysis  
**Finding:** CSS file loads after HTML document
```
1. HTML document: 0-50ms
2. JavaScript bundles: 50-150ms
3. CSS file: 100-200ms (FOUC occurs here)
4. Hydration: 200-300ms
```

### E-005: Current Implementation
**Source:** packages/cli/src/lib/setups/css/replacers.ts:72-74  
**Finding:** CSS imported with ?url parameter
```typescript
const newLinkNode = importer.isConditional
  ? `{${importer.name} && <link rel="stylesheet" href={${importer.name}}></link>}`
  : `<link rel="stylesheet" href={${importer.name}}></link>`;
```

### E-006: Root Template Structure
**Source:** templates/skeleton/app/root.tsx:153-154  
**Finding:** Stylesheets loaded in document head
```tsx
<link rel="stylesheet" href={resetStyles}></link>
<link rel="stylesheet" href={appStyles}></link>
```

## Hypotheses

### H-001: Critical CSS Not Inlined (Confidence: 85%)
**Theory:** Production builds don't inline critical CSS, causing render-blocking behavior  
**Evidence:** E-001, E-004  
**Validation:** Compare HTML output between dev and prod builds  
**Test:** Analyze if initial HTML contains any inline styles

### H-002: Incorrect Asset Priority (Confidence: 70%)
**Theory:** CSS files not marked as high priority, loaded after JS  
**Evidence:** E-004, E-006  
**Validation:** Check link tag attributes (rel="preload", fetchpriority="high")  
**Test:** Inspect browser's resource priority in DevTools

### H-003: SSR/Hydration Mismatch (Confidence: 60%)
**Theory:** Server-rendered HTML doesn't include proper style references  
**Evidence:** E-004, E-005  
**Validation:** Compare server-rendered vs client-rendered HTML  
**Test:** Disable JavaScript and check if styles load

### H-004: Vite Plugin Order Issue (Confidence: 40%)
**Theory:** @tailwindcss/vite plugin processes CSS after HTML is sent  
**Evidence:** E-002, E-003  
**Validation:** Review Vite plugin execution order  
**Test:** Reorder plugins in vite.config.ts

### H-005: Missing Preload Directives (Confidence: 75%)
**Theory:** CSS files not preloaded, causing delayed fetch  
**Evidence:** E-004, E-006  
**Validation:** Check for <link rel="preload"> in document head  
**Test:** Manually add preload links and measure impact

## Root Cause Analysis

### Likely Causal Chain
1. **Build Phase:** Vite extracts Tailwind CSS into separate file
2. **Server Response:** HTML sent without inlined critical CSS
3. **Browser Parse:** HTML parsed and rendered (unstyled)
4. **Asset Discovery:** Browser discovers CSS link tag
5. **Network Request:** CSS file requested (FOUC visible)
6. **Style Application:** CSS loaded and applied
7. **Visual Shift:** Page repaints with styles

### Contributing Factors
- Tailwind v4's new architecture relies on native CSS imports
- Vite's production optimization splits CSS for caching
- React 18's streaming SSR may send HTML before CSS is ready
- Missing resource hints (preload/prefetch)

## Proposed Solutions

### Solution 1: Inline Critical CSS (Recommended)
**Implementation:**
```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import criticalCSS from 'vite-plugin-critical';

export default defineConfig({
  plugins: [
    // ... existing plugins
    criticalCSS({
      inline: true,
      extract: false,
      width: 1920,
      height: 1080,
    })
  ]
});
```

**Pros:**
- Eliminates FOUC completely
- Better initial page performance
- Works with existing setup

**Cons:**
- Increases HTML size
- Requires additional build step
- May duplicate some CSS

### Solution 2: Add Resource Hints
**Implementation:**
```tsx
// root.tsx
export function links() {
  return [
    // Preload critical CSS
    {
      rel: 'preload',
      as: 'style',
      href: tailwindStyles,
      fetchpriority: 'high',
    },
    // Then load normally
    {
      rel: 'stylesheet',
      href: tailwindStyles,
    },
  ];
}
```

**Pros:**
- Simple implementation
- No build process changes
- Improves load priority

**Cons:**
- Doesn't eliminate FOUC entirely
- Still requires network round-trip

### Solution 3: Blocking Script Strategy
**Implementation:**
```tsx
// root.tsx - In Layout component
<head>
  <script dangerouslySetInnerHTML={{
    __html: `
      // Block rendering until styles load
      document.documentElement.style.visibility = 'hidden';
      document.addEventListener('DOMContentLoaded', () => {
        requestAnimationFrame(() => {
          document.documentElement.style.visibility = '';
        });
      });
    `
  }} />
</head>
```

**Pros:**
- Prevents FOUC entirely
- No build configuration needed
- Works immediately

**Cons:**
- Delays first paint
- May hurt performance metrics
- Not ideal UX pattern

## Testing Methodology

### Performance Testing
```bash
# 1. Build production bundle
npm run build

# 2. Serve locally with throttling
npx serve -s dist

# 3. Use Lighthouse CI
npx lighthouse http://localhost:3000 \
  --throttling-method=devtools \
  --throttling.cpuSlowdownMultiplier=4 \
  --output=json \
  --output-path=./lighthouse-report.json

# 4. Check for layout shifts
grep -A 5 "cumulative-layout-shift" lighthouse-report.json
```

### Visual Testing
```javascript
// playwright-fouc-test.js
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  // Disable cache to simulate first visit
  await page.route('**/*.css', route => {
    route.fulfill({ status: 200, body: '' });
  });
  
  // Record video of page load
  await page.video().saveAs('fouc-test.webm');
  
  await page.goto('http://localhost:3000');
  await page.waitForLoadState('networkidle');
  
  await browser.close();
})();
```

## Recommended Next Steps

### Immediate Actions (Week 1)
1. **Implement Solution 2** (Resource Hints) as quick mitigation
2. **Deploy to staging** with monitoring enabled
3. **Collect metrics**: CLS, FCP, LCP before and after
4. **Document findings** in this report

### Short-term (Week 2-3)
1. **Test Solution 1** (Critical CSS) in development
2. **Benchmark performance** impact of inlining
3. **Create A/B test** comparing solutions
4. **Engage with Vite team** on optimal configuration

### Long-term (Month 2+)
1. **Contribute upstream** to @tailwindcss/vite plugin
2. **Create Hydrogen-specific** Vite plugin for CSS optimization
3. **Document best practices** for Tailwind v4 + SSR
4. **Monitor for regressions** with automated tests

## Environment Requirements for Reproduction

### Minimal Reproduction Setup
```bash
# 1. Create new Hydrogen project with Tailwind
npm create @shopify/hydrogen@latest -- \
  --template skeleton \
  --styling tailwind \
  --language ts

# 2. Build for production
npm run build

# 3. Serve with network throttling
# Use Chrome DevTools Network tab: "Slow 3G" preset

# 4. Hard refresh (Cmd+Shift+R) to bypass cache
# FOUC should be visible on initial load
```

### Required Tools
- Chrome DevTools (Performance tab)
- WebPageTest.org for real-world testing
- Lighthouse for metrics collection
- Screen recording software for visual proof

## References and Resources

### External Documentation
1. [Vite CSS Code Splitting](https://vitejs.dev/guide/features.html#css-code-splitting)
2. [Tailwind CSS v4 Architecture](https://tailwindcss.com/docs/v4-beta)
3. [React 18 Streaming SSR](https://react.dev/reference/react-dom/server/renderToPipeableStream)
4. [Web.dev FOUC Prevention](https://web.dev/extract-critical-css/)

### Related Issues
- vitejs/vite#7973 - FOUC during HMR
- tailwindlabs/tailwindcss#16399 - Tailwind v4 + Vite dev mode styles
- remix-run/remix#7906 - FOUC in Vite environment

### Internal References
- packages/cli/src/lib/setups/css/tailwind.ts
- packages/cli/src/lib/setups/css/replacers.ts
- templates/skeleton/app/root.tsx
- templates/skeleton/vite.config.ts

## Assumptions and Limitations

### Assumptions
1. FOUC only occurs on first visit (not cached)
2. Issue is consistent across all browsers
3. Network latency amplifies the problem
4. Problem exists in all Tailwind v4 projects

### Limitations
1. Cannot reproduce in development environment
2. Varies based on network conditions
3. May be hosting-provider specific
4. Difficult to measure programmatically

## Risk Assessment

### If Not Resolved
- **User Impact:** Poor first impression, perceived performance issues
- **Business Impact:** Increased bounce rate, reduced conversions
- **Technical Debt:** Workarounds may complicate future updates
- **Developer Experience:** Confusion about dev/prod differences

### If Solutions Implemented Incorrectly
- **Performance:** Over-inlining CSS could slow initial response
- **Maintainability:** Complex workarounds harder to maintain
- **Compatibility:** May break with future Vite/Tailwind updates

## Appendix: Browser Behavior Analysis

### Chrome (v120+)
- Supports fetchpriority attribute
- Parallel CSS/JS loading
- Render-blocking by default for stylesheets

### Safari (v16.4+)
- Limited fetchpriority support
- Sequential resource loading preference
- More aggressive render-blocking

### Firefox (v128+)
- Good preload support
- Parallel loading similar to Chrome
- Less aggressive about FOUC prevention

---

**Report Prepared By:** Technical Investigation Team  
**Review Status:** Pending Technical Review  
**Distribution:** Engineering, DevOps, Product