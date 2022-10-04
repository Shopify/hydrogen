import { type ActionFunction, json, defer } from "@remix-run/cloudflare";
import invariant from "tiny-invariant";
import { getTopProducts as _getTopProducts, updateLineItem } from "~/data";
import { getSession } from "~/lib/session.server";
import memoizee from 'memoizee';

const getTopProducts = memoizee(_getTopProducts, { promise: true, maxAge: 60000 * 5  })

export async function loader() {
  return defer({
    topProducts: getTopProducts(),
  });
}

export const action: ActionFunction = async ({ request, context }) => {
  const [session, formData] = await Promise.all([
    getSession(request, context),
    new URLSearchParams(await request.text()),
  ]);

  const intent = formData.get("intent");
  invariant(intent, "Missing intent");

  const lineId = formData.get("lineId");
  invariant(lineId, "Missing lineId");

  const cartId = await session.get("cartId");
  invariant(cartId, "Missing cartId");

  // TODO: Support redirect when JS is disabled
  // const redirect = formData.get("redirect");

  switch (intent) {
    case "set-quantity": {
      const quantity = Number(formData.get("quantity"));
      await updateLineItem({ cartId, lineItem: { id: lineId, quantity } });
      break;
    }

    case "remove-line-item": {
      /**
       * We're re-using the same mutation as setting a quantity of 0,
       * but theoretically we could use the `cartLinesRemove` mutation.
       */
      await updateLineItem({ cartId, lineItem: { id: lineId, quantity: 0 } });
      break;
    }
  }

  return json({ ok: true });
};

export default function Cart() {
  return <h1>Todo: Build a cart here</h1>;
}
