import type {
  ProductFragment,
  SellingPlanGroupFragment,
  SellingPlanFragment,
} from 'storefrontapi.generated';
import {useMemo} from 'react';
import {useLocation} from '@remix-run/react';

/* Enriched sellingPlan type including isSelected and url */
export type SellingPlan = SellingPlanFragment & {
  isSelected: boolean;
  url: string;
};

/* Enriched sellingPlanGroup type including enriched SellingPlan nodes */
export type SellingPlanGroup = Omit<
  SellingPlanGroupFragment,
  'sellingPlans'
> & {
  sellingPlans: {
    nodes: SellingPlan[];
  };
};

/**
 * A component that simplifies selecting sellingPlans subscription options
 * @example Example use
 * ```ts
 *   <SellingPlanSelector
 *     sellingPlanGroups={sellingPlanGroups}
 *     selectedSellingPlanId={selectedSellingPlanId}
 *   >
 *     {({sellingPlanGroup}) => ( ...your sellingPlanGroup component )}
 *  </SellingPlanSelector>
 *  ```
 **/
export function SellingPlanSelector({
  sellingPlanGroups,
  selectedSellingPlan,
  children,
  paramKey = 'selling_plan',
}: {
  sellingPlanGroups: ProductFragment['sellingPlanGroups'];
  selectedSellingPlan: SellingPlanFragment | null;
  paramKey?: string;
  children: (params: {
    sellingPlanGroup: SellingPlanGroup;
    selectedSellingPlan: SellingPlanFragment | null;
  }) => React.ReactNode;
}) {
  const {search, pathname} = useLocation();
  const params = new URLSearchParams(search);

  return useMemo(
    () =>
      (sellingPlanGroups.nodes as SellingPlanGroup[]).map(
        (sellingPlanGroup) => {
          // Augmnet each sellingPlan node with isSelected and url
          const sellingPlans = sellingPlanGroup.sellingPlans.nodes
            .map((sellingPlan: SellingPlan) => {
              if (!sellingPlan?.id) {
                //eslint-disable-next-line no-console
                console.warn(
                  'SellingPlanSelector: sellingPlan.id is missing in the product query',
                );
                return null;
              }
              if (!sellingPlan.id) return null;
              params.set(paramKey, sellingPlan.id);
              sellingPlan.isSelected =
                selectedSellingPlan?.id === sellingPlan.id;
              sellingPlan.url = `${pathname}?${params.toString()}`;
              return sellingPlan;
            })
            .filter(Boolean) as SellingPlan[];
          sellingPlanGroup.sellingPlans.nodes = sellingPlans;
          return children({sellingPlanGroup, selectedSellingPlan});
        },
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sellingPlanGroups, children, selectedSellingPlan, paramKey, pathname],
  );
}
