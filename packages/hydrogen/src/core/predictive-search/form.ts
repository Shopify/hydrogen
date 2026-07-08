import { PREDICTIVE_SEARCH_QUERY_PARAM } from "./constants";

/** Props returned by {@link PredictiveSearchFormRegister} for the query input. */
export interface PredictiveSearchQueryInputAttributes {
  name: "q";
  type: "search";
  autoComplete: "off";
  autoCapitalize: "off";
  spellCheck: false;
}

/** Props returned by {@link getPredictiveSearchFormAttributes} for the search form. */
export interface PredictiveSearchFormAttributes {
  action: string;
  method: "get";
  role: "search";
}

/**
 * Register function returned by predictive search form bindings.
 *
 * Predictive search forms only register the Storefront API query input.
 */
export type PredictiveSearchFormRegister = {
  (field: "query"): PredictiveSearchQueryInputAttributes;
};

/** Creates a {@link PredictiveSearchFormRegister} for framework-neutral form fields. */
export function createPredictiveSearchFormRegister(): PredictiveSearchFormRegister {
  return registerPredictiveSearchFormField;
}

function registerPredictiveSearchFormField(field: string): PredictiveSearchQueryInputAttributes {
  if (field !== "query") {
    throw new Error(`Unknown predictive search form field: "${field}".`);
  }

  return {
    name: "q",
    type: "search",
    autoComplete: "off",
    autoCapitalize: "off",
    spellCheck: false,
  };
}

/** Returns progressive-enhancement attributes for a predictive search form. */
export function getPredictiveSearchFormAttributes(
  action: string = "/search",
): PredictiveSearchFormAttributes {
  return {
    action,
    method: "get",
    role: "search",
  };
}

export function readPredictiveSearchFormTerm(formData: FormData): string {
  const value = formData.get(PREDICTIVE_SEARCH_QUERY_PARAM);
  return typeof value === "string" ? value : "";
}
