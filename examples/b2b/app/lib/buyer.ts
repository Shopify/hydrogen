import { HydrogenSession } from '@shopify/hydrogen';


export function getBuyer({session}: {session: HydrogenSession}) {
    const customerAccessToken = session.get('customer_access_token');
    const companyLocationId = session.get('company_location_id');

    return {
        buyer: customerAccessToken ? {
            customerAccessToken,
            companyLocationId,
        } : undefined
    }
}