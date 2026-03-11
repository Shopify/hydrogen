import clsx from 'clsx';
import type {ComponentPropsWithoutRef} from 'react';

function Grid(props: ComponentPropsWithoutRef<'ul'>) {
  return (
    <ul
      {...props}
      className={clsx('grid grid-flow-row gap-4', props.className)}
    >
      {props.children}
    </ul>
  );
}

function GridItem(props: ComponentPropsWithoutRef<'li'>) {
  return (
    <li
      {...props}
      className={clsx('aspect-square transition-opacity', props.className)}
    >
      {props.children}
    </li>
  );
}

Grid.Item = GridItem;

export default Grid;
