import { describe, expectTypeOf, it } from "vitest";

import { useCollectionForm } from "./index";

type FormPropsOptions = NonNullable<
  Parameters<ReturnType<typeof useCollectionForm>["formProps"]>[0]
>;

describe("vue useCollectionForm types", () => {
  it("passes a SubmitEvent to formProps callbacks", () => {
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

  it("accepts callbacks typed with a plain Event", () => {
    type EventCallback = (e: Event) => void;

    expectTypeOf<EventCallback>().toExtend<NonNullable<FormPropsOptions["beforeSubmit"]>>();
    expectTypeOf<EventCallback>().toExtend<NonNullable<FormPropsOptions["afterSubmit"]>>();
  });
});
