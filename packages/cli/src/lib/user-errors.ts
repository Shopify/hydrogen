import {AbortError} from '@shopify/cli-kit/node/error';

export interface UserError {
  code: string | undefined;
  field: string[];
  message: string;
}

export function renderUserErrors(userErrors: UserError[]) {
  const errorMessages = userErrors.map(({message}) => message).join(', ');
  renderError(errorMessages);
}

export function renderError(message: string) {
  throw new AbortError(message);
}
