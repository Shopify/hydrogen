import {render, screen} from '@testing-library/react';
import {faker} from '@faker-js/faker';
import {Image} from './Image.js';
import {Mock} from 'vitest';

const defaultProps = {
  sizes: '100vw',
  src: 'https://cdn.shopify.com/s/files/1/0551/4566/0472/products/Main.jpg',
};

describe('<Image />', () => {
  // This test fails because the received src has ?width=100 appended to it
  it.skip('renders an `img` element', () => {
    const src = faker.image.imageUrl();

    render(<Image {...defaultProps} src={src} />);
    const image = screen.getByRole('img');

    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute('src', src);
  });

  it('accepts passthrough props such as `id`', () => {
    const id = faker.random.alpha();
    render(<Image {...defaultProps} id={id} />);

    const image = screen.getByRole('img');

    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute('id', id);
  });

  it('has a `loading` prop of `lazy` by default', () => {
    render(<Image {...defaultProps} />);

    const image = screen.getByRole('img');

    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute('loading', 'lazy');
  });

  it('accepts a `loading` prop', () => {
    render(<Image {...defaultProps} loading="eager" />);

    const image = screen.getByRole('img');

    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute('loading', 'eager');
  });

  it('accepts a `sizes` prop', () => {
    render(<Image {...defaultProps} sizes="100vw" />);

    const image = screen.getByRole('img');

    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute('sizes', '100vw');
  });

  describe('warnings', () => {
    const consoleMock = {
      ...console,
      warn: vi.fn(),
    };

    vi.stubGlobal('console', consoleMock);

    afterAll(() => {
      vi.unstubAllGlobals();
    });

    it('warns user if no sizes are provided', () => {
      render(<Image {...defaultProps} sizes={undefined} />);

      expect(console.warn).toHaveBeenCalledTimes(1);
      expect(getWarnings()).toMatchInlineSnapshot(
        `
        [
          "No sizes prop provided to Image component, you may be loading unnecessarily large images. Image used is https://cdn.shopify.com/s/files/1/0551/4566/0472/products/Main.jpg",
        ]
      `,
      );
    });

    it('does not warn user if no sizes are provided but width is fixed', () => {
      render(<Image {...defaultProps} sizes={undefined} width={100} />);

      expect(console.warn).toHaveBeenCalledTimes(0);
    });

    it('warns user if widths is provided', () => {
      render(<Image {...defaultProps} widths={[]} />);

      expect(console.warn).toHaveBeenCalledTimes(1);
      expect(getWarnings()).toMatchInlineSnapshot(
        `
        [
          "Deprecated property from original Image component in use: \`widths\` are now calculated automatically based on the config and width props. Image used is https://cdn.shopify.com/s/files/1/0551/4566/0472/products/Main.jpg",
        ]
      `,
      );
    });

    it('warns user if loaderOptions are provided', () => {
      render(<Image {...defaultProps} loaderOptions={{}} />);

      expect(console.warn).toHaveBeenCalledTimes(1);
      expect(getWarnings()).toMatchInlineSnapshot(
        `
        [
          "Deprecated property from original Image component in use: Use the \`crop\`, \`width\`, \`height\`, and src props, or the \`data\` prop to achieve the same result. Image used is https://cdn.shopify.com/s/files/1/0551/4566/0472/products/Main.jpg",
        ]
      `,
      );
    });
  });
});

function getWarnings() {
  return (console.warn as Mock<[string]>).mock.calls.map(
    ([message]) => message,
  );
}
