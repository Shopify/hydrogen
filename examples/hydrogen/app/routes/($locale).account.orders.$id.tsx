import type { OrderLineItemFullFragment, OrderQuery } from "customer-accountapi.generated";
import { redirect, useLoaderData } from "react-router";

import { Image } from "~/components/Image";
import { CUSTOMER_ORDER_QUERY } from "~/graphql/customer-account/CustomerOrderQuery";
import { requireCustomerAccessToken } from "~/lib/customer-account";
import { formatMoney } from "~/lib/money";

import type { Route } from "./+types/($locale).account.orders.$id";

type OrderMoney = NonNullable<OrderQuery["order"]>["subtotal"];
type DiscountApplication = NonNullable<
  OrderQuery["order"]
>["discountApplications"]["nodes"][number];

export const meta: Route.MetaFunction = ({ data }) => {
  return [{ title: `Order ${data?.order?.name}` }];
};

export async function loader({ request, params, context }: Route.LoaderArgs) {
  const { customerAccount } = context;
  if (!params.id) {
    return redirect(getAccountOrdersPath(params.locale));
  }

  const accessToken = await requireCustomerAccessToken(request, customerAccount);
  const orderId = atob(params.id);
  const { data, errors }: { data: OrderQuery | null; errors?: Array<{ message: string }> } =
    await customerAccount.client.graphql(CUSTOMER_ORDER_QUERY, {
      accessToken,
      variables: {
        orderId,
      },
    });

  if (errors?.length || !data?.order) {
    throw new Error("Order not found");
  }

  const { order } = data;
  const lineItems = order.lineItems.nodes;
  const fulfillmentStatus = order.fulfillments.nodes[0]?.status ?? "N/A";
  const { discountValue, discountPercentage } = getOrderDiscount(order.discountApplications.nodes);

  return {
    order,
    lineItems,
    discountValue,
    discountPercentage,
    fulfillmentStatus,
  };
}

function getOrderDiscount(discountApplications: DiscountApplication[]) {
  const firstDiscount = discountApplications[0]?.value;

  if (firstDiscount?.__typename === "MoneyV2") {
    return { discountValue: firstDiscount, discountPercentage: null };
  }

  if (firstDiscount?.__typename === "PricingPercentageValue") {
    return { discountValue: null, discountPercentage: firstDiscount.percentage };
  }

  return { discountValue: null, discountPercentage: null };
}

function getAccountOrdersPath(locale: string | undefined) {
  return locale ? `/${locale}/account/orders` : "/account/orders";
}

export default function OrderRoute() {
  const { order, lineItems, discountValue, discountPercentage, fulfillmentStatus } =
    useLoaderData<typeof loader>();
  const processedAt = order.processedAt ? new Date(order.processedAt).toDateString() : "N/A";

  return (
    <div className="account-order">
      <h2>Order {order.name}</h2>
      <p>Placed on {processedAt}</p>
      {order.confirmationNumber && <p>Confirmation: {order.confirmationNumber}</p>}
      <br />
      <div>
        <table>
          <thead>
            <tr>
              <th scope="col">Product</th>
              <th scope="col">Price</th>
              <th scope="col">Quantity</th>
              <th scope="col">Total</th>
            </tr>
          </thead>
          <tbody>
            {lineItems.map((lineItem, lineItemIndex) => (
              // eslint-disable-next-line react/no-array-index-key
              <OrderLineRow key={lineItemIndex} lineItem={lineItem} />
            ))}
          </tbody>
          <tfoot>
            {((discountValue && discountValue.amount) || discountPercentage) && (
              <tr>
                <th scope="row" colSpan={3}>
                  <p>Discounts</p>
                </th>
                <td>
                  {discountPercentage ? (
                    <span>-{discountPercentage}% OFF</span>
                  ) : (
                    discountValue && formatMoney(discountValue)
                  )}
                </td>
              </tr>
            )}
            <OrderTotalRow label="Subtotal" money={order.subtotal} />
            <OrderTotalRow label="Tax" money={order.totalTax} />
            <OrderTotalRow label="Total" money={order.totalPrice} />
          </tfoot>
        </table>
        <div>
          <h3>Shipping Address</h3>
          {order?.shippingAddress ? (
            <address>
              <p>{order.shippingAddress.name}</p>
              {order.shippingAddress.formatted ? <p>{order.shippingAddress.formatted}</p> : ""}
              {order.shippingAddress.formattedArea ? (
                <p>{order.shippingAddress.formattedArea}</p>
              ) : (
                ""
              )}
            </address>
          ) : (
            <p>No shipping address defined</p>
          )}
          <h3>Status</h3>
          <div>
            <p>{fulfillmentStatus}</p>
          </div>
        </div>
      </div>
      <br />
      <p>
        <a target="_blank" href={order.statusPageUrl} rel="noreferrer">
          View Order Status →
        </a>
      </p>
    </div>
  );
}

function OrderLineRow({ lineItem }: { lineItem: OrderLineItemFullFragment }) {
  const price = lineItem.price ? formatMoney(lineItem.price) : "-";
  const totalDiscount = lineItem.totalDiscount ? formatMoney(lineItem.totalDiscount) : "-";

  return (
    <tr key={lineItem.id}>
      <td>
        <div>
          {lineItem?.image && (
            <div>
              <Image data={lineItem.image} width={96} height={96} />
            </div>
          )}
          <div>
            <p>{lineItem.title}</p>
            <small>{lineItem.variantTitle}</small>
          </div>
        </div>
      </td>
      <td>{price}</td>
      <td>{lineItem.quantity}</td>
      <td>{totalDiscount}</td>
    </tr>
  );
}

function OrderTotalRow({ label, money }: { label: string; money?: OrderMoney | null }) {
  return (
    <tr>
      <th scope="row" colSpan={3}>
        <p>{label}</p>
      </th>
      <td>{money ? formatMoney(money) : "-"}</td>
    </tr>
  );
}
