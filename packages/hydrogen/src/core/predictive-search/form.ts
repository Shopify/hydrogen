import { PREDICTIVE_SEARCH_QUERY_PARAM } from "./constants";

/**
 * Props returned by {@link PredictiveSearchFormRegister} for the query input.
 *
 * @public
 */
export interface PredictiveSearchQueryInputAttributes {
  name: "q";
  type: "search";
  autoComplete: "off";
  autoCapitalize: "off";
  spellCheck: false;
}

/**
 * Props returned by {@link getPredictiveSearchFormAttributes} for the search form.
 *
 * @public
 */
export interface PredictiveSearchFormAttributes {
  action: string;
  method: "get";
  role: "search";
}

/**
 * Register function for predictive search forms.
 *
 * Predictive search forms only register the Storefront API query input.
 *
 * Building block for the framework bindings. Use it directly on a framework without one.
 *
 * @public
 */
export type PredictiveSearchFormRegister = {
  (field: "query"): PredictiveSearchQueryInputAttributes;
};

/**
 * Creates a {@link PredictiveSearchFormRegister} for framework-neutral form fields.
 *
 * Building block for the framework bindings. Use it directly on a framework without one.
 *
 * @public
 */
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

/**
 * Returns progressive-enhancement attributes for a predictive search form.
 *
 * Building block for the framework bindings. Use it directly on a framework without one.
 *
 * @public
 */
export function getPredictiveSearchFormAttributes(
  action: string = "/search",
): PredictiveSearchFormAttributes {
  return {
    action,
    method: "get",
    role: "search",
  };
}

/**
 * Reads the search term from form data submitted by a predictive search form. Returns an empty string when the `"q"` field is absent or not a string.
 *
 * Building block for the framework bindings. Use it directly on a framework without one.
 *
 * @public
 */
export function readPredictiveSearchFormTerm(formData: FormData): string {
  const value = formData.get(PREDICTIVE_SEARCH_QUERY_PARAM);
  return typeof value === "string" ? value : "";
}
