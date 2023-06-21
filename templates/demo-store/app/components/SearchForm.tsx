import {Form} from '@remix-run/react';
import {useRef, useEffect} from 'react';

export function SearchForm({searchTerm}: {searchTerm: string}) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  // focus the input when cmd+k is pressed
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'k' && event.metaKey) {
        event.preventDefault();
        inputRef.current?.focus();
      }

      if (event.key === 'Escape') {
        inputRef.current?.blur();
      }
    }

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <Form method="get" className="relative flex w-full text-heading">
      <input
        defaultValue={searchTerm}
        name="q"
        placeholder="Search…"
        ref={inputRef}
        type="search"
        className="bg-transparent pl-0 pr-14 py-2 text-heading w-full focus:ring-0
          border-x-0 border-t-0 transition border-b-2 border-primary/10
          focus:border-primary/90 truncate text-ellipsis
        "
      />
      <button className="absolute right-0 py-2" type="submit">
        Go
      </button>
    </Form>
  );
}
