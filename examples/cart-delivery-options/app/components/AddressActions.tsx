import { useRef } from 'react';
import { AddressForm, FormFields } from './DeliveryAddressManager'
import type { CartAddressFragment } from 'storefrontapi.generated';

type AddressActionsProps = {
  activeAddress: CartAddressFragment | undefined;
  onUpdate?: (updatedAddress: CartAddressFragment) => void;
  onDelete?: () => void;
}

export function AddressActions({ activeAddress, onUpdate, onDelete }: AddressActionsProps) {
  const editDialogRef = useRef<HTMLDialogElement>(null);
  const newDialogRef = useRef<HTMLDialogElement>(null);

  function handleEditClick() {
    editDialogRef.current?.showModal();
  };

  function handleNewClick() {
    newDialogRef.current?.showModal();
  };

  function handleClose() {
    editDialogRef.current?.close();
    newDialogRef.current?.close();
  };

  // const handleUpdate = (updatedAddress: CartAddressFragment) => {
  //   onUpdate(updatedAddress);
  //   handleClose();
  // };

  function handleDelete() {
    onDelete?.();
    handleClose();
  };


  return (
    <>
      <div>
        <button onClick={handleEditClick}>EDIT</button>
        <button onClick={handleDelete}>REMOVE</button>
        <span> | </span>
        <button onClick={handleNewClick}>NEW</button>
      </div>
      <EditAddressModal
        dialogRef={editDialogRef}
        handleClose={handleClose}
        handleDelete={handleDelete}
        activeAddress={activeAddress}
      />
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
  handleDelete,
  activeAddress,
}: {
  dialogRef: React.RefObject<HTMLDialogElement>;
  handleClose: () => void;
  handleDelete: () => void;
  activeAddress: CartAddressFragment | undefined;
}) {
  return (
    <dialog ref={dialogRef} style={{ width: '50%' }}>
      <div>
        <button onClick={handleClose}>Close</button>
        <button onClick={handleDelete} className="danger">Delete</button>
      </div>
      <h2>Edit Address</h2>
      <AddressForm action='CartDeliveryAddressesUpdate'>
        {() => {
          return (
            <>
              {!activeAddress ? (
                <div>No address selected</div>
              ) : (
                <>
                  <AddressForm
                    action="CartDeliveryAddressesRemove"
                    inputs={{ addressIds: [activeAddress.id] }}
                  >
                    {() => {
                      return (
                        <button type="submit">Delete Address</button>
                      )
                    }}
                  </AddressForm>
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
                </>
              )}
            </>
          )
        }}
      </AddressForm>
      <div>
        <button onClick={handleClose}>Close</button>
        <button onClick={handleDelete} className="danger">Delete</button>
      </div>
    </dialog>
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
      <div>
        <button onClick={handleClose}>Close</button>
      </div>
      <h2>New Address</h2>
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
