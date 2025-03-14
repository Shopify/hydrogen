import { useRef } from 'react';
import { AddressForm, FormFields } from './DeliveryAddressManager'
import type { CartAddressFragment } from 'storefrontapi.generated';

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

  function handleClose() {
    editDialogRef.current?.close();
    newDialogRef.current?.close();
  };

  function handleDelete() {
    handleClose();
  };

  return (
    <>
      <div style={{ display: 'flex', gap: '.25rem' }}>
        {activeAddress && (
          <>
            <button onClick={openEditAddressModal}>EDIT</button>
            <AddressForm
              action="CartDeliveryAddressesRemove"
              inputs={{ addressIds: [activeAddress.id] }}
            >
              {() => {
                return (
                  <button type="submit">REMOVE</button>
                )
              }}
            </AddressForm>
            <span> | </span>
          </>
        )}
        <button onClick={openNewAddressModal}>NEW</button>
      </div>
      {activeAddress && (
        <EditAddressModal
          dialogRef={editDialogRef}
          handleClose={handleClose}
          activeAddress={activeAddress}
        />
      )}
      <NewAddressModal
        dialogRef={newDialogRef}
        handleClose={handleClose}
      />
    </>
  );
};

function EditAddressModal({
  dialogRef,
  handleClose,
  activeAddress,
}: {
  dialogRef: React.RefObject<HTMLDialogElement>;
  handleClose: () => void;
  activeAddress: CartAddressFragment | undefined;
}) {
  if (!activeAddress) {
    return <div>No address selected</div>
  }
  return (
    <dialog ref={dialogRef} style={{ width: '50%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <h2>Edit Address</h2>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button onClick={handleClose}>Close</button>
          <AddressForm
            action="CartDeliveryAddressesRemove"
            inputs={{ addressIds: [activeAddress.id] }}
          >
            {() => {
              return (
                <button type="submit">Delete</button>
              )
            }}
          </AddressForm>
        </div>
      </div>
      <AddressForm
        action="CartDeliveryAddressesUpdate"
        inputs={{ id: activeAddress.id }}
      >
        {() => {
          return (
            <>
              <FormFields activeAddress={activeAddress} />
              <button type="submit">Update Address</button>
            </>
          )
        }}
      </AddressForm>
      <div>
        <button onClick={handleClose}>Close</button>
      </div>
    </dialog >
  )
}

function NewAddressModal({
  dialogRef,
  handleClose,
}: {
  dialogRef: React.RefObject<HTMLDialogElement>;
  handleClose: () => void;
}) {
  return (
    <dialog ref={dialogRef} style={{ width: '50%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <h2>New Address</h2>
        <button onClick={handleClose}>Close</button>
      </div>
      <AddressForm action='CartDeliveryAddressesAdd'>
        {() => {
          return (
            <>
              <p>Add address</p>
              <AddressForm action="CartDeliveryAddressesAdd">
                {() => {
                  return (
                    <>
                      <FormFields />
                      <button type="submit">Add Address</button>
                    </>
                  )
                }}
              </AddressForm>

            </>
          )
        }}
      </AddressForm>
    </dialog>
  )
}
