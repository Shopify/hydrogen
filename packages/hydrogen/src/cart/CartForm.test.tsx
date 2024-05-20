import {describe, expect, expectTypeOf, it, vi} from 'vitest';
import {render} from '@testing-library/react';
import {CartForm, OptimisticCartLine} from './CartForm';
import {CartLineInput} from '@shopify/hydrogen-react/storefront-api-types';

function MockForm({
  children,
  ...restOfProps
}: {
  children: React.ReactNode;
  restOfProps: Record<string, unknown>;
}): JSX.Element {
  return (
    <form data-testid="form" {...restOfProps}>
      {children}
    </form>
  );
}

vi.mock('@remix-run/react', () => ({
  useFetcher: vi.fn().mockImplementation(() => {
    return {
      Form: MockForm,
    };
  }),
}));

function getRenderFormInput(container: HTMLElement) {
  return container
    .querySelector('input[name="cartFormInput"]')
    ?.getAttribute('value');
}

describe('<CartForm />', () => {
  it('renders a form with children', () => {
    const {container} = render(
      <CartForm action={CartForm.ACTIONS.LinesAdd} inputs={{lines: []}}>
        <button>Submit</button>
      </CartForm>,
    );

    expect(getRenderFormInput(container)).toBe(
      '{"action":"LinesAdd","inputs":{"lines":[]}}',
    );
    expect(container.querySelector('button')).toBeTruthy();
  });

  it('renders a form with render prop', () => {
    const {container} = render(
      <CartForm
        action={CartForm.ACTIONS.LinesAdd}
        inputs={{lines: [], test: 'test'}}
      >
        {(fetcher) => <button>Submit</button>}
      </CartForm>,
    );

    expect(getRenderFormInput(container)).toBe(
      '{"action":"LinesAdd","inputs":{"lines":[],"test":"test"}}',
    );
  });

  it('renders a form with route', () => {
    const {container} = render(
      <CartForm
        route="/cart"
        action={CartForm.ACTIONS.LinesAdd}
        inputs={{lines: []}}
      >
        <button>Submit</button>
      </CartForm>,
    );

    // console.log(container.innerHTML)
    expect(container.querySelector('form')?.getAttribute('action')).toBe(
      '/cart',
    );
  });

  it('has static properties', () => {
    expect(CartForm.INPUT_NAME).toBe('cartFormInput');
    expect(CartForm.ACTIONS).toEqual({
      AttributesUpdateInput: 'AttributesUpdateInput',
      BuyerIdentityUpdate: 'BuyerIdentityUpdate',
      Create: 'Create',
      DiscountCodesUpdate: 'DiscountCodesUpdate',
      LinesAdd: 'LinesAdd',
      LinesUpdate: 'LinesUpdate',
      LinesRemove: 'LinesRemove',
      NoteUpdate: 'NoteUpdate',
      SelectedDeliveryOptionsUpdate: 'SelectedDeliveryOptionsUpdate',
      MetafieldsSet: 'MetafieldsSet',
      MetafieldDelete: 'MetafieldDelete',
    });
  });
});

// vitest doesn't have FormData, so we mock it here
function mockFormData(data: Record<string, unknown>) {
  const formatData: any = {
    cartFormInput: JSON.stringify(data),
  };
  return {
    has: (key: string) => !!formatData[key],
    get: (key: string) =>
      Array.isArray(formatData[key]) ? formatData[key][0] : formatData[key],
    getAll: (key: string) => formatData[key],
    append: (key: string, value: any) => {
      if (formatData[key]) {
        if (Array.isArray(formatData[key])) {
          formatData[key].push(value);
        } else {
          formatData[key] = [formatData[key], value];
        }
        return;
      } else {
        formatData[key] = value;
      }
    },
    entries: () => {
      const entries: any[] = [];
      Object.keys(formatData).forEach((key: string) => {
        entries.push([key, formatData[key]]);
      });
      return entries;
    },
  } as unknown as FormData;
}

describe('getFormInput', () => {
  it('returns an object with action and inputs', () => {
    const result = CartForm.getFormInput(
      mockFormData({
        action: 'CustomTest',
        inputs: {
          test: 'test',
        },
      }),
    );

    expect(result).toEqual({
      action: 'CustomTest',
      inputs: {
        test: 'test',
      },
    });
  });

  it('collects other form inputs', () => {
    const formData = mockFormData({
      action: 'CustomTest',
      inputs: {
        test: 'test',
      },
    });
    formData.append('other', 'other');
    const result = CartForm.getFormInput(formData);

    expect(result).toEqual({
      action: 'CustomTest',
      inputs: {
        test: 'test',
        other: 'other',
      },
    });
  });

  it('overrides same key form inputs', () => {
    const formData = mockFormData({
      action: 'CustomTest',
      inputs: {
        test: 'test',
      },
    });
    formData.append('test', 'test2');
    const result = CartForm.getFormInput(formData);

    expect(result).toEqual({
      action: 'CustomTest',
      inputs: {
        test: 'test2',
      },
    });
  });

  it('combines prop inputs with form inputs', () => {
    const formData = mockFormData({
      action: 'NoteUpdate',
    });
    formData.append('note', 'test');
    const result = CartForm.getFormInput(formData);

    expect(result).toEqual({
      action: 'NoteUpdate',
      inputs: {
        note: 'test',
      },
    });
  });

  it('combines same name inputs into an array', () => {
    const formData = mockFormData({
      action: 'NoteUpdate',
    });
    formData.append('note', 'test1');
    formData.append('note', 'test2');
    const result = CartForm.getFormInput(formData);

    expect(result).toEqual({
      action: 'NoteUpdate',
      inputs: {
        note: ['test1', 'test2'],
      },
    });
  });

  it('recognize LinesAdd action with lines inputs with the correct type', () => {
    const formData = mockFormData({
      action: 'LinesAdd',
      inputs: {
        lines: [
          {
            quantity: 1,
            merchandiseId: '1',
          },
        ],
      },
    });

    const result = CartForm.getFormInput(formData);

    expect(result).toEqual({
      action: 'LinesAdd',
      inputs: {
        lines: [
          {
            quantity: 1,
            merchandiseId: '1',
          },
        ],
      },
    });

    if (result.action !== 'LinesAdd') {
      // Just to narrow down the type
      throw new Error('Wrong action');
    }

    expectTypeOf(result.inputs.lines).toEqualTypeOf<OptimisticCartLine[]>;
  });
});
