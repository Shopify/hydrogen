/// <reference types="vite/client" />
/// <reference types="react-router" />
/// <reference types="@shopify/oxygen-workers-types" />

import type { Env as AppEnv } from "./app/lib/env";

type ReactRouterExampleContext = {
  env: Env;
  waitUntil: ExecutionContext["waitUntil"];
};

declare module "react-router" {
  interface AppLoadContext extends ReactRouterExampleContext {}
  interface RouterContextProvider extends ReactRouterExampleContext {}
}

declare global {
  interface Env extends AppEnv {}
}
