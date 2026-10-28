import {describe, expect, it} from 'vitest';
import {isSafeRichTextUrl} from './is-safe-rich-text-url.js';

describe('isSafeRichTextUrl', () => {
  it.each([
    '/products/foo',
    'products/foo',
    '../products/foo',
    '?page=2',
    '#details',
    '',
    '//shopify.com/products',
    'https://shopify.com',
    'HTTP://shopify.com',
    'mailto:help@example.com',
    'tel:+15555550123',
    'sms:+15555550123',
  ])('accepts %j', (url) => {
    expect(isSafeRichTextUrl(url)).toBe(true);
  });

  it.each([
    'javascript:alert(1)',
    'JaVaScRiPt:alert(1)',
    ' \t\r\njavascript:alert(1)',
    '\u0000javascript:alert(1)',
    'java\tscript:alert(1)',
    'java\nscript:alert(1)',
    'java\rscript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'vbscript:msgbox(1)',
    'file:///etc/passwd',
    'ftp://example.com',
    'blob:https://example.com/id',
    'https://[',
  ])('rejects %j', (url) => {
    expect(isSafeRichTextUrl(url)).toBe(false);
  });

  it('rejects non-string runtime input', () => {
    expect(isSafeRichTextUrl(null as unknown as string)).toBe(false);
  });
});
