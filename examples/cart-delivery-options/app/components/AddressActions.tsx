import { useRef } from 'react';
import type { CartAddressFragment } from 'storefrontapi.generated';
import { type FetcherWithComponents } from '@remix-run/react';
import { CartForm } from '@shopify/hydrogen';

type AddressActionsProps = {
  activeAddress: CartAddressFragment | undefined;
}

export function AddressActions({ activeAddress }: AddressActionsProps) {
  const editDialogRef = useRef<HTMLDialogElement>(null);
  const newDialogRef = useRef<HTMLDialogElement>(null);

  function openEditAddressModal() {
    editDialogRef.current?.showModal();
  };

  function openNewAddressModal() {
    newDialogRef.current?.showModal();
  };

  function closeModals() {
    editDialogRef.current?.close();
    newDialogRef.current?.close();
  };

  return (
    <>
      <div style={{ display: 'flex', gap: '.25rem', marginLeft: '.5rem' }}>
        {activeAddress && (
          <>
            <button onClick={openEditAddressModal}>EDIT</button>
            <CartForm
              route='/cart'
              action={CartForm.ACTIONS.DeliveryAddressesRemove}
              inputs={{ addressIds: [activeAddress.id] }}
            >
              {() => {
                return (
                  <button type="submit">DELETE</button>
                )
              }}
            </CartForm>
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
      <NewAddressModal
        dialogRef={newDialogRef}
        onClose={closeModals}
      />
    </>
  );
};

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
    return <div>No address selected</div>
  }
  return (
    <dialog ref={dialogRef} style={{ width: '400px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <h2>Edit Address</h2>
        <button onClick={onClose}>Close</button>
      </div>
      <br />
      <CartForm route='/cart' action={CartForm.ACTIONS.DeliveryAddressesUpdate}>
        {(fetcher: FetcherWithComponents<any>) => {
          return (
            <>
              <FormFields activeAddress={activeAddress} />
              <div style={{ display: 'flex', flexDirection: 'row', gap: '1rem' }}>
                <button onClick={() => {
                }} type="submit">Save</button>
                <button
                  style={{
                    display: 'inline-block',
                    backgroundColor: 'red',
                    color: 'white'
                  }}
                  onClick={(event) => {
                    event.preventDefault();
                    const form = new FormData()

                    form.append('addressIds', JSON.stringify([activeAddress.id]))

                    fetcher.submit(form, {
                      action: CartForm.ACTIONS.DeliveryAddressesRemove,
                      method: 'POST',
                    })
                  }}
                >
                  Delete
                </button>
              </div>
            </>
          )
        }}
      </CartForm>
    </dialog >
  )
}

function NewAddressModal({
  dialogRef,
  onClose,
}: {
  dialogRef: React.RefObject<HTMLDialogElement>;
  onClose: () => void;
}) {
  return (
    <dialog ref={dialogRef} style={{ width: '400px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <h2>New Address</h2>
        <button onClick={onClose}>Close</button>
      </div>
      <br />
      <CartForm route='/cart' action={CartForm.ACTIONS.DeliveryAddressesAdd}>
        {() => {
          return (
            <>
              <FormFields />
              <button type="submit">Add</button>
            </>
          )
        }}
      </CartForm>
    </dialog >
  )
}

export function FormFields({ activeAddress }: { activeAddress?: CartAddressFragment }) {
  const address = activeAddress ? activeAddress.address : {} as CartAddressFragment['address']
  const selected = activeAddress ? activeAddress.selected : false
  const oneTimeUse = activeAddress ? activeAddress.oneTimeUse : false
  return (
    <div style={{ display: 'flex', flexDirection: "column" }}>
      <input name="id" type="text" defaultValue={activeAddress?.id} hidden />
      <fieldset>
        <label>First Name</label>
        <input type="text" name="firstName" defaultValue={address?.firstName ? address.firstName : undefined} />
      </fieldset>
      <fieldset>
        <label>Last Name</label>
        <input type="text" name="lastName" defaultValue={address?.lastName ? address.lastName : undefined} />
      </fieldset>
      <fieldset>
        <label>Address 1</label>
        <input type="text" name="address1" defaultValue={address?.address1 ? address.address1 : undefined} />
      </fieldset>
      <fieldset>
        <label>Address 2</label>
        <input type="text" name="address2" defaultValue={address?.address2 ? address.address2 : undefined} />
      </fieldset>
      <fieldset>
        <label>City</label>
      </fieldset>
      <input type="text" name="city" defaultValue={address?.city ? address.city : undefined} />
      <fieldset>
        <label>Province</label>
        <input type="text" name="provinceCode" defaultValue={address?.provinceCode ? address.provinceCode : undefined} />
      </fieldset>
      <fieldset>
        <label>Zip</label>
        <input type="text" name="zip" defaultValue={address?.zip ? address.zip : undefined} />
      </fieldset>
      <fieldset>
        <label>Country</label>
        <input type="text" minLength={2} maxLength={2} name="countryCode" defaultValue={address?.countryCode ? address.countryCode : undefined} />
      </fieldset>
      <div style={{ display: 'flex', flexDirection: 'row', gap: '1rem' }}>
        <fieldset style={{ display: 'flex', flexDirection: 'row', gap: '1rem' }}>
          <label>Make default?</label>
          <input type="checkbox" name="selected" defaultChecked={selected} />
        </fieldset>
        <fieldset style={{ display: 'flex', flexDirection: 'row', gap: '1rem' }}>
          <label>One time use?</label>
          <input name="oneTimeUse" type="checkbox" defaultChecked={oneTimeUse} />
        </fieldset>
      </div>
    </div>
  )
}
