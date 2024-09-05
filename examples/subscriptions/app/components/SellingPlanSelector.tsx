import type {Product, SellingPlan, SellingPlanGroup} from '@shopify/hydrogen/storefront-api-types';
import {useMemo} from 'react';
import {useLocation} from '@remix-run/react';

type DeepPartial<T> = {
	[P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/* Enriched sellingPlan type including isSelected and url */
export type EnrichedSellingPlan = SellingPlan & {
  isSelected: boolean;
  url: string;
};

/* Enriched sellingPlanGroup type including enriched SellingPlan nodes */
export type EnrichedSellingPlanGroup = Omit<
  SellingPlanGroup,
  'sellingPlans'
> & {
  sellingPlans: {
    nodes: EnrichedSellingPlan[];
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
 *     {({sellingPlanGroups}) => ( ...your sellingPlanGroups component )}
 *  </SellingPlanSelector>
 *  ```
 **/
export function SellingPlanSelector({
  sellingPlanGroups: baseSellingPlanGroups,
  selectedSellingPlan,
  children,
  paramKey = 'selling_plan',
}: {
  sellingPlanGroups: DeepPartial<SellingPlanGroup[]>;
  selectedSellingPlan: DeepPartial<SellingPlan> | null;
  paramKey?: string;
  children: (params: {
    sellingPlanGroups: EnrichedSellingPlanGroup[];
    selectedSellingPlan: DeepPartial<SellingPlan> | null;
  }) => React.ReactNode;
}) {
  const {search, pathname} = useLocation();
  const params = new URLSearchParams(search);

  const sellingPlanGroups = useMemo(
    () =>
      // @ts-ignore
      baseSellingPlanGroups.map((sellingPlanGroup) => {
        // Augmnet each sellingPlan node with isSelected and url
        if (!sellingPlanGroup?.sellingPlans?.nodes) {
          // @ts-ignore
          console.warn(
            'SellingPlanSelector: sellingPlanGroup.sellingPlans.nodes is missing in the product query',
          );
          return null;
        }

        const sellingPlans = sellingPlanGroup?.sellingPlans?.nodes
          .map((baseSellingPlan) => {
            const sellingPlan = baseSellingPlan as EnrichedSellingPlan;
            if (!baseSellingPlan?.id) {
              // @ts-ignore
              console.warn(
                'SellingPlanSelector: sellingPlan.id is missing in the product query',
              );
              return null;
            }
            if (!baseSellingPlan.id) return null;

            const id = baseSellingPlan.id.split('/').pop() as string;
            params.set(paramKey, id);

            sellingPlan.isSelected = selectedSellingPlan?.id === baseSellingPlan.id;
            sellingPlan.url = `${pathname}?${params.toString()}`;
            return sellingPlan;
          })
          .filter(Boolean) as EnrichedSellingPlan[];

        sellingPlanGroup.sellingPlans.nodes = sellingPlans;

        return sellingPlanGroup;
      }),
    [baseSellingPlanGroups],
  );

  return children({sellingPlanGroups, selectedSellingPlan});
}
