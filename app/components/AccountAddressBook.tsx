import { Outlet, useOutlet } from "@remix-run/react";
import type {
  Customer,
  MailingAddress,
} from "@shopify/hydrogen-ui-alpha/storefront-api-types";
import { Button, Text, Modal } from "~/components";
import type { EditAddressContext } from "~/routes/account/address/$addressId";

export function AccountAddressBook({
  customer,
  addresses,
}: {
  customer: Customer;
  addresses: MailingAddress[];
}) {
  const editingAddress = useOutlet();

  return (
    <>
      {editingAddress && (
        <Modal cancelLink=".">
          <Outlet
            context={
              {
                addresses,
                defaultAddress: customer.defaultAddress,
              } as EditAddressContext
            }
          />
        </Modal>
      )}
      <div className="grid w-full gap-4 p-4 py-6 md:gap-8 md:p-8 lg:p-12">
        <h3 className="font-bold text-lead">Address Book</h3>
        <div>
          {!addresses?.length ? (
            <Text className="mb-1" width="narrow" as="p" size="copy">
              You haven&apos;t saved any addresses yet.
            </Text>
          ) : null}
          <div className="w-48">
            <Button
              to="address/add"
              className="mt-2 text-sm w-full mb-6"
              variant="secondary"
            >
              Add an Address
            </Button>
          </div>
          {addresses?.length ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {customer.defaultAddress && (
                <Address address={customer.defaultAddress} defaultAddress />
              )}
              {addresses
                .filter((address) => address.id !== customer.defaultAddress?.id)
                .map((address) => (
                  <Address key={address.id} address={address} />
                ))}
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}
function Address({
  address,
  defaultAddress,
}: {
  address: any;
  defaultAddress?: boolean;
}) {
  return (
    <div className="lg:p-8 p-6 border border-gray-200 rounded flex flex-col">
      {defaultAddress ? (
        <div className="mb-3 flex flex-row">
          <span className="px-3 py-1 text-xs font-medium rounded-full bg-primary/20 text-primary/50">
            Default
          </span>
        </div>
      ) : null}
      <ul className="flex-1 flex-row">
        {address.firstName || address.lastName ? (
          <li>
            {(address.firstName && address.firstName + " ") + address.lastName}
          </li>
        ) : (
          <></>
        )}
        {address.formatted ? (
          address.formatted.map((line: string) => <li key={line}>{line}</li>)
        ) : (
          <></>
        )}
      </ul>

      <div className="flex flex-row font-medium mt-6">
        <button className="text-left underline text-sm">Edit</button>
        <button className="text-left text-primary/50 ml-6 text-sm">
          Remove
        </button>
      </div>
    </div>
  );
}
