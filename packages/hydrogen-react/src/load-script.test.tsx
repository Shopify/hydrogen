import {vi, afterEach, describe, expect, it} from 'vitest';
import {renderHook} from '@testing-library/react';
import {useLoadScript} from './load-script.js';

let html: HTMLHtmlElement;
let head: HTMLHeadElement;
let body: HTMLBodyElement;

describe(`useLoadScript`, () => {
  beforeEach(() => {
    html = document.createElement('html');
    head = document.createElement('head');
    body = document.createElement('body');

    vi.spyOn(document.head, 'appendChild').mockImplementation((node: Node) => {
      head.appendChild(node);
      return node;
    });

    vi.spyOn(document.body, 'appendChild').mockImplementation((node: Node) => {
      body.appendChild(node);
      return node;
    });

    html.appendChild(head);
    html.appendChild(body);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    head.innerHTML = '';
    body.innerHTML = '';
    document.querySelectorAll('script').forEach((node) => node.remove());
  });

  it('loads a script', () => {
    renderHook(() => useLoadScript('test.js'));

    const script = html.querySelector('body script');
    expect(script).toContainHTML('src="test.js"');
    expect(script).toContainHTML('type="text/javascript"');
  });

  it('loads a script in head', () => {
    renderHook(() => useLoadScript('test1.js', {in: 'head'}));

    const script = html.querySelector('head script');
    expect(script).toContainHTML('src="test1.js"');
  });

  it('loads a module script', () => {
    renderHook(() => useLoadScript('test2.js', {module: true}));

    const script = html.querySelector('body script');
    expect(script).toContainHTML('src="test2.js"');
    expect(script).toContainHTML('type="module"');
  });

  it('loads a script with additional attributes', () => {
    renderHook(() =>
      useLoadScript('test3.js', {
        attributes: {
          'data-test1': 'test1',
          test2: 'test2',
        },
      }),
    );

    const script = html.querySelector('body script');
    expect(script).toContainHTML('src="test3.js"');
    expect(script).toContainHTML('data-test1="test1"');
    expect(script).toContainHTML('test2="test2"');
  });

  it('does not double create scripts', () => {
    renderHook(() => useLoadScript('test4.js'));
    renderHook(() => useLoadScript('test5.js'));
    renderHook(() => useLoadScript('test4.js'));

    const scripts = html.querySelectorAll('body script');
    expect(scripts.length).toEqual(2);
  });
});
