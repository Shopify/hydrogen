import {describe, expect, it} from 'vitest';

import {sanitizeHtml} from '../ingredients/templates/skeleton/app/lib/sanitizeHtml';

describe('markets recipe — sanitizeHtml', () => {
  describe('keeps ordinary rich text', () => {
    it('returns an empty string for empty input', () => {
      expect(sanitizeHtml('')).toBe('');
      expect(sanitizeHtml(null)).toBe('');
      expect(sanitizeHtml(undefined)).toBe('');
    });

    it('keeps formatting, lists and headings', () => {
      const html =
        '<h2>Returns</h2><p>Items can be returned within <strong>30 days</strong>.</p>' +
        '<ul><li><em>Unworn</em></li><li>With tags<br></li></ul>';
      expect(sanitizeHtml(html)).toBe(
        '<h2>Returns</h2><p>Items can be returned within <strong>30 days</strong>.</p>' +
          '<ul><li><em>Unworn</em></li><li>With tags<br></li></ul>',
      );
    });

    it('keeps tables and their span attributes', () => {
      expect(
        sanitizeHtml(
          '<table><tbody><tr><th scope="col">Size</th><td colspan="2">M</td></tr></tbody></table>',
        ),
      ).toBe(
        '<table><tbody><tr><th scope="col">Size</th><td colspan="2">M</td></tr></tbody></table>',
      );
    });

    it('keeps safe links and images', () => {
      expect(
        sanitizeHtml(
          '<a href="https://example.com/a?b=1&amp;c=2" title="Shop">Shop</a>' +
            '<a href="/pages/contact">Contact</a><a href="mailto:help@example.com">Mail</a>' +
            '<img src="https://cdn.shopify.com/s/files/hat.jpg" alt="Hat" width="600">',
        ),
      ).toBe(
        '<a href="https://example.com/a?b=1&amp;c=2" title="Shop">Shop</a>' +
          '<a href="/pages/contact">Contact</a><a href="mailto:help@example.com">Mail</a>' +
          '<img src="https://cdn.shopify.com/s/files/hat.jpg" alt="Hat" width="600">',
      );
    });

    it('preserves character references in text', () => {
      expect(
        sanitizeHtml('<p>Caf&eacute; &amp; Bar&nbsp;&#8212; 5 &lt; 6</p>'),
      ).toBe('<p>Caf&eacute; &amp; Bar&nbsp;&#8212; 5 &lt; 6</p>');
    });

    it('escapes stray markup characters in text', () => {
      expect(sanitizeHtml('<p>a < b && c > d</p>')).toBe(
        '<p>a &lt; b &amp;&amp; c &gt; d</p>',
      );
    });

    it('adds noopener to links that open a new window', () => {
      expect(
        sanitizeHtml(
          '<a href="https://example.com" target="_blank" rel="opener">x</a>',
        ),
      ).toBe(
        '<a href="https://example.com" target="_blank" rel="noopener noreferrer">x</a>',
      );
    });

    it('unwraps unknown tags but keeps their text', () => {
      expect(
        sanitizeHtml('<section><font color="red">Sale</font> today</section>'),
      ).toBe('Sale today');
    });

    it('keeps global attributes and drops unknown ones', () => {
      expect(
        sanitizeHtml(
          '<p class="note" lang="fr" dir="rtl" data-x="1" id="intro">Bonjour</p>',
        ),
      ).toBe('<p class="note" lang="fr" dir="rtl">Bonjour</p>');
    });

    it('keeps details and summary', () => {
      expect(
        sanitizeHtml(
          '<details open><summary>FAQ</summary><p>Yes</p></details>',
        ),
      ).toBe('<details open><summary>FAQ</summary><p>Yes</p></details>');
    });

    it('normalizes self-closing void tags', () => {
      expect(sanitizeHtml('<p>a<br/>b<hr /></p>')).toBe('<p>a<br>b<hr></p>');
    });

    it('quotes unquoted attribute values', () => {
      expect(sanitizeHtml('<td colspan=2 class=size>M</td>')).toBe(
        '<td colspan="2" class="size">M</td>',
      );
    });
  });

  describe('removes active content', () => {
    it('removes the script payload from the findings', () => {
      expect(
        sanitizeHtml(
          '<p>Welcome</p><script src="https://cdn.shopify.com/s/files/1/0000/0000/files/storefront-payload.js"></script><p>Shop now</p>',
        ),
      ).toBe('<p>Welcome</p><p>Shop now</p>');
    });

    it('removes inline scripts and their content', () => {
      expect(sanitizeHtml('<p>a</p><script>alert(1)</script><p>b</p>')).toBe(
        '<p>a</p><p>b</p>',
      );
    });

    it('removes scripts with mixed-case tag names', () => {
      expect(sanitizeHtml('<ScRiPt>alert(1)</sCrIpT>ok')).toBe('ok');
    });

    it('treats script content as raw text', () => {
      expect(sanitizeHtml('<script>document.write("<p>")</script>after')).toBe(
        'after',
      );
    });

    it('removes everything after an unclosed script tag', () => {
      expect(sanitizeHtml('<p>a</p><script>alert(1)')).toBe('<p>a</p>');
    });

    it('removes event handler attributes', () => {
      expect(
        sanitizeHtml(
          '<img src="https://cdn.shopify.com/x.png" onerror="alert(1)"><p onclick="alert(1)" ONMOUSEOVER="alert(1)">x</p>',
        ),
      ).toBe('<img src="https://cdn.shopify.com/x.png"><p>x</p>');
    });

    it('removes event handlers that follow a slash', () => {
      expect(
        sanitizeHtml('<img/src="https://a.test/x.png"/onerror=alert(1)>'),
      ).toBe('<img src="https://a.test/x.png">');
    });

    it('removes the style attribute', () => {
      expect(
        sanitizeHtml('<p style="background:url(javascript:alert(1))">x</p>'),
      ).toBe('<p>x</p>');
    });

    it('removes style elements', () => {
      expect(sanitizeHtml('<style>body{display:none}</style><p>x</p>')).toBe(
        '<p>x</p>',
      );
    });

    it('removes embeds but keeps the content after them', () => {
      expect(sanitizeHtml('<embed src="x.swf"><p>ok</p>')).toBe('<p>ok</p>');
    });

    it('removes iframes, objects and embeds', () => {
      expect(
        sanitizeHtml(
          '<iframe src="https://evil.test"></iframe><object data="x.swf"><param name="a"></object><embed src="x.swf">ok',
        ),
      ).toBe('ok');
    });

    it('removes iframe srcdoc payloads', () => {
      expect(
        sanitizeHtml(
          '<iframe srcdoc="&lt;script&gt;alert(1)&lt;/script&gt;"></iframe>ok',
        ),
      ).toBe('ok');
    });

    it('removes SVG and its content', () => {
      expect(
        sanitizeHtml(
          '<svg><script>alert(1)</script><a href="javascript:alert(1)">x</a></svg>ok',
        ),
      ).toBe('ok');
    });

    it('removes nested SVG elements', () => {
      expect(sanitizeHtml('<svg><svg onload="alert(1)"></svg>x</svg>ok')).toBe(
        'ok',
      );
    });

    it('removes a self-closing SVG element', () => {
      expect(sanitizeHtml('<svg/><p>ok</p>')).toBe('<p>ok</p>');
    });

    it('treats <svg/onload> as an open SVG element', () => {
      expect(sanitizeHtml('<svg/onload=alert(1)>ok')).toBe('');
    });

    it('removes MathML and its content', () => {
      expect(
        sanitizeHtml(
          '<math><mtext><table><mglyph><style><img src=x onerror=alert(1)></style></mglyph></table></mtext></math>ok',
        ),
      ).toBe('ok');
    });

    it('removes noscript content that can mutate into markup', () => {
      expect(
        sanitizeHtml(
          '<noscript><p title="</noscript><img src=x onerror=alert(1)>"></noscript>ok',
        ),
      ).toBe('<img src="x">"&gt;ok');
    });

    it('removes template elements', () => {
      expect(
        sanitizeHtml('<template><img src=x onerror=alert(1)></template>ok'),
      ).toBe('ok');
    });

    it('removes form controls', () => {
      expect(
        sanitizeHtml(
          '<form action="https://evil.test"><input name="card"><button formaction="javascript:alert(1)">Pay</button></form>',
        ),
      ).toBe('Pay');
    });

    it('removes comments, doctypes and CDATA', () => {
      expect(
        sanitizeHtml(
          '<!DOCTYPE html><!-- <script>alert(1)</script> --><![CDATA[x]]><?xml x?><p>ok</p>',
        ),
      ).toBe('<p>ok</p>');
    });

    it('removes an unterminated comment and the rest of the input', () => {
      expect(sanitizeHtml('<p>a</p><!-- <img src=x onerror=alert(1)>')).toBe(
        '<p>a</p>',
      );
    });

    it('removes null characters', () => {
      expect(sanitizeHtml('<scr\0ipt>alert(1)</script>ok')).toBe('ok');
    });
  });

  describe('checks URLs', () => {
    it('removes javascript: links', () => {
      expect(sanitizeHtml('<a href="javascript:alert(1)">x</a>')).toBe(
        '<a>x</a>',
      );
    });

    it('removes javascript: links with mixed case and whitespace', () => {
      expect(sanitizeHtml('<a href="  JaVaScRiPt:alert(1)">x</a>')).toBe(
        '<a>x</a>',
      );
    });

    it('removes javascript: links with decimal references', () => {
      expect(sanitizeHtml('<a href="&#106;avascript:alert(1)">x</a>')).toBe(
        '<a>x</a>',
      );
    });

    it('removes javascript: links with hex references and no semicolons', () => {
      expect(sanitizeHtml('<a href="&#x6A&#x61vascript:alert(1)">x</a>')).toBe(
        '<a>x</a>',
      );
    });

    it('removes javascript: links with a tab entity', () => {
      expect(sanitizeHtml('<a href="java&Tab;script:alert(1)">x</a>')).toBe(
        '<a>x</a>',
      );
    });

    it('removes javascript: links with a raw newline', () => {
      expect(sanitizeHtml('<a href="java\nscript:alert(1)">x</a>')).toBe(
        '<a>x</a>',
      );
    });

    it('removes javascript: links with an encoded colon', () => {
      expect(sanitizeHtml('<a href="javascript&colon;alert(1)">x</a>')).toBe(
        '<a>x</a>',
      );
    });

    it('removes data: and vbscript: links', () => {
      expect(
        sanitizeHtml(
          '<a href="data:text/html,<script>alert(1)</script>">x</a><a href="vbscript:msgbox(1)">y</a>',
        ),
      ).toBe('<a>x</a><a>y</a>');
    });

    it('removes data: image sources', () => {
      expect(
        sanitizeHtml(
          '<img src="data:image/svg+xml,<svg onload=alert(1)>" alt="x">',
        ),
      ).toBe('<img alt="x">');
    });

    it('removes mailto: and tel: image sources', () => {
      expect(sanitizeHtml('<img src="mailto:a@b.test">')).toBe('<img>');
    });

    it('keeps tel: links', () => {
      expect(sanitizeHtml('<a href="tel:+15555550100">Call</a>')).toBe(
        '<a href="tel:+15555550100">Call</a>',
      );
    });

    it('keeps relative URLs with a colon after the path', () => {
      expect(sanitizeHtml('<a href="/search?q=a:b">x</a>')).toBe(
        '<a href="/search?q=a:b">x</a>',
      );
    });

    it('removes relative-looking URLs with an unknown scheme', () => {
      expect(sanitizeHtml('<a href="1javascript:alert(1)">x</a>')).toBe(
        '<a>x</a>',
      );
    });

    it('removes empty URLs', () => {
      expect(sanitizeHtml('<a href="   ">x</a>')).toBe('<a>x</a>');
    });

    it('drops targets that are not a known keyword', () => {
      expect(sanitizeHtml('<a href="/x" target="evil">x</a>')).toBe(
        '<a href="/x">x</a>',
      );
    });
  });

  describe('escapes attribute values', () => {
    it('escapes quotes and angle brackets', () => {
      expect(
        sanitizeHtml(`<p title='a"><script>alert(1)</script>'>x</p>`),
      ).toBe(
        '<p title="a&quot;&gt;&lt;script&gt;alert(1)&lt;/script&gt;">x</p>',
      );
    });

    it('removes non-numeric values from numeric attributes', () => {
      expect(sanitizeHtml('<td colspan="2 onclick=alert(1)">x</td>')).toBe(
        '<td>x</td>',
      );
    });

    it('keeps only the first of duplicate attributes', () => {
      expect(
        sanitizeHtml('<a href="/safe" href="javascript:alert(1)">x</a>'),
      ).toBe('<a href="/safe">x</a>');
    });

    it('drops a tag with an unterminated quoted attribute', () => {
      expect(sanitizeHtml('<p>a</p><img src="x onerror=alert(1)>')).toBe(
        '<p>a</p>',
      );
    });
  });

  describe('keeps the markup balanced', () => {
    it('closes elements left open at the end', () => {
      expect(sanitizeHtml('<div><p><strong>x')).toBe(
        '<div><p><strong>x</strong></p></div>',
      );
    });

    it('drops end tags that close elements outside the fragment', () => {
      expect(sanitizeHtml('x</div></main><p>y</p>')).toBe('x<p>y</p>');
    });

    it('closes inner elements when an outer element ends', () => {
      expect(sanitizeHtml('<div><em>x</div>y')).toBe('<div><em>x</em></div>y');
    });

    it('escapes a stray less-than sign', () => {
      expect(sanitizeHtml('1 <2 and </ x>')).toBe('1 &lt;2 and ');
    });

    it('handles large input in linear time', () => {
      const html =
        '<p><a href="/x">x</a></p>'.repeat(20000) + '<'.repeat(20000);
      const start = Date.now();
      const output = sanitizeHtml(html);
      expect(Date.now() - start).toBeLessThan(2000);
      expect(output.startsWith('<p><a href="/x">x</a></p>')).toBe(true);
    });

    // The limit is high because CI runs many test suites in parallel. The
    // linear version takes about 0.1 s on a laptop. A stack scan for each end
    // tag takes about 60 s, so the test still catches that regression.
    it(
      'handles many unmatched end tags in linear time',
      {timeout: 120000},
      () => {
        const count = 200000;
        const html = '<div>'.repeat(count) + '</p>'.repeat(count);
        const start = Date.now();
        const output = sanitizeHtml(html);
        expect(Date.now() - start).toBeLessThan(10000);
        expect(output).toBe('<div>'.repeat(count) + '</div>'.repeat(count));
      },
    );

    it('closes the right elements after unmatched end tags', () => {
      expect(sanitizeHtml('<div><em>a</p></span>b</div>c</em>d')).toBe(
        '<div><em>ab</em></div>cd',
      );
    });

    it('tracks nested elements with the same name', () => {
      expect(sanitizeHtml('<em><em>a</em>b</em>c</em>d')).toBe(
        '<em><em>a</em>b</em>cd',
      );
    });
  });
});
