import {useFetchers} from 'react-router';

/**
 * Gets the latest optimistic data with matching optimistic id from actions. Use `OptimisticInput` to add optimistic data to a form action.
 * @publicDocs
 */
export function useOptimisticData<T>(identifier: string) {
  const fetchers = useFetchers();
  const data: Record<string, unknown> = {};

  for (const {formData} of fetchers) {
    if (formData?.get('optimistic-identifier') === identifier) {
      try {
        if (formData.has('optimistic-data')) {
          const dataInForm: unknown = JSON.parse(
            String(formData.get('optimistic-data')),
          );
          Object.assign(data, dataInForm);
        }
      } catch {
        // do nothing
      }
    }
  }
  return data as T;
}

/** @publicDocs */
export type OptimisticInputProps = {
  /**
   * A unique identifier for the optimistic input. Use the same identifier in `useOptimisticData`
   * to retrieve the optimistic data from actions.
   */
  id: string;
  /**
   * The data to be stored in the optimistic input. Use for creating an optimistic successful state
   * of this form action.
   */
  data: Record<string, unknown>;
};

/**
 * Creates a form input for optimistic UI updates. Use `useOptimisticData` to update the UI with the latest optimistic data from actions.
 * @publicDocs
 */
export function OptimisticInput({id, data}: OptimisticInputProps) {
  return (
    <>
      <input type="hidden" name="optimistic-identifier" value={id} />
      <input
        type="hidden"
        name="optimistic-data"
        value={JSON.stringify(data)}
      />
    </>
  );
}
