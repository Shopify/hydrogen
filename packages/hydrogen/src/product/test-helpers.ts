import type {Navigation, Location} from 'react-router';

/**
 * Creates a properly typed Navigation object for testing purposes.
 * This helper ensures TypeScript 5.9+ compatibility with React Router 7.9.x types.
 */
export function createMockNavigation(
  state: Navigation['state'],
  search: string = '',
): Navigation {
  if (state === 'idle') {
    return {
      state: 'idle',
      location: undefined,
      formMethod: undefined,
      formAction: undefined,
      formEncType: undefined,
      formData: undefined,
      json: undefined,
      text: undefined,
    };
  }

  const location: Location = {
    search,
    pathname: '',
    hash: '',
    state: null,
    key: 'default',
  };

  if (state === 'loading') {
    return {
      state: 'loading',
      location,
      formMethod: undefined,
      formAction: undefined,
      formEncType: undefined,
      formData: undefined,
      json: undefined,
      text: undefined,
    };
  } else {
    // submitting state
    return {
      state: 'submitting',
      location,
      formMethod: 'POST',
      formAction: '/',
      formEncType: 'application/x-www-form-urlencoded',
      formData: new FormData(),
      json: undefined,
      text: undefined,
    };
  }
}
