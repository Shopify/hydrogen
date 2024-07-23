import {Form, type FormProps} from '@remix-run/react';
import {useRef, useEffect} from 'react';

type ChildrenFunction = (args: {
  inputRef: React.RefObject<HTMLInputElement>;
  term: string;
}) => React.ReactNode;

type SearchFormProps = Omit<FormProps, 'children'> & {
  children: ChildrenFunction;
  term: string;
};

export function SearchForm({children, term, ...props}: SearchFormProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  useFocusOnCmdK({inputRef});

  if (typeof children !== 'function') {
    return null;
  }

  return (
    <Form method="get" {...props}>
      {children({inputRef, term})}
    </Form>
  );
}

function useFocusOnCmdK({
  inputRef,
}: {
  inputRef: React.RefObject<HTMLInputElement>;
}) {
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
}
