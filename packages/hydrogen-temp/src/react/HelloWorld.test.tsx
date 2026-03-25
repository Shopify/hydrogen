import {describe, it, expect} from 'vitest';
import {renderToString} from 'react-dom/server';
import {HelloWorld} from './HelloWorld';

describe('HelloWorld', () => {
  it('renders with default name', () => {
    const html = renderToString(<HelloWorld />);
    expect(html).toContain('Hello, World!');
  });

  it('renders with custom name', () => {
    const html = renderToString(<HelloWorld name="Hydrogen" />);
    expect(html).toContain('Hello, Hydrogen!');
  });
});
