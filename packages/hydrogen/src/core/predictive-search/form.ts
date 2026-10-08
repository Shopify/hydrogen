import { PREDICTIVE_SEARCH_QUERY_PARAM } from "./constants";

/**
 * Attributes to spread on the search input of a predictive search form.
 *
 * @publicDocs
 */
export interface PredictiveSearchQueryInputAttributes {
  /** Sends the search term as the `q` URL parameter when the form submits. */
  name: "q";
  /** Renders the input as a search field. */
  type: "search";
  /** Turns off browser autocomplete. */
  autoComplete: "off";
  /** Turns off automatic capitalization of the search term. */
  autoCapitalize: "off";
  /** Turns off spell checking. */
  spellCheck: false;
}

/** Attributes to spread on a predictive search form. */
export interface PredictiveSearchFormAttributes {
  /** Search page path that receives the submitted search term. Defaults to `/search`. */
  action: string;
  /** Submits the form as a GET request, which puts the search term in the URL. */
  method: "get";
  /** Marks the form as a search landmark for assistive technology. */
  role: "search";
}

/**
 * Returns the attributes for the search input of a predictive search form.
 *
 * Pass `query`. Any other field name throws an error. The attribute keys use React casing. In DOM code, set each value on the matching lowercase property, such as `autocomplete`.
 */
export type PredictiveSearchFormRegister = {
  (field: "query"): PredictiveSearchQueryInputAttributes;
};

/**
 * Creates a function that returns the attributes for the search input of a predictive search form. Use the function in DOM code or in UI frameworks without Hydrogen bindings. In React and Vue, use `usePredictiveSearchForm`.
 *
 * @returns A function that takes `query` and returns the search input attributes.
 *
 * @publicDocs
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
 * Returns the attributes for a predictive search form that works without JavaScript.
 *
 * @param action Search page path that the form submits to. Defaults to `/search`.
 * @returns Attributes that submit the search term to the search page as a GET request.
 * @publicDocs
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
 * Reads the search term from a submitted predictive search form.
 *
 * @param formData Form data from the submitted search form.
 * @returns The search term, or an empty string when the form data has no `q` text value.
 * @publicDocs
 */
export function readPredictiveSearchFormTerm(formData: FormData): string {
  const value = formData.get(PREDICTIVE_SEARCH_QUERY_PARAM);
  return typeof value === "string" ? value : "";
}
