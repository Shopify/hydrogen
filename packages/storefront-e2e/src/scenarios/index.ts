import type { Scenario } from "../scenario.ts";
import { addToCart } from "./add-to-cart.ts";

export const SCENARIOS: Readonly<Record<string, Scenario>> = {
  [addToCart.id]: addToCart,
};

export const DEFAULT_SCENARIO_ID = addToCart.id;
