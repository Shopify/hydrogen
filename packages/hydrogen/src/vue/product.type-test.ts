import { describe, expectTypeOf, it } from "vitest";

import type { ProductFormStore, ProductInput, ProductVariantInput } from "../core/product";
import { useProductForm } from "./index";

declare const store: ProductFormStore<ProductInput<ProductVariantInput>>;

describe("vue product types", () => {
  it("passes a SubmitEvent to formProps callbacks", () => {
    type FormPropsOptions = NonNullable<
      Parameters<ReturnType<typeof useProductForm>["formProps"]>[0]
    >;

    expectTypeOf<Parameters<NonNullable<FormPropsOptions["beforeSubmit"]>>[0]>().toEqualTypeOf<
      SubmitEvent
    >();
    expectTypeOf<Parameters<NonNullable<FormPropsOptions["afterSubmit"]>>[0]>().toEqualTypeOf<
      SubmitEvent
    >();

    function Consumer() {
      const { formProps } = useProductForm(store);
      formProps({
        beforeSubmit: (e) => {
          expectTypeOf(e.submitter).toEqualTypeOf<HTMLElement | null>();
        },
      });
      formProps({
        beforeSubmit: (e: Event) => e.preventDefault(),
        afterSubmit: (e: Event) => e.preventDefault(),
      });
    }

    void Consumer;
  });
});
