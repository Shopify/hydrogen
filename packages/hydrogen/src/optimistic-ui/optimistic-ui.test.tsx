import {describe, expect, it} from 'vitest';
import {render} from '@testing-library/react';
import {OptimisticInput} from './optimistic-ui';

function getOptimisticIdentifier(container: HTMLElement) {
  return container
    .querySelector('input[name="optimistic-identifier"]')
    ?.getAttribute('value');
}

function getOptimisticData(container: HTMLElement) {
  return container
    .querySelector('input[name="optimistic-data"]')
    ?.getAttribute('value');
}

describe('<OptimisticInput />', () => {
  it('renders a form with children', () => {
    const {container} = render(
      <form>
        <OptimisticInput id="test" data={{action: 'remove'}} />
      </form>,
    );

    expect(getOptimisticIdentifier(container)).toBe('test');
    expect(getOptimisticData(container)).toBe('{"action":"remove"}');
  });
});
