/**
 * TEMPORARY: React Router v7 + React 19 Compatibility Components
 * 
 * This file contains compatibility wrappers for React Router v7 components
 * that have type issues with React 19.
 * 
 * TO REMOVE: Delete this entire file once React Router adds React 19 support
 * Track React Router React 19 support: https://github.com/remix-run/react-router/issues
 */

import React from 'react';

/**
 * Wrapper for React Router's Form components (including fetcher.Form)
 * to handle React 19 type incompatibility
 */
export function wrapReactRouterForm(FormComponent: unknown) {
  // Use double type assertion to bridge React 18/19 incompatibility
  return FormComponent as unknown as React.FC<React.FormHTMLAttributes<HTMLFormElement>>;
}

/**
 * Wrapper for any React Router component that returns ReactElement
 * but needs to work with React 19's ReactNode
 */
export function wrapReactRouterComponent(Component: unknown) {
  // Use double type assertion to bridge React 18/19 incompatibility
  return Component as unknown as React.FC;
}