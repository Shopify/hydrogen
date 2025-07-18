/**
 * TEMPORARY: React Router v7 + React 19 Type Compatibility Patch
 * 
 * This patch fixes type errors when using React Router v7 components with React 19.
 * React 19's ReactNode type is more permissive (includes Promise<ReactNode>), but
 * React Router v7 components are still typed to return ReactElement | null.
 * 
 * TO REMOVE: Delete this entire file once React Router adds React 19 support
 * Also remove this file from tsconfig.json includes
 * 
 * Search for "TODO: Remove when React Router adds React 19 support" to find all temporary workarounds
 * Issue tracking: https://github.com/remix-run/react-router/issues
 * Last tested with: react-router@7.7.0
 */

import type * as React from 'react';

declare module 'react-router' {
  export interface LinkProps {
    children?: React.ReactNode;
  }
  
  export interface NavLinkProps extends LinkProps {
    className?: string | ((props: {isActive: boolean; isPending: boolean; isTransitioning: boolean}) => string | undefined);
    style?: React.CSSProperties | ((props: {isActive: boolean; isPending: boolean; isTransitioning: boolean}) => React.CSSProperties | undefined);
  }
  
  export const Link: React.FC<LinkProps & React.AnchorHTMLAttributes<HTMLAnchorElement>>;
  export const NavLink: React.FC<NavLinkProps & React.AnchorHTMLAttributes<HTMLAnchorElement>>;
  export const Outlet: React.FC<{ context?: any }>;
  export const Scripts: React.FC<{ nonce?: string }>;
  export const ScrollRestoration: React.FC<{ nonce?: string }>;
  export const Links: React.FC;
  export const Meta: React.FC;
  export const ServerRouter: React.FC<{ context: any; url: string | URL; nonce?: string }>;
  export const Await: React.FC<{ resolve: any; errorElement?: React.ReactNode; children: (data: any) => React.ReactNode }>;
  export const Form: React.FC<React.FormHTMLAttributes<HTMLFormElement> & {
    method?: string;
    action?: string;
    replace?: boolean;
    preventScrollReset?: boolean;
    relative?: "route" | "path";
    reloadDocument?: boolean;
    viewTransition?: boolean;
    children?: React.ReactNode;
  }>;
  
  export interface FetcherWithComponents<TData = any> extends Fetcher<TData> {
    Form: React.ForwardRefExoticComponent<React.FormHTMLAttributes<HTMLFormElement> & {
      method?: string;
      action?: string;
      replace?: boolean;
      preventScrollReset?: boolean;
      relative?: "route" | "path";
      reloadDocument?: boolean;
      viewTransition?: boolean;
      children?: React.ReactNode;
    } & React.RefAttributes<HTMLFormElement>>;
    submit: (target: any, options?: any) => Promise<void>;
    load: (href: string, opts?: any) => Promise<void>;
  }
  
  export interface Fetcher<TData = any> {
    state: 'idle' | 'loading' | 'submitting';
    data: TData | undefined;
    formData: FormData | undefined;
    formMethod: string | undefined;
    formAction: string | undefined;
    formEncType?: string | undefined;
    text?: string | undefined;
    json?: any;
  }
}

declare module '@react-router/react' {
  export interface LinkProps {
    children?: React.ReactNode;
  }
  
  export interface NavLinkProps extends LinkProps {
    className?: string | ((props: {isActive: boolean; isPending: boolean; isTransitioning: boolean}) => string | undefined);
    style?: React.CSSProperties | ((props: {isActive: boolean; isPending: boolean; isTransitioning: boolean}) => React.CSSProperties | undefined);
  }
  
  export const Link: React.FC<LinkProps & React.AnchorHTMLAttributes<HTMLAnchorElement>>;
  export const NavLink: React.FC<NavLinkProps & React.AnchorHTMLAttributes<HTMLAnchorElement>>;
  export const Outlet: React.FC<{ context?: any }>;
  export const Scripts: React.FC<{ nonce?: string }>;
  export const ScrollRestoration: React.FC<{ nonce?: string }>;
  export const Links: React.FC;
  export const Meta: React.FC;
  export const ServerRouter: React.FC<{ context: any; url: string | URL; nonce?: string }>;
  export const Await: React.FC<{ resolve: any; errorElement?: React.ReactNode; children: (data: any) => React.ReactNode }>;
}

declare module 'react-router/dom' {
  export const HydratedRouter: React.FC<{ nonce?: string }>;
}