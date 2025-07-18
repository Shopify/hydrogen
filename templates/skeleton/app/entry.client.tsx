import { HydratedRouter } from 'react-router/dom';
import React, {startTransition, StrictMode} from 'react';
import {hydrateRoot} from 'react-dom/client';
import {wrapReactRouterComponent} from '~/components/ReactRouterCompat';

if (!window.location.origin.includes('webcache.googleusercontent.com')) {
  startTransition(() => {
    // TODO: Remove when React Router adds React 19 support
    const RouterComponent = wrapReactRouterComponent(HydratedRouter);
    
    hydrateRoot(
      document,
      <StrictMode>
        <RouterComponent />
      </StrictMode>,
    );
  });
}
