import { describe, expectTypeOf, it } from "vitest";

import type { CollectionActions as CoreCollectionActions } from "../core";
import type { CollectionActions } from "./index";
import { useCollectionForm } from "./index";

describe("vue collection types", () => {
  it("re-exports the core CollectionActions type", () => {
    expectTypeOf<CollectionActions>().toEqualTypeOf<CoreCollectionActions>();
  });

  it("passes a SubmitEvent to formProps callbacks", () => {
    type FormPropsOptions = NonNullable<
      Parameters<ReturnType<typeof useCollectionForm>["formProps"]>[0]
    >;

    expectTypeOf<Parameters<NonNullable<FormPropsOptions["beforeSubmit"]>>[0]>().toEqualTypeOf<
      SubmitEvent
    >();
    expectTypeOf<Parameters<NonNullable<FormPropsOptions["afterSubmit"]>>[0]>().toEqualTypeOf<
      SubmitEvent
    >();

    function Consumer() {
      const { formProps } = useCollectionForm();
      formProps({
        beforeSubmit: (e) => {
          expectTypeOf(e.submitter).toEqualTypeOf<HTMLElement | null>();
        },
      });
    }

    void Consumer;
  });
});
