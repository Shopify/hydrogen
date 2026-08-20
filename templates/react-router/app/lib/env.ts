import type { CacheInstance } from "@shopify/hydrogen";
import { createContext } from "react-router";

import type { RuntimeConfig, RuntimeEnv } from "./shop";

export type Env = RuntimeEnv;

export const envContext = createContext<Env>();
export const cacheContext = createContext<CacheInstance>();
export const runtimeConfigContext = createContext<RuntimeConfig>();
export const waitUntilContext = createContext<ExecutionContext["waitUntil"]>();
