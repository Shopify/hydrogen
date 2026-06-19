import {NavigationType, type Navigation, type Location} from 'react-router';

/**
 * Creates a properly typed Navigation object for testing purposes.
 */
export function createMockNavigation(
  state: Navigation['state'],
  search: string = '',
): Navigation {
  if (state === 'idle') {
    return {
      state: 'idle',
      location: undefined,
      matches: undefined,
      historyAction: undefined,
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
    mask: undefined,
  };

  if (state === 'loading') {
    return {
      state: 'loading',
      location,
      matches: [],
      historyAction: NavigationType.Push,
      formMethod: undefined,
      formAction: undefined,
      formEncType: undefined,
      formData: undefined,
      json: undefined,
      text: undefined,
    };
  }

  return {
    state: 'submitting',
    location,
    matches: [],
    historyAction: NavigationType.Push,
    formMethod: 'POST',
    formAction: '/',
    formEncType: 'application/x-www-form-urlencoded',
    formData: new FormData(),
    json: undefined,
    text: undefined,
  };
}
