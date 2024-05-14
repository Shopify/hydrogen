/* eslint-disable @typescript-eslint/no-unused-vars */
import {cartNoteUpdateDefault} from '@shopify/hydrogen';

const cartNote = cartNoteUpdateDefault({
  storefront,
  getCartId,
});

const result = await cartNote('This is a note');
