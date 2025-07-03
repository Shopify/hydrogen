import {useRef} from 'react';
import type {CartAddressFragment} from 'storefrontapi.generated';
import {CartForm} from '@shopify/hydrogen';
type AddressActionsProps = {
  activeAddress: CartAddressFragment | undefined;
};

/**
 * A dropdown component for selecting shipping/billing addresses.
 * @param activeAddress - The currently selected address
 * @param selectedAddress - Currently selected address (can be null)
 * @param onAddressChange - Optional callback function triggered when address selection changes
 * @returns A select dropdown populated with address options or a message if no addresses exist
 */
export function AddressActions({activeAddress}: AddressActionsProps) {
  const editDialogRef = useRef<HTMLDialogElement>(null);
  const newDialogRef = useRef<HTMLDialogElement>(null);

  function openEditAddressModal() {
    editDialogRef.current?.showModal();
  }

  function openNewAddressModal() {
    newDialogRef.current?.showModal();
  }

  function closeModals() {
    editDialogRef.current?.close();
    newDialogRef.current?.close();
  }

  const {selected, id} = activeAddress || {};

  return (
    <>
      <div style={{display: 'flex', gap: '.25rem', marginTop: '.5rem'}}>
        {activeAddress && (
          <>
            <button onClick={openEditAddressModal}>EDIT</button>
            {!selected && id && <SetDefaultAddressForm id={id} />}
            <DeleteAddressForm activeAddress={activeAddress} />
            <span> | </span>
          </>
        )}
        <button onClick={openNewAddressModal}>NEW</button>
      </div>
      {activeAddress && (
        <EditAddressModal
          activeAddress={activeAddress}
          dialogRef={editDialogRef}
          onClose={closeModals}
        />
      )}
      <NewAddressModal dialogRef={newDialogRef} onClose={closeModals} />
    </>
  );
}

/**
 * A component that renders a form to select an address as the default delivery address.
 * When submitted, it updates the cart with the selected address.
 * @param id - The ID of the address to be selected as default
 * @returns  A form with a submit button to select the address
 */
function SetDefaultAddressForm({id}: {id: string}) {
  return (
    <CartForm
      route="/cart"
      action={CartForm.ACTIONS.DeliveryAddressesUpdate}
      inputs={{
        id,
        selected: true,
        oneTimeUse: false,
        addresses: [],
      }}
    >
      <button type="submit">SET DEFAULT</button>
    </CartForm>
  );
}

/**
 * A button component that allows users to delete an address from their cart.
 * When clicked, it submits a form to remove the specified address.
 * @param activeAddress - The address to be deleted
 * @returns  A form with a delete button
 */
function DeleteAddressForm({
  activeAddress,
}: {
  activeAddress: CartAddressFragment;
}) {
  return (
    <CartForm
      route="/cart"
      action={CartForm.ACTIONS.DeliveryAddressesRemove}
      inputs={{addressIds: [activeAddress.id]}}
    >
      <button type="submit">DELETE</button>
    </CartForm>
  );
}

/**
 * Modal component for editing a delivery address.
 * @param props - Component props
 * @param activeAddress - The address being edited
 * @param dialogRef - Reference to the dialog element
 * @param onClose - Function to call when closing the modal
 * @returns  The rendered modal component
 */
function EditAddressModal({
  activeAddress,
  dialogRef,
  onClose,
}: {
  activeAddress: CartAddressFragment | undefined;
  dialogRef: React.RefObject<HTMLDialogElement>;
  onClose: () => void;
}) {
  if (!activeAddress?.id) {
    return <div>No address selected</div>;
  }
  return (
    <dialog ref={dialogRef} style={{width: '400px'}}>
      <div style={{display: 'flex', justifyContent: 'space-between'}}>
        <h2>Edit Address</h2>
        <button onClick={onClose}>CLOSE</button>
      </div>
      <br />
      <div style={{display: 'flex', flexDirection: 'row', gap: '1rem'}}>
        <CartForm
          route="/cart"
          action={CartForm.ACTIONS.DeliveryAddressesUpdate}
        >
          <>
            <FormFields key={'edit'} activeAddress={activeAddress} />
            <div style={{display: 'flex', flexDirection: 'row', gap: '1rem'}}>
              <button
                onClick={() => {
                  onClose();
                }}
                type="submit"
              >
                SAVE
              </button>
            </div>
          </>
        </CartForm>
      </div>
    </dialog>
  );
}

