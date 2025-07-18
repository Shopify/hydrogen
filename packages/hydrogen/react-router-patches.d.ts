/**
 * React Router v7 + React 19 compatibility patch
 * 
 * React 19 expanded ReactNode to include bigint and Promise<ReactNode>,
 * but React Router v7 types still expect the narrower React 18 definition.
 * This module augmentation bridges that compatibility gap by making JSX
 * components more permissive.
 */

/// <reference types="react" />
/// <reference types="react-router" />

// Unified React 19 ReactNode type that accepts all forms
type UnifiedReactNode = 
  | React.ReactElement<any, any>
  | string
  | number
  | bigint
  | boolean
  | Iterable<UnifiedReactNode>
  | React.ReactPortal
  | null
  | undefined
  | Promise<UnifiedReactNode>;

declare global {
  namespace JSX {
    interface ElementAttributesProperty {
      props: {};
    }
    interface ElementChildrenAttribute {
      children: {};
    }
    interface IntrinsicElements {
      [elemName: string]: any;
    }
    // Make JSX.Element more permissive
    interface Element {
      key?: any;
      children?: any;
      [key: string]: any;
    }
    interface IntrinsicAttributes extends React.Attributes {}
    interface IntrinsicClassAttributes<T> extends React.ClassAttributes<T> {}
  }
}

// Override React module to unify types
declare module 'react' {
  // Unified ReactNode type
  type ReactNode = UnifiedReactNode;

  // Make ReactPortal more permissive
  interface ReactPortal {
    children?: ReactNode;
    key?: any;
    [key: string]: any;
  }

  // Make ReactElement more permissive
  interface ReactElement<P = any, T extends string | JSXElementConstructor<any> = string | JSXElementConstructor<any>> {
    children?: ReactNode;
    key?: any;
    [key: string]: any;
  }

  // Make component interfaces more permissive
  interface FunctionComponent<P = {}> {
    (props: P, context?: any): ReactNode;
  }

  interface ComponentClass<P = {}, S = any> {
    new (props: P, context?: any): Component<P, S>;
  }

  interface ForwardRefExoticComponent<P> {
    (props: P): ReactNode;
  }

  interface ExoticComponent<P = {}> {
    (props: P): ReactNode;
  }

  interface Component<P = {}, S = {}, SS = any> {
    refs?: {
      [key: string]: ReactInstance;
    };
    render(): ReactNode;
  }

  // Make Key more permissive
  type Key = string | number | null | undefined;
}

// Make React Router components more permissive
declare module 'react-router' {
  interface FunctionComponent<P = {}> {
    (props: P, context?: any): UnifiedReactNode;
  }

  interface ComponentClass<P = {}, S = any> {
    new (props: P, context?: any): Component<P, S>;
  }

  interface ForwardRefExoticComponent<P> {
    (props: P): UnifiedReactNode;
  }

  interface ComponentType<P = {}> {
    (props: P, context?: any): UnifiedReactNode;
  }

  interface ExoticComponent<P = {}> {
    (props: P): UnifiedReactNode;
  }
}

export {};