import type {
  PredictiveQueryFragment,
  SearchProductFragment,
  SearchArticleFragment,
  SearchPageFragment,
  PredictiveProductFragment,
  PredictiveCollectionFragment,
  PredictivePageFragment,
  PredictiveArticleFragment,
} from 'storefrontapi.generated';

export function applyTrackingParams(
  resource:
    | PredictiveQueryFragment
    | SearchArticleFragment
    | SearchPageFragment
    | SearchProductFragment
    | PredictiveProductFragment
    | PredictiveCollectionFragment
    | PredictiveArticleFragment
    | PredictivePageFragment,
  params?: string,
) {
  if (params) {
    return resource?.trackingParameters
      ? `?${params}&${resource.trackingParameters}`
      : `?${params}`;
  } else {
    return resource?.trackingParameters
      ? `?${resource.trackingParameters}`
      : '';
  }
}
