import {Form} from '@remix-run/react';

import {Input} from '~/components';

export function SearchForm({searchTerm}: {searchTerm: string}) {
  return (
    <Form method="get" className="relative flex w-full text-heading">
      <Input
        defaultValue={searchTerm}
        name="q"
        placeholder="Search…"
        type="search"
        variant="search"
      />
      <button className="absolute right-0 py-2" type="submit">
        Go
      </button>
    </Form>
  );
}
