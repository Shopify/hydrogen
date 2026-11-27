import type { RefObject } from "react";
import { describe, expectTypeOf, it } from "vitest";

import type { ViewEventElement } from "../../vendor/standard-events";
import type { CollectionViewProps } from "./collection-view";

describe("react collection view types", () => {
  type Base = { collection: { id: string; handle: string }; productsCount: number };
  type ElementRef = RefObject<(HTMLElement & ViewEventElement) | null>;

  it("requires elementRef with the manual trigger, and only with it", () => {
    expectTypeOf<
      Base & { trigger: "manual"; elementRef: ElementRef }
    >().toMatchTypeOf<CollectionViewProps>();
    expectTypeOf<Base & { trigger: "intersect" }>().toMatchTypeOf<CollectionViewProps>();

    type ManualWithoutRef = Base & { trigger: "manual" };
    type ConnectWithRef = Base & { trigger: "connect"; elementRef: ElementRef };
    // @ts-expect-error `trigger="manual"` requires `elementRef`.
    expectTypeOf<ManualWithoutRef>().toMatchTypeOf<CollectionViewProps>();
    // @ts-expect-error `elementRef` is only for `trigger="manual"`.
    expectTypeOf<ConnectWithRef>().toMatchTypeOf<CollectionViewProps>();
  });
});
