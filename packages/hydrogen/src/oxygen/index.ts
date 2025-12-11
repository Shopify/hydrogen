// For legacy reasons, we re-export this from `/oxygen`.
// Since React Router uses Fetch API by default, Hydrogen
// should too. Therefore, there's nothing special to do when using Oxygen.
// TODO: Remove in new major version.
export {createRequestHandler} from '../createRequestHandler';
export {getStorefrontHeaders} from '../utils/request';
export type {StorefrontHeaders} from '../types';
