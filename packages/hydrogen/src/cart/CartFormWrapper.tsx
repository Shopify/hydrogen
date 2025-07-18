/**
 * TEMPORARY: React Router v7 + React 19 Compatibility Wrapper
 * 
 * This wrapper fixes type errors when using React Router v7 with React 19.
 * TO REMOVE: Delete this entire file once React Router adds React 19 support
 * 
 * Search for "TODO: Remove when React Router adds React 19 support" to find all temporary workarounds
 * Track React Router React 19 support: https://github.com/remix-run/react-router/issues
 */

import React from 'react';
import type {FetcherWithComponents} from 'react-router';

export function renderChildren<T = unknown>(
  children: React.ReactNode | ((fetcher: FetcherWithComponents<T>) => React.ReactNode),
  fetcher: FetcherWithComponents<T>
): React.ReactNode {
  if (typeof children === 'function') {
    // Call the render prop and return the result
    return children(fetcher);
  }
  return children;
}

type FormProps = {
  action: string;
  method: string;
  children: React.ReactNode;
};

export function createFormWrapper(Form: unknown): React.FC<FormProps> {
  return function FormWrapper(props) {
    return React.createElement(Form as React.ComponentType<FormProps>, props);
  };
}