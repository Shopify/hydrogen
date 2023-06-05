import clsx from 'clsx';
import React, {forwardRef} from 'react';

type InputProps = {
  className?: string;
  type?: string;
  variant: 'search' | 'searchDrawer';
  [key: string]: any;
};

export const Input = forwardRef(
  (
    {className = '', type, variant, ...props}: InputProps,
    ref: React.ForwardedRef<HTMLInputElement> | null,
  ) => {
    const variants = {
      search:
        'bg-transparent px-0 py-2 text-heading w-full focus:ring-0 border-x-0 border-t-0 transition border-b-2 border-primary/10 focus:border-primary/90',
      searchDrawer:
        'bg-transparent inline-block text-left lg:text-right border-b transition border-transparent -mb-px border-x-0 border-t-0 appearance-none px-0 py-1 focus:ring-transparent placeholder:opacity-20 placeholder:text-inherit',
    };

    return (
      <input
        ref={ref}
        type={type}
        {...props}
        className={clsx(variants[variant], className)}
      />
    );
  },
);
