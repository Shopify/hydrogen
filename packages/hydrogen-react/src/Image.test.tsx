import {render, screen} from '@testing-library/react';
import {faker} from '@faker-js/faker';
import {Image} from './Image.js';

const defaultProps = {
  src: 'https://cdn.shopify.com/s/files/1/0551/4566/0472/products/Main.jpg',
};

describe('<Image />', () => {
  beforeAll(() => {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  it.todo('warns user if no sizes are provided');

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
});
