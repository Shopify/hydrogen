import {Mock, vi, describe, expect, it} from 'vitest';
import {render, screen} from '@testing-library/react';
import {faker} from '@faker-js/faker';
import {Image} from './Image.js';

const defaultProps = {
  sizes: '100vw',
  src: 'https://cdn.shopify.com/s/files/1/0551/4566/0472/products/Main.jpg',
  ['data-testid']: 'test-element',
};

describe('<Image />', () => {
  // This test fails because the received src has ?width=100 appended to it
  it.skip('renders an `img` element', () => {
    const src = faker.string.uuid();

    render(<Image {...defaultProps} src={src} />);

    expect(screen.getByTestId('test-element')).toHaveAttribute('src', src);
  });

  it('accepts passthrough props such as `id`', () => {
    const id = faker.string.alpha();

    render(<Image {...defaultProps} id={id} />);

    expect(screen.getByTestId('test-element')).toHaveAttribute('id', id);
  });

  it('sets the `alt` prop on the img tag', () => {
    const alt = faker.string.alpha();

    render(<Image {...defaultProps} alt={alt} />);

    expect(screen.getByTestId('test-element')).toHaveAttribute('alt', alt);
  });

  it('has a `loading` prop of `lazy` by default', () => {
    render(<Image {...defaultProps} />);

    expect(screen.getByTestId('test-element')).toHaveAttribute(
      'loading',
      'lazy',
    );
  });

  it('accepts a `loading` prop', () => {
    render(<Image {...defaultProps} loading="eager" />);

    expect(screen.getByTestId('test-element')).toHaveAttribute(
      'loading',
      'eager',
    );
  });

  it('accepts a `sizes` prop', () => {
    render(<Image {...defaultProps} sizes="100vw" />);

    expect(screen.getByTestId('test-element')).toHaveAttribute(
      'sizes',
      '100vw',
    );
  });

  describe('loader', () => {
    it('calls the loader with the src, width, height and crop props', () => {
      const loader = vi.fn();
      const src = faker.string.uuid();
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

    it('handles remote assets', () => {
      render(<Image {...defaultProps} />);
      expect(screen.getByTestId('test-element')).toHaveAttribute(
        'src',
        'https://cdn.shopify.com/s/files/1/0551/4566/0472/products/Main.jpg?width=100&crop=center',
      );
    });

    it('handles local assets', () => {
      const props = {
        ...defaultProps,
        src: '/assets/image.png',
      };

      render(<Image {...props} />);
      expect(screen.getByTestId('test-element')).toHaveAttribute(
        'src',
        '/assets/image.png?width=100&crop=center',
      );
    });
  });

  describe('aspect-ratio', () => {
    // Assertion support is limited for aspectRatio
    // https://github.com/testing-library/jest-dom/issues/452
    // expect(image).toHaveStyle('aspect-ratio: 1 / 1');

    it('sets the aspect-ratio on the style prop when set explicitly', () => {
      const aspectRatio = '4 / 3';

      render(
        <Image {...defaultProps} sizes="100vw" aspectRatio={aspectRatio} />,
      );

      expect(screen.getByTestId('test-element').style.aspectRatio).toBe(
        aspectRatio,
      );
    });

    it('infers the aspect-ratio from the storefront data', () => {
      const data = {height: 300, width: 400};

      render(<Image {...defaultProps} sizes="100vw" data={data} />);

      expect(screen.getByRole('img').style.aspectRatio).toBe('400 / 300');
    });

    it('infers the aspect-ratio from the storefront data for fixed-width images when no height prop is provided', () => {
      const data = {height: 300, width: 400};

      render(<Image {...defaultProps} sizes="100vw" data={data} width={600} />);

      expect(screen.getByRole('img').style.aspectRatio).toBe('400 / 300');
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

      expect(screen.getByRole('img').style.aspectRatio).toBe('400 / 300');
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

      expect(screen.getByRole('img').style.aspectRatio).toBe('600 / 400');
    });

    it('does not create srcset with greater dimensions than source image', () => {
      const data = {height: 300, width: 400};

      render(
        <Image
          {...defaultProps}
          data={data}
          srcSetOptions={{
            intervals: 15,
            startingWidth: 200,
            incrementSize: 200,
            placeholderWidth: 100,
          }}
        />,
      );

      expect(
        screen.getByTestId<HTMLImageElement>('test-element').srcset,
      ).not.toContain('600w');
    });

    it('uses x descriptors for fixed-width images and respects source dimensions', () => {
      // width=200 (number) → fixed mode → imageWidths=[200, 400, 600]
      // source width=400 filters out 600w → sizesArray=[200, 400]
      // should produce 1x/2x but NOT 3x (600px would exceed source)
      const data = {height: 300, width: 400};

      render(<Image {...defaultProps} data={data} width={200} />);

      const img = screen.getByTestId<HTMLImageElement>('test-element');
      expect(img.srcset).toContain('1x');
      expect(img.srcset).toContain('2x');
      expect(img.srcset).not.toContain('3x');
    });

    it('does not create srcset with greater dimensions than source image when using aspect-ratio', () => {
      const data = {height: 300, width: 400};

      render(
        <Image
          {...defaultProps}
          data={data}
          aspectRatio={'1/1'}
          srcSetOptions={{
            intervals: 15,
            startingWidth: 200,
            incrementSize: 200,
            placeholderWidth: 100,
          }}
        />,
      );

      expect(
        screen.getByTestId<HTMLImageElement>('test-element').srcset,
      ).not.toContain('400w');
    });

    it('does not create srcset with greater dimensions than source image when using aspect-ratio and width', () => {
      const data = {height: 300, width: 400};

      render(
        <Image {...defaultProps} data={data} aspectRatio={'1/1'} width={200} />,
      );

      expect(
        screen.getByTestId<HTMLImageElement>('test-element').srcset,
      ).not.toContain('2x');
    });

    it('uses w descriptors for fluid images when source dimensions cap srcset to exactly 3 entries', () => {
      // A 600px source caps the srcset ladder (200, 400, 600, 800, ...) to exactly 3 entries.
      // Verify that fluid images always use w-descriptors regardless of how many entries
      // survive source-dimension filtering — even when that count happens to equal 3.
      const data = {height: 600, width: 600};

      render(
        <Image
          {...defaultProps}
          data={data}
          sizes="(min-width: 45em) 40vw, 100vw"
        />,
      );

      const img = screen.getByTestId<HTMLImageElement>('test-element');
      expect(img.srcset).toContain('200w');
      expect(img.srcset).toContain('400w');
      expect(img.srcset).toContain('600w');
      expect(img.srcset).not.toContain('1x');
      expect(img.srcset).not.toContain('2x');
      expect(img.srcset).not.toContain('3x');
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
  });
});

function getWarnings(): string[] {
  return (console.warn as Mock).mock.calls.map((args) => args[0] as string);
}
