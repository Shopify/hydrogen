import {useFetchers} from '@remix-run/react';

export function useOptimisticDataFromActions<T>(identifier: string) {
  const fetchers = useFetchers();
  const data: Record<string, unknown> = {};

  for (const fetcher of fetchers) {
    const formData = fetcher.submission?.formData;
    if (formData && formData.get('optimistic-identifier') === identifier) {
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

export function OptimisticInput({
  id,
  data,
}: {
  id: string;
  data: Record<string, unknown>;
}) {
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
