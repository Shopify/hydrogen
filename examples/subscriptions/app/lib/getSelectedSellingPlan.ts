
/**
 * Get the selected selling plan from the request query params and the product
 * @param request - The request object
 * @param product - The product object
 * @param paramKey - The query param key to use for the selected selling plan. Must match the key used in the SellingPlanSelector
  * @returns The selected selling plan and the first selling plan url
*/
export function getSelectedSellingPlan({
  request,
  product,
  paramKey: customParamKey,
}: {
  request: Request;
  product: ProductFragment;
  paramKey?: string
}) {
  if (!product) {
    throw new Error('Expected `product` to be defined');
  }

  if (!product.sellingPlanGroups) {
    throw new Error('Expected `product.sellingPlansGroup` to be defined');
  }

  let paramKey = 'selling_plan'
  if (customParamKey) {
    paramKey = customParamKey;
  }

  const {sellingPlanGroups} = product;

  const url = new URL(request.url);
  const selectedSellingPlanId = url.searchParams.has('selling_plan')
    ? url.searchParams.get('selling_plan')
    : null

  const selectedSellingPlanGid = `gid://shopify/SellingPlan/${selectedSellingPlanId}`

  const sellingPlans = sellingPlanGroups.nodes
   .map(({sellingPlans}) => sellingPlans.nodes).flat()

  if (!sellingPlans.length) {
    return {selectedSellingPlan: null, sellingPlansCount: 0}
  }

  const selectedSellingPlan = sellingPlans
    .filter((sellingPlan) => {
      return sellingPlan.id === selectedSellingPlanGid
    }, null)[0] ?? null;

  const firstSellingPlanId = sellingPlans[0].id.split('/').pop() ?? ''


  let firstSellingPlanUrl = null;

  if (!selectedSellingPlan && firstSellingPlanId) {
    url.searchParams.set(paramKey, firstSellingPlanId)
    firstSellingPlanUrl  = `/products/${product.handle}?${url.searchParams.toString()}`
  }

  return {selectedSellingPlan, firstSellingPlanUrl}
}
