import { PREDICTIVE_SEARCH_QUERY_PARAM } from "./constants";

/**
 * Attributes for the predictive search query input.
 *
 * @publicDocs
 */
export interface PredictiveSearchQueryInputAttributes {
  /** Field name for the search term. The search page, the predictive search route, and the form term reader all read this name. */
  name: "q";
  /** Renders the input as a search field. */
  type: "search";
  /** Turns off browser autocomplete for the query input. */
  autoComplete: "off";
  /** Turns off automatic capitalization of the search term. */
  autoCapitalize: "off";
  /** Turns off spell checking for the query input. */
  spellCheck: false;
}

/** Attributes for the predictive search form. */
export interface PredictiveSearchFormAttributes {
  /** Search page path that the form submits to. Defaults to `/search`. */
  action: string;
  /** Submits the form as a GET request, which puts the search term in the URL. */
  method: "get";
  /** Marks the form as a search landmark for assistive technology. */
  role: "search";
}

/**
 * Returns the attributes for a predictive search form field.
 *
 * The function accepts only `query` and throws for any other field name. The returned attributes name the input `q`, make the input a search field, and turn off autocomplete, autocapitalization, and spell checking. The attribute keys use React casing. In DOM code, assign each value to the matching lowercase property, such as `autocomplete`.
 */
export type PredictiveSearchFormRegister = {
  (field: "query"): PredictiveSearchQueryInputAttributes;
};

/**
 * Creates a register function that returns the attributes for the predictive search query input.
 *
 * @returns A register function that accepts the `query` field name.
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
 * @returns Attributes that make the form submit a GET request to the action path, with a search role.
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
 * Reads the search term from submitted predictive search form data.
 *
 * @param formData The submitted form data. The function reads the `q` field.
 * @returns The search term, or an empty string when the field is absent or isn't a string.
 * @publicDocs
 */
export function readPredictiveSearchFormTerm(formData: FormData): string {
  const value = formData.get(PREDICTIVE_SEARCH_QUERY_PARAM);
  return typeof value === "string" ? value : "";
}
