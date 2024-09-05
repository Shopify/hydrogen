import { SellingPlan, SellingPlanGroup } from "@shopify/hydrogen/storefront-api-types";

type DeepPartial<T> = {
	[P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Get the selectedSellingPlan and firstSellingPlanUrl from the request query params and selling plan groups
 * @param request - The request object
 * @param paramKey - The query param key to use for the selected selling plan. Must match the key used in the SellingPlanSelector
  * @returns The selected selling plan and the first selling plan url
*/
export function getSelectedSellingPlan<T>({
  request,
  productHandle,
  sellingPlanGroups,
  paramKey: customParamKey,
}: {
  request: Request;
  productHandle: string
  sellingPlanGroups: DeepPartial<SellingPlanGroup>[]
  paramKey?: string
}): {
  selectedSellingPlan: T | null
  firstSellingPlanUrl: string | null
} {
  if (!productHandle) {
    throw new Error('Expected `productHandle` to be defined');
  }

  if (!sellingPlanGroups) {
    throw new Error('Expected `sellingPlansGroups` to be defined');
  }

  let paramKey = 'selling_plan'
  if (customParamKey) {
    paramKey = customParamKey;
  }

  const url = new URL(request.url);
  const selectedSellingPlanId = url.searchParams.has('selling_plan')
    ? url.searchParams.get('selling_plan')
    : null

  const selectedSellingPlanGid = `gid://shopify/SellingPlan/${selectedSellingPlanId}`

  const sellingPlans = sellingPlanGroups
   .filter((sellingPlanGroup) => {
     const includesSellingPlans = typeof sellingPlanGroup.sellingPlans !== 'undefined' && sellingPlanGroup?.sellingPlans?.nodes
     if (!includesSellingPlans) {
       console.warn(`Selling plan group does not include sellingPlan nodes`)
       return false
     }
     return true
   })
   .map(({sellingPlans}) => sellingPlans?.nodes)
   .flat()
   .filter((sellingPlan) => sellingPlan && sellingPlan.id) as NonNullable<SellingPlan>[]

  if (!sellingPlans.length) {
    console.warn(`No selling plans found`)
    return {selectedSellingPlan: null, firstSellingPlanUrl: null}
  }

  const selectedSellingPlan = (sellingPlans
    .filter((sellingPlan) => {
      return sellingPlan.id === selectedSellingPlanGid
    }, null)[0] ?? null) as T | null

  const firstSellingPlanId = sellingPlans[0].id.split('/').pop() ?? ''

  let firstSellingPlanUrl = null;

  url.searchParams.set(paramKey, firstSellingPlanId)
  firstSellingPlanUrl  = `/products/${productHandle}?${url.searchParams.toString()}` as string

  return {selectedSellingPlan, firstSellingPlanUrl}
}
