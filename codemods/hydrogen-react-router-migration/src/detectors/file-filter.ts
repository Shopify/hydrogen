import path from 'path';
import type { ProjectLanguage } from './language';

export function shouldTransformFile(
  filePath: string, 
  language?: ProjectLanguage
): boolean {
  // Skip non-source files
  if (filePath.includes('node_modules')) return false;
  if (filePath.includes('dist')) return false;
  if (filePath.includes('build')) return false;
  if (filePath.includes('.d.ts')) return false;
  if (filePath.includes('.test.')) return false;
  if (filePath.includes('.spec.')) return false;
  if (filePath.includes('__tests__')) return false;
  if (filePath.includes('__mocks__')) return false;
  
  // Check file extension - always include all extensions if no language specified
  const ext = path.extname(filePath);
  const validExtensions = language 
    ? (language.isTypeScript 
        ? ['.ts', '.tsx', '.js', '.jsx'] // TS projects might have some JS files
        : ['.js', '.jsx'])
    : ['.ts', '.tsx', '.js', '.jsx']; // Include all if language not specified
  
  if (!validExtensions.includes(ext)) return false;
  
  // Check if file is in transformable directories
  const isInTransformableDir = 
    filePath.includes('/app/') || 
    filePath.includes('/routes/') ||
    filePath.includes('/lib/') ||
    filePath.includes('/server.') ||
    filePath.includes('/entry.');
  
  return isInTransformableDir;
}

export function extractRouteName(filePath: string): string | null {
  // Handle various route file patterns (order matters - more specific patterns first)
  const patterns = [
    // Nested routes with brackets: routes/products/[handle].tsx
    /routes\/(.+)\/\[(.+)\]\.(tsx?|jsx?)$/,
    // Flat routes with dash-dollar: routes/products-$handle.tsx
    /routes\/(.+)-\$(.+)\.(tsx?|jsx?)$/,
    // Index routes: routes/_index.tsx
    /routes\/(_?index)\.(tsx?|jsx?)$/,
    // Layout routes: routes/_layout.tsx
    /routes\/(_?layout)\.(tsx?|jsx?)$/,
    // Standard Remix/RR pattern: routes/products.$handle.tsx (must be last - it's the most general)
    /routes\/(.+)\.(tsx?|jsx?)$/,
  ];
  
  for (const pattern of patterns) {
    const match = filePath.match(pattern);
    if (match) {
      let routeName = match[1];
      
      // Handle nested routes with brackets
      if (match[2] && pattern.source.includes('\\[')) {
        // Convert [handle] to $handle
        routeName = `${match[1].replace(/\//g, '.')}.$${match[2]}`;
      }
      
      // Handle flat routes with dashes
      if (match[2] && pattern.source.includes('-\\$')) {
        // Convert products-$handle to products.$handle
        routeName = `${match[1]}.$${match[2]}`;
      }
      
      // Normalize route name
      routeName = routeName
        .replace(/\//g, '.')  // Convert slashes to dots
        .replace(/-/g, '.')   // Convert dashes to dots
        .replace(/\._index$/, '')  // Remove _index suffix
        .replace(/\._layout$/, '._layout') // Preserve _layout
        .replace(/^_index$/, '_index'); // Preserve root _index
      
      return routeName;
    }
  }
  
  return null;
}

export function getFileLanguage(filePath: string): 'typescript' | 'javascript' {
  const ext = path.extname(filePath);
  return ['.ts', '.tsx'].includes(ext) ? 'typescript' : 'javascript';
}

export function isRouteFile(filePath: string): boolean {
  return filePath.includes('/routes/') && extractRouteName(filePath) !== null;
}

export function isContextFile(filePath: string): boolean {
  return filePath.includes('/lib/context') || 
         filePath.includes('/server.') ||
         filePath.includes('/entry.server');
}

export function isConfigFile(filePath: string): boolean {
  const fileName = path.basename(filePath);
  return fileName === 'vite.config.ts' ||
         fileName === 'vite.config.js' ||
         fileName === 'package.json' ||
         fileName === 'tsconfig.json' ||
         fileName === 'env.d.ts' ||
         fileName === 'app.d.ts';
}

export interface FileInfo {
  path: string;
  language: 'typescript' | 'javascript';
  isRoute: boolean;
  routeName: string | null;
  isContext: boolean;
  isConfig: boolean;
  shouldTransform: boolean;
}

export function analyzeFile(filePath: string, projectLanguage?: ProjectLanguage): FileInfo {
  return {
    path: filePath,
    language: getFileLanguage(filePath),
    isRoute: isRouteFile(filePath),
    routeName: extractRouteName(filePath),
    isContext: isContextFile(filePath),
    isConfig: isConfigFile(filePath),
    shouldTransform: shouldTransformFile(filePath, projectLanguage)
  };
}

// Handle special Hydrogen skeleton patterns
export function normalizeHydrogenRoute(routeName: string): string {
  // Handle Hydrogen-specific route patterns
  const mappings: Record<string, string> = {
    // Special resource routes
    '[robots.txt]': '[robots.txt]',
    '[sitemap.xml]': '[sitemap.xml]',
    // API routes
    'api.$': 'api.$',
    // Account routes
    'account.$': 'account.$',
    'account_.login': 'account_.login',
    'account_.logout': 'account_.logout',
    // Product routes
    'products.$handle': 'products.$handle',
    'collections.$handle': 'collections.$handle',
  };
  
  // Check if this is a known pattern
  if (mappings[routeName]) {
    return mappings[routeName];
  }
  
  // Handle splat routes (e.g., $.)
  if (routeName === '$') {
    return '$';
  }
  
  return routeName;
}