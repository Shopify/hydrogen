import {Mock, vi, describe, expect, it} from 'vitest';
import {render, screen} from '@testing-library/react';
import {faker} from '@faker-js/faker';
import {Image} from './Image.js';

const defaultProps = {
  sizes: '100vw',
  src: 'https://cdn.shopify.com/s/files/1/0551/4566/0472/products/Main.jpg',
};

describe('<Image />', () => {
  // This test fails because the received src has ?width=100 appended to it
  it.skip('renders an `img` element', () => {
    const src = faker.image.imageUrl();

    render(<Image {...defaultProps} src={src} />);

    expect(screen.getByRole('img')).toHaveAttribute('src', src);
  });

  it('accepts passthrough props such as `id`', () => {
    const id = faker.random.alpha();

    render(<Image {...defaultProps} id={id} />);

    expect(screen.getByRole('img')).toHaveAttribute('id', id);
  });

  it('sets the `alt` prop on the img tag', () => {
    const alt = faker.random.alpha();

    render(<Image {...defaultProps} alt={alt} />);

    expect(screen.getByRole('img')).toHaveAttribute('alt', alt);
  });

  it('has a `loading` prop of `lazy` by default', () => {
    render(<Image {...defaultProps} />);

    expect(screen.getByRole('img')).toHaveAttribute('loading', 'lazy');
  });

  it('accepts a `loading` prop', () => {
    render(<Image {...defaultProps} loading="eager" />);

    expect(screen.getByRole('img')).toHaveAttribute('loading', 'eager');
  });

  it('accepts a `sizes` prop', () => {
    render(<Image {...defaultProps} sizes="100vw" />);

    expect(screen.getByRole('img')).toHaveAttribute('sizes', '100vw');
  });

  describe('loader', () => {
    it('calls the loader with the src, width, height and crop props', () => {
      const loader = vi.fn();
      const src = faker.image.imageUrl();
      const width = 600;
      const height = 400;
      const crop = 'center';

      render(
        <Image
          {...defaultProps}
          src={src}
          width={width}
          crop={crop}
          height={height}
          loader={loader}
        />,
      );

      expect(loader).toHaveBeenCalledWith({
        src,
        width,
        height,
        crop,
      });
    });
  });

  describe('srcSet', () => {
    it('renders a `srcSet` attribute when the `widths` prop is provided', () => {
      const widths = [100, 200, 300];

      render(<Image {...defaultProps} widths={widths} />);
      const img = screen.getByRole('img');

      expect(img).toHaveAttribute('srcSet');
      expect(img.getAttribute('srcSet')).toMatchInlineSnapshot(
        '"https://cdn.shopify.com/s/files/1/0551/4566/0472/products/Main.jpg?width=200&crop=center 200w, https://cdn.shopify.com/s/files/1/0551/4566/0472/products/Main.jpg?width=400&crop=center 400w, https://cdn.shopify.com/s/files/1/0551/4566/0472/products/Main.jpg?width=600&crop=center 600w, https://cdn.shopify.com/s/files/1/0551/4566/0472/products/Main.jpg?width=800&crop=center 800w, https://cdn.shopify.com/s/files/1/0551/4566/0472/products/Main.jpg?width=1000&crop=center 1000w, https://cdn.shopify.com/s/files/1/0551/4566/0472/products/Main.jpg?width=1200&crop=center 1200w, https://cdn.shopify.com/s/files/1/0551/4566/0472/products/Main.jpg?width=1400&crop=center 1400w, https://cdn.shopify.com/s/files/1/0551/4566/0472/products/Main.jpg?width=1600&crop=center 1600w, https://cdn.shopify.com/s/files/1/0551/4566/0472/products/Main.jpg?width=1800&crop=center 1800w, https://cdn.shopify.com/s/files/1/0551/4566/0472/products/Main.jpg?width=2000&crop=center 2000w, https://cdn.shopify.com/s/files/1/0551/4566/0472/products/Main.jpg?width=2200&crop=center 2200w, https://cdn.shopify.com/s/files/1/0551/4566/0472/products/Main.jpg?width=2400&crop=center 2400w, https://cdn.shopify.com/s/files/1/0551/4566/0472/products/Main.jpg?width=2600&crop=center 2600w, https://cdn.shopify.com/s/files/1/0551/4566/0472/products/Main.jpg?width=2800&crop=center 2800w, https://cdn.shopify.com/s/files/1/0551/4566/0472/products/Main.jpg?width=3000&crop=center 3000w"',
      );
    });
  });

  describe('aspect-ratio', () => {
    // Assertion support is limited for aspectRatio
    // https://github.com/testing-library/jest-dom/issues/452
    // expect(image).toHaveStyle('aspect-ratio: 1 / 1');

    it('sets the aspect-ratio on the style prop when set explicitly', () => {
      const aspectRatio = '4/3';

      render(
        <Image {...defaultProps} sizes="100vw" aspectRatio={aspectRatio} />,
      );

      expect(screen.getByRole('img').style.aspectRatio).toBe(aspectRatio);
    });

    it('infers the aspect-ratio from the storefront data', () => {
      const data = {height: 300, width: 400};

      render(<Image {...defaultProps} sizes="100vw" data={data} />);

      expect(screen.getByRole('img').style.aspectRatio).toBe('400/300');
    });

    it('infers the aspect-ratio from the storefront data for fixed-width images when no height prop is provided', () => {
      const data = {height: 300, width: 400};

      render(<Image {...defaultProps} sizes="100vw" data={data} width={600} />);

      expect(screen.getByRole('img').style.aspectRatio).toBe('400/300');
    });

    it('infers the aspect-ratio from the storefront data for fixed-width images the height and width are different units', () => {
      const data = {height: 300, width: 400};

      render(
        <Image
          {...defaultProps}
          sizes="100vw"
          data={data}
          height={400}
          width="100%"
        />,
      );

      expect(screen.getByRole('img').style.aspectRatio).toBe('400/300');
    });

    it('infers the aspect-ratio from the height and width props for fixed-width images', () => {
      const data = {height: 300, width: 400};

      render(
        <Image
          {...defaultProps}
          sizes="100vw"
          data={data}
          width={600}
          height={400}
        />,
      );

      expect(screen.getByRole('img').style.aspectRatio).toBe('600/400');
    });
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

    it('warns user if no src is provided', () => {
      render(<Image {...defaultProps} src={undefined} />);

      expect(console.warn).toHaveBeenCalledTimes(1);
      expect(getWarnings()).toMatchInlineSnapshot(
        `
          [
            "No src or data.url provided to Image component.",
          ]
        `,
      );
    });

    it('warns user if no sizes are provided', () => {
      render(<Image {...defaultProps} width="100%" sizes={undefined} />);

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

function getWarnings(): string[] {
  return (console.warn as Mock<[string]>).mock.calls.map(
    ([message]) => message,
  );
}
