// React Router v7 + React 19 compatibility wrappers
// TODO: Remove when React Router officially supports React 19

import React from 'react';

// Wrapper for React Router Form component
export function wrapReactRouterForm(FormComponent: unknown) {
  return FormComponent as unknown as React.FC<React.FormHTMLAttributes<HTMLFormElement>>;
}

// Generic wrapper for React Router components
export function wrapReactRouterComponent<P = {}>(Component: unknown) {
  return Component as unknown as React.FC<P>;
}