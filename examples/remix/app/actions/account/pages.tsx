import type { Handle, RemixNode } from "remix/component";

import type {
  Customer,
  CustomerAddress,
  CustomerOrder,
  CustomerOrders,
} from "../../lib/customer-account-queries.ts";
import type { OrderFilterParams } from "../../lib/order-filters.ts";
import { localizePath } from "../../lib/public/i18n.ts";
import { formatMoney } from "../../lib/public/money.ts";
import { Document } from "../../ui/document.tsx";
import { PaginatedResourceSection } from "../../ui/pagination.tsx";
import { Image } from "../../ui/public/image.tsx";

type AccountSection = "orders" | "profile" | "addresses";

export function AccountLayout(
  handle: Handle<{
    customer: Customer;
    pathPrefix: string;
    section: AccountSection;
    title: string;
    children?: RemixNode;
  }>,
) {
  return () => {
    const { children, customer, pathPrefix, section, title } = handle.props;
    const heading = customer.firstName
      ? `Welcome, ${customer.firstName}`
      : "Welcome to your account.";
    const link = (target: AccountSection, label: string) => (
      <a
        href={localizePath(`/account/${target}`, pathPrefix)}
        aria-current={section === target ? "page" : undefined}
        style={{ fontWeight: section === target ? "bold" : undefined }}
      >
        &nbsp;{label}&nbsp;
      </a>
    );

    return (
      <Document title={title}>
        <div class="account">
          <h1>{heading}</h1>
          <br />
          <nav role="navigation">
            {link("orders", "Orders")}
            &nbsp;|&nbsp;
            {link("profile", "Profile")}
            &nbsp;|&nbsp;
            {link("addresses", "Addresses")}
            &nbsp;|&nbsp;
            {/* Logout redirects to Shopify, so it's a native form, not an enhanced one. */}
            <form
              class="account-logout"
              method="post"
              action={`/account/logout?return_to=${encodeURIComponent(localizePath("/", pathPrefix))}`}
              data-rmx-document
            >
              &nbsp;<button type="submit">Sign out</button>
            </form>
          </nav>
          <br />
          <br />
          {children}
        </div>
      </Document>
    );
  };
}

export function OrdersPage(
  handle: Handle<{
    customer: Customer;
    orders: CustomerOrders;
    filters: OrderFilterParams;
    pathPrefix: string;
    url: URL;
  }>,
) {
  return () => {
    const { customer, filters, orders, pathPrefix, url } = handle.props;
    const ordersPath = localizePath("/account/orders", pathPrefix);
    const hasFilters = Boolean(filters.name || filters.confirmationNumber);

    return (
      <AccountLayout customer={customer} pathPrefix={pathPrefix} section="orders" title="Orders">
        <div class="orders">
          <form
            method="get"
            action={ordersPath}
            class="order-search-form"
            aria-label="Search orders"
          >
            <fieldset class="order-search-fieldset">
              <legend class="order-search-legend">Filter Orders</legend>
              <div class="order-search-inputs">
                <input
                  type="search"
                  name="name"
                  placeholder="Order #"
                  aria-label="Order number"
                  defaultValue={filters.name ?? ""}
                  class="order-search-input"
                />
                <input
                  type="search"
                  name="confirmation_number"
                  placeholder="Confirmation #"
                  aria-label="Confirmation number"
                  defaultValue={filters.confirmationNumber ?? ""}
                  class="order-search-input"
                />
              </div>
              <div class="order-search-buttons">
                <button type="submit">Search</button>
                {hasFilters ? <a href={ordersPath}>Clear</a> : null}
              </div>
            </fieldset>
          </form>
          <div class="acccount-orders" aria-live="polite">
            {orders.nodes.length ? (
              <PaginatedResourceSection pageInfo={orders.pageInfo} url={url}>
                {orders.nodes.map((order) => {
                  const orderHref = localizePath(`/account/orders/${btoa(order.id)}`, pathPrefix);
                  const fulfillmentStatus = order.fulfillments.nodes[0]?.status;
                  return (
                    <div key={order.id}>
                      <fieldset>
                        <a href={orderHref}>
                          <strong>#{order.number}</strong>
                        </a>
                        <p>{new Date(order.processedAt).toDateString()}</p>
                        {order.confirmationNumber ? (
                          <p>Confirmation: {order.confirmationNumber}</p>
                        ) : null}
                        <p>{order.financialStatus}</p>
                        {fulfillmentStatus ? <p>{fulfillmentStatus}</p> : null}
                        {formatMoney(order.totalPrice)}
                        <a href={orderHref}>View Order →</a>
                      </fieldset>
                      <br />
                    </div>
                  );
                })}
              </PaginatedResourceSection>
            ) : hasFilters ? (
              <div>
                <p>No orders found matching your search.</p>
                <br />
                <p>
                  <a href={ordersPath}>Clear filters →</a>
                </p>
              </div>
            ) : (
              <div>
                <p>You haven&apos;t placed any orders yet.</p>
                <br />
                <p>
                  <a href={localizePath("/collections", pathPrefix)}>Start Shopping →</a>
                </p>
              </div>
            )}
          </div>
        </div>
      </AccountLayout>
    );
  };
}

