// @vitest-environment happy-dom
/**
 * Integration tests with a real CollectionStore (no mocks).
 */
import { act, renderHook } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { describe, it, expect, vi } from "vitest";

import { collectionParamsMatchState } from "../core/collection/url";
import { CollectionProvider, useCollection, useCollectionActions } from "./collection";

const ANIMAL_BEIGE = "filter.v.option.color=Animal&filter.v.option.color=Beige";
const BEIGE = "filter.v.option.color=Beige";

function submitColorFilters(checked: string[]) {
  const form = document.createElement("form");
  for (const value of ["Animal", "Beige"]) {
    const input = document.createElement("input");
    input.type = "checkbox";
    input.name = "filter.v.option.color";
    input.value = value;
    input.checked = checked.includes(value);
    form.appendChild(input);
  }
  const button = document.createElement("button");
  button.type = "submit";
  form.appendChild(button);
  document.body.appendChild(form);

  let captured!: SubmitEvent;
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    captured = e;
  });
  button.click();
  document.body.removeChild(form);
  return captured;
}

describe("CollectionProvider integration", () => {
  it("settles after rapid color toggles when URL and dataSearch reach Beige-only", () => {
    const onChange = vi.fn();
    let urlSearch = "";
    let loaderData = { handle: "freestyle", dataSearch: "" };

    const wrapper = ({ children }: { children: ReactNode }) =>
      createElement(CollectionProvider, { data: loaderData, urlSearch, onChange }, children);

    const { result, rerender } = renderHook(
      () => ({
        state: useCollection(),
        actions: useCollectionActions(),
      }),
      { wrapper },
    );

    act(() => {
      result.current.actions.handleFormSubmit(submitColorFilters(["Animal"]));
      result.current.actions.handleFormSubmit(submitColorFilters(["Animal", "Beige"]));
      result.current.actions.handleFormSubmit(submitColorFilters(["Beige"]));
    });

    expect(result.current.state.status).toBe("loading");
    expect(onChange).toHaveBeenLastCalledWith(`?${BEIGE}`);

    urlSearch = BEIGE;
    loaderData = { handle: "freestyle", dataSearch: BEIGE };
    rerender();

    expect(result.current.state.status).toBe("idle");
    expect(result.current.state.filters).toEqual([
      { variantOption: { name: "color", value: "Beige" } },
    ]);
  });

  it("settles when server data matches Beige URL but store still has Animal+Beige", () => {
    const onChange = vi.fn();
    let urlSearch = ANIMAL_BEIGE;
    let loaderData = { handle: "freestyle", dataSearch: ANIMAL_BEIGE };

    const wrapper = ({ children }: { children: ReactNode }) =>
      createElement(CollectionProvider, { data: loaderData, urlSearch, onChange }, children);

    const { result, rerender } = renderHook(
      () => ({
        state: useCollection(),
        actions: useCollectionActions(),
      }),
      { wrapper },
    );

    expect(result.current.state.status).toBe("idle");
    expect(result.current.state.filters).toHaveLength(2);

    act(() => {
      result.current.actions.handleFormSubmit(submitColorFilters(["Beige"]));
    });

    expect(result.current.state.filters).toEqual([
      { variantOption: { name: "color", value: "Beige" } },
    ]);
    expect(result.current.state.status).toBe("loading");

    urlSearch = BEIGE;
    loaderData = { handle: "freestyle", dataSearch: BEIGE };
    rerender();

    expect(result.current.state.status).toBe("idle");
    expect(collectionParamsMatchState(new URLSearchParams(BEIGE), result.current.state)).toBe(true);
  });
});
