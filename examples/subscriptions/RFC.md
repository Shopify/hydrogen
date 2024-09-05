## Returning `sellingPlanGroups` objects

```ts
function SellingPlanForm({
  selectedVariant,
  selectedSellingPlan,
  sellingPlanGroups,
}: {
  selectedVariant
  selectedSellingPlan
  sellingPlanGroups
}) {
  const { open } = useAside();
  const { publish, shop, cart, prevCart } = useAnalytics();

  return (
    <div className="selling-plan-form">
      <SellingPlanSelector
        sellingPlanGroups={sellingPlanGroups.nodes}
        selectedSellingPlan={selectedSellingPlan}
      >
        {({ sellingPlanGroups, selectedSellingPlan }) => {
          return (
            sellingPlanGroups?.map((sellingPlanGroup) =>
              <SellingPlanGroup
                sellingPlanGroup={sellingPlanGroup}
                key={sellingPlanGroup.name}
              />
            ))

        }}
      </SellingPlanSelector>
      <AddToCartButton
        disabled={
          !selectedVariant ||
          !selectedVariant.availableForSale ||
          (sellingPlanGroups.nodes.length > 0 && !selectedSellingPlan)
        }
        onClick={() => {
          open('cart');
          publish('cart_viewed', {
            cart,
            prevCart,
            shop,
            url: window.location.href || '',
          } as CartViewPayload);
        }}
        lines={
          selectedVariant
            ? [
              {
                merchandiseId: selectedVariant.id,
                quantity: 1,
                selectedVariant,
                sellingPlanId: selectedSellingPlan?.id,
              },
            ]
            : []
        }
      >
        {selectedSellingPlan ? 'Subscribe' : 'Select a subscription'}
      </AddToCartButton>
    </div>
  );
}

// Each selling plan Group
function SellingPlanGroup({
  sellingPlanGroup,
}: {
  sellingPlanGroup: EnrichedSellingPlanGroup
}) {
  return (
    <div key={sellingPlanGroup.name}>
      <p className="mb-2">
        <strong>{sellingPlanGroup.name}:</strong>
      </p>
      <div>
        {sellingPlanGroup.sellingPlans.nodes.map((sellingPlan) => {
          return (
            <Link
              key={sellingPlan.id}
              prefetch="intent"
              to={sellingPlan.url}
              className={`selling-plan ${sellingPlan.isSelected ? 'selected' : 'unselected'}`}
              preventScrollReset
              replace
            >
              <p>
                {sellingPlan.options.map(
                  (option) => `${option.value}`,
                )}
              </p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

```

## Returning groups with Nested components

```ts
function SellingPlanForm({
  selectedVariant,
  selectedSellingPlan,
  sellingPlanGroups,
}: {
  selectedVariant
  selectedSellingPlan
  sellingPlanGroups
}) {
  const { open } = useAside();
  const { publish, shop, cart, prevCart } = useAnalytics();

  return (
    <div className="selling-plan-form">
      <SellingPlanSelector sellingPlanGroups={sellingPlanGroups.nodes} selectedSellingPlan={selectedSellingPlan}>
        {({ groups }) => {
          return (
            <div>
              {groups.map(({SellingPlanGroup}) => (
                <SellingPlanGroup>
                   {({ plans, name }) => (
                     <div>
                        <h1>{name}</h1>
                        {plans.map(({SellingPlan}) => (
                           <SellingPlan>
                             {({isSelected, options}) => {
                               return options.map((option) => <p>{option}</p>
                             }}
                           </SellingPlan />
                        )}
                     </div>
                   )}
                </SellingPlanGroup>
              )}
            </div>
          )
        }}
      </SellingPlanSelector>

      <AddToCartButton
        disabled={
          !selectedVariant ||
          !selectedVariant.availableForSale ||
          (sellingPlanGroups.nodes.length > 0 && !selectedSellingPlan)
        }
        onClick={() => {
          open('cart');
          publish('cart_viewed', {
            cart,
            prevCart,
            shop,
            url: window.location.href || '',
          } as CartViewPayload);
        }}
        lines={
          selectedVariant
            ? [
              {
                merchandiseId: selectedVariant.id,
                quantity: 1,
                selectedVariant,
                sellingPlanId: selectedSellingPlan?.id,
              },
            ]
            : []
        }
      >
        {selectedSellingPlan ? 'Subscribe' : 'Select a subscription'}
      </AddToCartButton>
    </div>
  );
}
```
