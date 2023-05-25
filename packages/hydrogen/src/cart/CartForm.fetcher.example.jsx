import {json} from '@remix-run/server-runtime';
import {CartForm__unstable as CartForm} from '@shopify/hydrogen';
import invariant from 'tiny-invariant';

export default function Cart() {
  return (
    <CartForm action={CartForm.ACTIONS.NoteUpdate} inputs={{note: ''}}>
      {(fetcher) => {
        return (
          <>
            <input
              id="isGiftCheckbox"
              type="checkbox"
              onChange={(event) =>
                fetcher.submit(
                  {
                    [CartForm.INPUT_NAME]: JSON.stringify({
                      action: CartForm.ACTIONS.NoteUpdate,
                      note: event.target.checked ? 'gift' : '',
                    }),
                  },
                  {method: 'post', action: '/cart'},
                )
              }
            />
            <label htmlFor="isGiftCheckbox">This is a gift</label>
          </>
        );
      }}
    </CartForm>
  );
}

export async function action({request, context}) {
  const {cart} = context;
  const headers = new Headers();

  const formData = await request.formData();
  const {action, inputs} = cart.getFormInput(formData);

  let status = 200;
  let result;

  if (action === CartForm.ACTIONS.NoteUpdate) {
    result = await cart.updateNote(inputs.note);
  } else {
    invariant(false, `${action} cart action is not defined`);
  }

  cart.setCartId(result.cart.id, headers);

  return json(result, {status, headers});
}
