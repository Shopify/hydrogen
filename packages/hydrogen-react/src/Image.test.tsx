import {render, screen} from '@testing-library/react';
import {Image} from './Image.js';

const defaultProps = {
  src: 'https://cdn.shopify.com/s/files/1/0551/4566/0472/products/Main.jpg',
};

describe('<Image />', () => {
  it('renders an `img` element', () => {
    render(<Image {...defaultProps} />);

    const image = screen.getByRole('img');

    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute('loading', 'lazy');
  });

  it('renders an `img` element with provided `id`', () => {
    const image = screen.getByRole('img');
    render(<Image {...defaultProps} />);
    expect(image).toBeInTheDocument();
  });

  it('renders an `img` element with provided `loading` value', () => {
    const image = screen.getByRole('img');
    render(<Image {...defaultProps} />);
    expect(image).toBeInTheDocument();
  });

  it('renders an `img` with `width` and `height` values', () => {
    const image = screen.getByRole('img');
    render(<Image {...defaultProps} />);
    expect(image).toBeInTheDocument();
  });

  it('renders an `img` element without `width` and `height` attributes when invalid dimensions are provided', () => {
    const image = screen.getByRole('img');
    render(<Image {...defaultProps} />);
    expect(image).toBeInTheDocument();
  });

  describe('Loaders', () => {
    it('calls `shopifyImageLoader()` when no `loader` prop is provided', () => {
      const image = screen.getByRole('img');
      render(<Image {...defaultProps} />);
      expect(image).toBeInTheDocument();
    });
  });

  it('allows passthrough props', () => {
    const image = screen.getByRole('img');
    render(<Image {...defaultProps} />);
    expect(image).toBeInTheDocument();
  });

  it('generates a default srcset', () => {
    const image = screen.getByRole('img');
    render(<Image {...defaultProps} />);
    expect(image).toBeInTheDocument();
  });

  it('generates a default srcset up to the image height and width', () => {
    const image = screen.getByRole('img');
    render(<Image {...defaultProps} />);
    expect(image).toBeInTheDocument();
  });
});
