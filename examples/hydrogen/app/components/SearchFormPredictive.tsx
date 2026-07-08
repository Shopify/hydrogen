import {
  usePredictiveSearchActions,
  usePredictiveSearchForm,
  type PredictiveSearchFormResult,
} from "@shopify/hydrogen/react";
import React, { useRef, useEffect } from "react";
import { useNavigate, type FormProps } from "react-router";

import { useAside } from "./Aside";

type PredictiveSearchInputEvent =
  | React.ChangeEvent<HTMLInputElement>
  | React.FocusEvent<HTMLInputElement>;

type SearchFormPredictiveChildren = (args: {
  fetchResults: (event: PredictiveSearchInputEvent) => void;
  goToSearch: () => void;
  inputRef: React.MutableRefObject<HTMLInputElement | null>;
  register: PredictiveSearchFormResult["register"];
}) => React.ReactNode;

type SearchFormPredictiveProps = Omit<FormProps, "children"> & {
  children: SearchFormPredictiveChildren | null;
};

export const SEARCH_ENDPOINT = "/search";

export function SearchFormPredictive({
  children,
  className = "predictive-search-form",
  ...props
}: SearchFormPredictiveProps) {
  const { clear, search } = usePredictiveSearchActions();
  const { formProps, register } = usePredictiveSearchForm();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const navigate = useNavigate();
  const aside = useAside();

  function goToSearch(term = inputRef.current?.value ?? "") {
    void navigate(getSearchPageUrl(term));
    clear();
    aside.close();
  }

  function fetchResults(event: PredictiveSearchInputEvent) {
    void search(event.currentTarget.value || "");
  }

  // ensure the passed input has a type of search, because SearchResults
  // will select the element based on the input
  useEffect(() => {
    inputRef.current?.setAttribute("type", "search");
  }, []);

  if (typeof children !== "function") {
    return null;
  }

  const predictiveSearchFormProps = formProps({
    ...props,
    className,
    onSubmit: (event, term) => {
      event.preventDefault();
      event.stopPropagation();
      inputRef.current?.blur();
      goToSearch(term);
    },
  });

  return (
    <form {...predictiveSearchFormProps}>
      {children({ inputRef, register, fetchResults, goToSearch })}
    </form>
  );
}

export function getSearchPageUrl(term: string): string {
  if (!term) return SEARCH_ENDPOINT;

  const searchParams = new URLSearchParams({ q: term });
  return `${SEARCH_ENDPOINT}?${searchParams}`;
}
