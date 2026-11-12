import { expectTypeOf, it } from "vitest";

import type {
  UpdateCartPayload,
  UpdateCartOptions,
  UpdateCartResult,
} from "../../../vendor/standard-actions";
import type { CartTransport, CreateCartStoreOptions } from "../index";

it("exports the transport contract", () => {
  expectTypeOf<CreateCartStoreOptions["transport"]>().toEqualTypeOf<CartTransport | undefined>();
  expectTypeOf<CartTransport["updateCart"]>().toEqualTypeOf<
    (payload: UpdateCartPayload, options?: UpdateCartOptions) => Promise<UpdateCartResult>
  >();
});
