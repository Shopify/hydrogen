import type { CacheInstance } from "@shopify/hydrogen";
import { createContext } from "react-router";

export const cacheContext = createContext<CacheInstance>();
export const waitUntilContext = createContext<ExecutionContext["waitUntil"]>();