/**
 * Modal component for adding a new address.
 * @param dialogRef - Reference to the dialog element
 * @param onClose - Function to call when the modal should close
 * @returns The rendered modal component
 */
function NewAddressModal({
  dialogRef,
  onClose,
}: {
  dialogRef: React.RefObject<HTMLDialogElement>;
  onClose: () => void;
}) {
  return (
    <dialog ref={dialogRef} style={{width: '400px'}}>
      <div style={{display: 'flex', justifyContent: 'space-between'}}>
        <h2>New Address</h2>
        <button onClick={onClose}>CLOSE</button>
      </div>
      <br />
      <CartForm route="/cart" action={CartForm.ACTIONS.DeliveryAddressesAdd}>
        {() => {
          return (
            <>
              <FormFields key={'new'} />
              <button onClick={onClose} type="submit">
                CREATE
              </button>
            </>
          );
        }}
      </CartForm>
    </dialog>
  );
}

/**
 * FormFields component for rendering address form inputs
 * This component displays a form with address fields, populated with values from
 * an optional activeAddress prop. It includes fields for name, address details,
 * and options to set the address as default or for one-time use.
 * @param [activeAddress] - Optional address data to pre-populate the form
 */
export function FormFields({
  activeAddress,
}: {
  activeAddress?: CartAddressFragment;
}) {
  const address = activeAddress
    ? activeAddress.address
    : ({} as CartAddressFragment['address']);
  const selected = activeAddress ? activeAddress.selected : false;
  const oneTimeUse = activeAddress ? activeAddress.oneTimeUse : false;
  return (
    <div style={{display: 'flex', flexDirection: 'column'}}>
      <input name="id" type="text" defaultValue={activeAddress?.id} hidden />
      <fieldset>
        <label htmlFor="firstName">First Name</label>
        <input
          type="text"
          name="firstName"
          defaultValue={address?.firstName ? address.firstName : undefined}
        />
      </fieldset>
      <fieldset>
        <label htmlFor="lastName">Last Name</label>
        <input
          type="text"
          name="lastName"
          defaultValue={address?.lastName ? address.lastName : undefined}
        />
      </fieldset>
      <fieldset>
        <label htmlFor="address1">Address 1</label>
        <input
          type="text"
          id="address1"
          name="address1"
          defaultValue={address?.address1 ? address.address1 : undefined}
        />
      </fieldset>
      <fieldset>
        <label htmlFor="address2">Address 2</label>
        <input
          type="text"
          id="address2"
          name="address2"
          defaultValue={address?.address2 ? address.address2 : undefined}
        />
      </fieldset>
      <fieldset>
        <label htmlFor="city">City</label>
        <input
          type="text"
          id="city"
          name="city"
          defaultValue={address?.city ? address.city : undefined}
        />
      </fieldset>
      <fieldset>
        <label htmlFor="provinceCode">Province</label>
        <input
          type="text"
          id="provinceCode"
          name="provinceCode"
          defaultValue={
            address?.provinceCode ? address.provinceCode : undefined
          }
        />
      </fieldset>
      <fieldset>
        <label htmlFor="zip">Zip</label>
        <input
          type="text"
          id="zip"
          name="zip"
          defaultValue={address?.zip ? address.zip : undefined}
        />
      </fieldset>
      <fieldset>
        <label htmlFor="countryCode">Country</label>
        <input
          type="text"
          id="countryCode"
          minLength={2}
          maxLength={2}
          name="countryCode"
          defaultValue={address?.countryCode ? address.countryCode : undefined}
        />
      </fieldset>
      <div style={{display: 'flex', flexDirection: 'row', gap: '1rem'}}>
        <fieldset style={{display: 'flex', flexDirection: 'row', gap: '1rem'}}>
          <label htmlFor="selected">Set default?</label>
          <input
            type="checkbox"
            id="selected"
            name="selected"
            defaultChecked={selected}
          />
        </fieldset>
        <fieldset style={{display: 'flex', flexDirection: 'row', gap: '1rem'}}>
          <label htmlFor="oneTimeUse">One time use?</label>
          <input
            id="oneTimeUse"
            name="oneTimeUse"
            type="checkbox"
            defaultChecked={oneTimeUse}
          />
        </fieldset>
      </div>
    </div>
  );
}