export function OrderPage(
  handle: Handle<{ customer: Customer; order: CustomerOrder; pathPrefix: string }>,
) {
  return () => {
    const { customer, order, pathPrefix } = handle.props;
    const processedAt = order.processedAt ? new Date(order.processedAt).toDateString() : "N/A";
    const discount = order.discountApplications.nodes[0]?.value;

    return (
      <AccountLayout
        customer={customer}
        pathPrefix={pathPrefix}
        section="orders"
        title={`Order ${order.name}`}
      >
        <div class="account-order">
          <h2>Order {order.name}</h2>
          <p>Placed on {processedAt}</p>
          {order.confirmationNumber ? <p>Confirmation: {order.confirmationNumber}</p> : null}
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
                {order.lineItems.nodes.map((lineItem) => (
                  <tr key={lineItem.id}>
                    <td>
                      <div>
                        {lineItem.image ? (
                          <div>
                            <Image data={lineItem.image} width={96} height={96} />
                          </div>
                        ) : null}
                        <div>
                          <p>{lineItem.title}</p>
                          <small>{lineItem.variantTitle}</small>
                        </div>
                      </div>
                    </td>
                    <td>{lineItem.price ? formatMoney(lineItem.price) : "-"}</td>
                    <td>{lineItem.quantity}</td>
                    <td>{lineItem.totalDiscount ? formatMoney(lineItem.totalDiscount) : "-"}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                {discount?.__typename === "MoneyV2" ||
                discount?.__typename === "PricingPercentageValue" ? (
                  <tr>
                    <th scope="row" colSpan={3}>
                      <p>Discounts</p>
                    </th>
                    <td>
                      {discount.__typename === "PricingPercentageValue" ? (
                        <span>-{discount.percentage}% OFF</span>
                      ) : (
                        formatMoney(discount)
                      )}
                    </td>
                  </tr>
                ) : null}
                <OrderTotalRow label="Subtotal" money={order.subtotal} />
                <OrderTotalRow label="Tax" money={order.totalTax} />
                <OrderTotalRow label="Total" money={order.totalPrice} />
              </tfoot>
            </table>
            <div>
              <h3>Shipping Address</h3>
              {order.shippingAddress ? (
                <address>
                  <p>{order.shippingAddress.name}</p>
                  {order.shippingAddress.formatted.map((line) => (
                    <p key={line}>{line}</p>
                  ))}
                  {order.shippingAddress.formattedArea ? (
                    <p>{order.shippingAddress.formattedArea}</p>
                  ) : null}
                </address>
              ) : (
                <p>No shipping address defined</p>
              )}
              <h3>Status</h3>
              <div>
                <p>{order.fulfillments.nodes[0]?.status ?? "N/A"}</p>
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
      </AccountLayout>
    );
  };
}

function OrderTotalRow(
  handle: Handle<{ label: string; money?: { amount: string; currencyCode: string } | null }>,
) {
  return () => (
    <tr>
      <th scope="row" colSpan={3}>
        <p>{handle.props.label}</p>
      </th>
      <td>{handle.props.money ? formatMoney(handle.props.money) : "-"}</td>
    </tr>
  );
}

export function ProfilePage(
  handle: Handle<{ customer: Customer; error?: string; pathPrefix: string }>,
) {
  return () => {
    const { customer, error, pathPrefix } = handle.props;
    return (
      <AccountLayout customer={customer} pathPrefix={pathPrefix} section="profile" title="Profile">
        <div class="account-profile">
          <h2>My profile</h2>
          <br />
          <form method="post" action={localizePath("/account/profile", pathPrefix)}>
            <legend>Personal information</legend>
            <fieldset>
              <label htmlFor="firstName">First name</label>
              <input
                id="firstName"
                name="firstName"
                type="text"
                autoComplete="given-name"
                placeholder="First name"
                aria-label="First name"
                defaultValue={customer.firstName ?? ""}
                minLength={2}
              />
              <label htmlFor="lastName">Last name</label>
              <input
                id="lastName"
                name="lastName"
                type="text"
                autoComplete="family-name"
                placeholder="Last name"
                aria-label="Last name"
                defaultValue={customer.lastName ?? ""}
                minLength={2}
              />
            </fieldset>
            {error ? (
              <p role="alert">
                <mark>
                  <small>{error}</small>
                </mark>
              </p>
            ) : (
              <br />
            )}
            <button type="submit">Update</button>
          </form>
        </div>
      </AccountLayout>
    );
  };
}

export const NEW_ADDRESS_ID = "NEW_ADDRESS_ID";

export function AddressesPage(
  handle: Handle<{
    customer: Customer;
    /** Errors keyed by the submitted address ID. */
    errors?: Record<string, string>;
    pathPrefix: string;
  }>,
) {
  return () => {
    const { customer, errors = {}, pathPrefix } = handle.props;
    const addresses = customer.addresses.nodes;

    return (
      <AccountLayout
        customer={customer}
        pathPrefix={pathPrefix}
        section="addresses"
        title="Addresses"
      >
        <div class="account-addresses">
          <h2>Addresses</h2>
          <br />
          <div>
            <div>
              <legend>Create address</legend>
              <AddressForm
                addressId={NEW_ADDRESS_ID}
                address={null}
                error={errors[NEW_ADDRESS_ID]}
                isDefault={false}
                pathPrefix={pathPrefix}
              >
                <button type="submit" name="intent" value="create">
                  Create
                </button>
              </AddressForm>
            </div>
            <br />
            <hr />
            <br />
            {errors.general ? (
              <p role="alert">
                <mark>
                  <small>{errors.general}</small>
                </mark>
              </p>
            ) : null}
            {addresses.length ? (
              <div>
                <legend>Existing addresses</legend>
                {addresses.map((address) => (
                  <AddressForm
                    key={address.id}
                    addressId={address.id}
                    address={address}
                    error={errors[address.id]}
                    isDefault={customer.defaultAddress?.id === address.id}
                    pathPrefix={pathPrefix}
                  >
                    <button type="submit" name="intent" value="update">
                      Save
                    </button>
                    <button type="submit" name="intent" value="delete" formNoValidate>
                      Delete
                    </button>
                  </AddressForm>
                ))}
              </div>
            ) : (
              <p>You have no addresses saved.</p>
            )}
          </div>
        </div>
      </AccountLayout>
    );
  };
}

function AddressForm(
  handle: Handle<{
    addressId: string;
    address: CustomerAddress | null;
    error?: string;
    isDefault: boolean;
    pathPrefix: string;
    children?: RemixNode;
  }>,
) {
  return () => {
    const { address, addressId, children, error, isDefault, pathPrefix } = handle.props;
    // Field IDs must be unique across the several address forms on the page.
    const id = (name: string) => `${addressId}-${name}`;
    const field = (
      name: keyof CustomerAddress & string,
      label: string,
      options: {
        autoComplete: string;
        required?: boolean;
        type?: string;
        maxLength?: number;
        pattern?: string;
        placeholder?: string;
      },
    ) => (
      <>
        <label htmlFor={id(name)}>
          {label}
          {options.required ? "*" : ""}
        </label>
        <input
          id={id(name)}
          name={name}
          aria-label={label}
          autoComplete={options.autoComplete}
          defaultValue={String(address?.[name] ?? "")}
          placeholder={options.placeholder ?? label}
          required={options.required}
          type="text"
          inputMode={options.type === "tel" ? "tel" : undefined}
          maxLength={options.maxLength}
          pattern={options.pattern}
        />
      </>
    );

    return (
      <form id={addressId} method="post" action={localizePath("/account/addresses", pathPrefix)}>
        <fieldset>
          <input type="hidden" name="addressId" value={addressId} />
          {field("firstName", "First name", { autoComplete: "given-name", required: true })}
          {field("lastName", "Last name", { autoComplete: "family-name", required: true })}
          {field("company", "Company", { autoComplete: "organization" })}
          {field("address1", "Address line 1", { autoComplete: "address-line1", required: true })}
          {field("address2", "Address line 2", { autoComplete: "address-line2" })}
          {field("city", "City", { autoComplete: "address-level2", required: true })}
          {field("zoneCode", "State / Province", {
            autoComplete: "address-level1",
            required: true,
          })}
          {field("zip", "Zip / Postal Code", { autoComplete: "postal-code", required: true })}
          {field("countryCode", "Country code", {
            autoComplete: "country",
            required: true,
            maxLength: 2,
            placeholder: "Country",
          })}
          {field("phoneNumber", "Phone", {
            autoComplete: "tel",
            type: "tel",
            pattern: "^\\+?[1-9]\\d{3,14}$",
            placeholder: "+16135551111",
          })}
          <div>
            <input
              defaultChecked={isDefault}
              id={id("defaultAddress")}
              name="defaultAddress"
              type="checkbox"
            />
            <label htmlFor={id("defaultAddress")}>Set as default address</label>
          </div>
          {error ? (
            <p role="alert">
              <mark>
                <small>{error}</small>
              </mark>
            </p>
          ) : (
            <br />
          )}
          <div>{children}</div>
        </fieldset>
      </form>
    );
  };
}

export function LoginFailedPage(handle: Handle<{ pathPrefix: string }>) {
  return () => (
    <Document title="Hydrogen | Sign in">
      <div class="account">
        <h1>Sign in failed</h1>
        <p>We couldn&apos;t sign you in. Please try again.</p>
        <br />
        <a
          href={`${localizePath("/account/login", handle.props.pathPrefix)}?return_to=${encodeURIComponent(localizePath("/account", handle.props.pathPrefix))}`}
          data-rmx-document
        >
          Sign in →
        </a>
      </div>
    </Document>
  );
}
