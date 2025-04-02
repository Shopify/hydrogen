import {queryStore} from '~/sanity/loader';
import {client} from '~/sanity/client';

export const {loadQuery} = queryStore;

queryStore.setServerClient(client);
