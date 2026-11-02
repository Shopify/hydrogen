/**
 * Allowlist HTML sanitizer for rich text returned by the Storefront API
 * (`Page.body`, `Article.contentHtml`, `ShopPolicy.body`,
 * `Product.descriptionHtml`).
 *
 * @description That HTML is written by merchants, staff and apps, and the
 * routes render it with `dangerouslySetInnerHTML`. Treat it as untrusted:
 * anything that can run script on the storefront origin (script tags, event
 * handlers, `javascript:` URLs, embedded documents, SVG/MathML, styles) is
 * removed, and ordinary formatting, tables, images and safe links are kept.
 *
 * The input is tokenized and the output is rebuilt from scratch: only
 * allowlisted tags and attributes are written, attribute values are always
 * quoted and escaped, text is escaped, and every element that the output opens
 * is also closed in the output. Where the browser implies an end tag for `li`,
 * `dd`, `dt`, `p` and `table`, the output writes that end tag explicitly.
 * Table parts outside a table are dropped, as the browser drops them.
 *
 * The sanitizer does not reproduce every HTML tree construction rule. Malformed
 * input can still parse into a different structure than the output suggests.
 * That can break the layout, but it cannot run script, because only
 * allowlisted tags and attributes are written.
 *
 * The function has no dependencies and no DOM, so it runs the same in the
 * Oxygen worker, in Node and in the browser.
 */

const ALLOWED_TAGS = new Set([
  'a',
  'abbr',
  'b',
  'blockquote',
  'br',
  'caption',
  'cite',
  'code',
  'col',
  'colgroup',
  'dd',
  'del',
  'details',
  'div',
  'dl',
  'dt',
  'em',
  'figcaption',
  'figure',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'hr',
  'i',
  'img',
  'ins',
  'kbd',
  'li',
  'mark',
  'ol',
  'p',
  'pre',
  'q',
  's',
  'small',
  'span',
  'strong',
  'sub',
  'summary',
  'sup',
  'table',
  'tbody',
  'td',
  'tfoot',
  'th',
  'thead',
  'tr',
  'u',
  'ul',
]);

const VOID_TAGS = new Set(['br', 'col', 'hr', 'img']);

/**
 * Elements removed together with everything inside them. Their content is
 * either script, styles, an embedded document, or markup in a foreign
 * namespace (SVG/MathML) where the HTML parsing rules differ.
 *
 * Void elements such as `embed` and `frame` have no end tag, so they are not
 * listed here. They are not allowlisted either, so only the tag is removed.
 */
const DROP_WITH_CONTENT_TAGS = new Set([
  'applet',
  'audio',
  'frameset',
  'head',
  'iframe',
  'math',
  'noembed',
  'noframes',
  'noscript',
  'object',
  'plaintext',
  'script',
  'select',
  'style',
  'svg',
  'template',
  'textarea',
  'title',
  'video',
  'xmp',
]);

/** Elements whose content the browser does not parse as markup. */
const RAW_TEXT_TAGS = new Set([
  'iframe',
  'noembed',
  'noframes',
  'noscript',
  'script',
  'style',
  'textarea',
  'title',
  'xmp',
]);

/**
 * Allowlisted elements that the HTML spec puts in the "special" category,
 * except `div` and `p`. A start tag for `li`, `dd` or `dt` does not close an
 * open element of the same kind outside one of these elements.
 */
const LIST_ITEM_BOUNDARY_TAGS = new Set([
  'blockquote',
  'caption',
  'colgroup',
  'dd',
  'details',
  'dl',
  'dt',
  'figcaption',
  'figure',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'li',
  'ol',
  'pre',
  'summary',
  'table',
  'tbody',
  'td',
  'tfoot',
  'th',
  'thead',
  'tr',
  'ul',
]);

/** Allowlisted elements that end the button scope of the HTML spec. */
const BUTTON_SCOPE_BOUNDARY_TAGS = new Set(['caption', 'table', 'td', 'th']);

/** Table parts that the browser ignores outside a `table` element. */
const TABLE_PART_TAGS = new Set([
  'caption',
  'col',
  'colgroup',
  'tbody',
  'td',
  'tfoot',
  'th',
  'thead',
  'tr',
]);

/** Allowlisted start tags that close an open `p` element in button scope. */
const CLOSES_P_TAGS = new Set([
  'blockquote',
  'dd',
  'details',
  'div',
  'dl',
  'dt',
  'figcaption',
  'figure',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'hr',
  'li',
  'ol',
  'p',
  'pre',
  'summary',
  'table',
  'ul',
]);

const GLOBAL_ATTRIBUTES = new Set(['class', 'dir', 'lang', 'title']);

const TAG_ATTRIBUTES: Record<string, Set<string>> = {
  a: new Set(['href', 'rel', 'target']),
  col: new Set(['span']),
  colgroup: new Set(['span']),
  details: new Set(['open']),
  img: new Set(['alt', 'height', 'src', 'width']),
  ol: new Set(['reversed', 'start', 'type']),
  td: new Set(['colspan', 'rowspan']),
  th: new Set(['colspan', 'rowspan', 'scope']),
};

const ALLOWED_REL_TOKENS = new Set([
  'nofollow',
  'noopener',
  'noreferrer',
  'sponsored',
  'ugc',
]);

const URL_ATTRIBUTES = new Set(['href', 'src']);
const SAFE_LINK_PROTOCOLS = new Set(['http', 'https', 'mailto', 'tel']);
const SAFE_IMAGE_PROTOCOLS = new Set(['http', 'https']);
const NUMERIC_ATTRIBUTES = new Set([
  'colspan',
  'height',
  'rowspan',
  'span',
  'start',
  'width',
]);

/** Named references decoded before a URL is checked. */
const NAMED_REFERENCES: Record<string, string> = {
  amp: '&',
  apos: "'",
  colon: ':',
  gt: '>',
  lpar: '(',
  lt: '<',
  newline: '\n',
  nbsp: '\u00a0',
  quot: '"',
  rpar: ')',
  sol: '/',
  tab: '\t',
};

const END_TAG_NAME = /[a-zA-Z][^\s/>]*/y;

type Attribute = {name: string; value: string};

export function sanitizeHtml(html: string | null | undefined): string {
  if (!html) return '';

  const input = html.replace(/\0/g, '');
  const length = input.length;
  const openTags: string[] = [];
  // Counts open elements by name, so an end tag with no open element is
  // skipped without a scan of the stack. Without it, input such as
  // `<div>` x N followed by `</p>` x N takes quadratic time.
  const openCounts = new Map<string, number>();
  // For each open element, the stack index of the element that a new `li`,
  // `dd`/`dt`, `table` or `p`-closing start tag implicitly closes, or -1. The
  // value is set when the element opens, so a start tag never scans the stack.
  const listItemTargets: number[] = [];
  const definitionTargets: number[] = [];
  const paragraphTargets: number[] = [];
  const tableTargets: number[] = [];
  let output = '';
  let index = 0;

  const open = (name: string) => {
    const position = openTags.length;
    const inherit = (targets: number[]) => targets[position - 1] ?? -1;
    listItemTargets.push(
      name === 'li'
        ? position
        : LIST_ITEM_BOUNDARY_TAGS.has(name)
          ? -1
          : inherit(listItemTargets),
    );
    definitionTargets.push(
      name === 'dd' || name === 'dt'
        ? position
        : LIST_ITEM_BOUNDARY_TAGS.has(name)
          ? -1
          : inherit(definitionTargets),
    );
    paragraphTargets.push(
      name === 'p'
        ? position
        : BUTTON_SCOPE_BOUNDARY_TAGS.has(name)
          ? -1
          : inherit(paragraphTargets),
    );
    // Outside a cell, a nested `table` start tag closes the open table.
    tableTargets.push(
      name === 'table'
        ? position
        : name === 'td' || name === 'th'
          ? -1
          : inherit(tableTargets),
    );
    openTags.push(name);
    openCounts.set(name, (openCounts.get(name) ?? 0) + 1);
  };

  /** Closes the element at `position` and every element inside it. */
  const closeFrom = (position: number) => {
    if (position < 0) return;
    while (openTags.length > position) {
      const closed = openTags.pop();
      if (closed === undefined) break;
      listItemTargets.pop();
      definitionTargets.pop();
      paragraphTargets.pop();
      tableTargets.pop();
      openCounts.set(closed, (openCounts.get(closed) ?? 1) - 1);
      output += `</${closed}>`;
    }
  };

  const top = (targets: number[]) => targets[targets.length - 1] ?? -1;

  while (index < length) {
    const tagStart = input.indexOf('<', index);

    if (tagStart === -1) {
      output += escapeText(input.slice(index));
      break;
    }

    output += escapeText(input.slice(index, tagStart));
    index = tagStart;

    const next = input.charAt(index + 1);

    // Comments, doctypes, CDATA and processing instructions are dropped.
    if (input.startsWith('<!--', index)) {
      const end = input.indexOf('-->', index + 4);
      index = end === -1 ? length : end + 3;
      continue;
    }
    if (next === '!' || next === '?') {
      const end = input.indexOf('>', index + 2);
      index = end === -1 ? length : end + 1;
      continue;
    }

    // End tag.
    if (next === '/') {
      END_TAG_NAME.lastIndex = index + 2;
      const nameMatch = END_TAG_NAME.exec(input);
      const end = input.indexOf('>', index + 2);
      if (!nameMatch) {
        // `</>` and `</ ...>` are not end tags; the browser drops them.
        index = end === -1 ? length : end + 1;
        continue;
      }
      index = end === -1 ? length : end + 1;
      const name = nameMatch[0].toLowerCase();
      if (!openCounts.get(name)) continue;
      closeFrom(openTags.lastIndexOf(name));
      continue;
    }

    // Anything that is not `<` followed by a letter is text.
    if (!/[a-zA-Z]/.test(next)) {
      output += '&lt;';
      index += 1;
      continue;
    }

    const tag = readStartTag(input, index);
    if (!tag) {
      // Unterminated tag at the end of the input; the browser drops it too.
      break;
    }
    index = tag.end;

    if (DROP_WITH_CONTENT_TAGS.has(tag.name)) {
      // `<svg/>` and `<math/>` are complete elements; everything else is
      // dropped up to its end tag.
      const closedForeignElement =
        tag.selfClosing && (tag.name === 'svg' || tag.name === 'math');
      if (!closedForeignElement) index = skipElement(input, index, tag.name);
      continue;
    }

    if (!ALLOWED_TAGS.has(tag.name)) {
      // Unknown or unsafe wrapper: drop the tag, keep its text content.
      continue;
    }

    if (TABLE_PART_TAGS.has(tag.name) && !openCounts.get('table')) continue;

    // Write the end tags that the browser implies, so the browser does not
    // close an element that the sanitizer still treats as open.
    if (tag.name === 'table') closeFrom(top(tableTargets));
    if (tag.name === 'li') closeFrom(top(listItemTargets));
    if (tag.name === 'dd' || tag.name === 'dt') {
      closeFrom(top(definitionTargets));
    }
    if (CLOSES_P_TAGS.has(tag.name)) closeFrom(top(paragraphTargets));

    output += `<${tag.name}${serializeAttributes(tag.name, tag.attributes)}>`;
    // The browser ignores `/>` on non-void HTML elements, so `<a/>` opens an
    // element that stays open until its end tag.
    if (!VOID_TAGS.has(tag.name)) open(tag.name);
  }

  closeFrom(0);

  return output;
}

function readStartTag(
  input: string,
  start: number,
):
  | {name: string; attributes: Attribute[]; selfClosing: boolean; end: number}
  | undefined {
  const length = input.length;
  let index = start + 1;
  let name = '';

  while (index < length && !/[\s/>]/.test(input.charAt(index))) {
    name += input.charAt(index);
    index += 1;
  }

  const attributes: Attribute[] = [];
  const seen = new Set<string>();
  let selfClosing = false;

  while (index < length) {
    const char = input.charAt(index);

    if (char === '>') {
      return {
        name: name.toLowerCase(),
        attributes,
        selfClosing,
        end: index + 1,
      };
    }

    if (/\s/.test(char)) {
      index += 1;
      continue;
    }

    if (char === '/') {
      selfClosing = input.charAt(index + 1) === '>';
      index += 1;
      continue;
    }

    selfClosing = false;

    // Attribute name. A leading `=` belongs to the name, as in the HTML spec.
    let attributeName = char;
    index += 1;
    while (index < length && !/[\s/>=]/.test(input.charAt(index))) {
      attributeName += input.charAt(index);
      index += 1;
    }

    while (index < length && /\s/.test(input.charAt(index))) index += 1;

    let value = '';
    if (input.charAt(index) === '=') {
      index += 1;
      while (index < length && /\s/.test(input.charAt(index))) index += 1;

      const quote = input.charAt(index);
      if (quote === '"' || quote === "'") {
        const close = input.indexOf(quote, index + 1);
        if (close === -1) return undefined;
        value = input.slice(index + 1, close);
        index = close + 1;
      } else {
        const valueStart = index;
        while (index < length && !/[\s>]/.test(input.charAt(index))) {
          index += 1;
        }
        value = input.slice(valueStart, index);
      }
    }

    const normalizedName = attributeName.toLowerCase();
    if (!seen.has(normalizedName)) {
      seen.add(normalizedName);
      attributes.push({name: normalizedName, value});
    }
  }

  return undefined;
}

/** Returns the index just past the element's end tag, or the input length. */
function skipElement(input: string, start: number, name: string): number {
  if (name === 'plaintext') return input.length;

  // Raw text elements end at the first matching end tag. Other elements can
  // nest, so count same-named start and end tags.
  const pattern = RAW_TEXT_TAGS.has(name)
    ? new RegExp(`<(/)${name}(?=[\\s/>])`, 'gi')
    : new RegExp(`<(/?)${name}(?=[\\s/>])`, 'gi');
  // In SVG and MathML, `/>` closes the element, so a nested `<svg/>` or
  // `<math/>` does not add a level.
  const foreign = name === 'svg' || name === 'math';
  let depth = 1;
  let index = start;
  while (depth > 0) {
    pattern.lastIndex = index;
    const match = pattern.exec(input);
    if (!match) return input.length;
    if (match[1]) {
      const end = input.indexOf('>', match.index);
      if (end === -1) return input.length;
      depth -= 1;
      index = end + 1;
    } else if (foreign) {
      const tag = readStartTag(input, match.index);
      if (!tag) return input.length;
      if (!tag.selfClosing) depth += 1;
      index = tag.end;
    } else {
      const end = input.indexOf('>', match.index);
      if (end === -1) return input.length;
      depth += 1;
      index = end + 1;
    }
  }
  return index;
}

function serializeAttributes(tag: string, attributes: Attribute[]): string {
  const allowed = TAG_ATTRIBUTES[tag];
  let output = '';
  let opensNewWindow = false;
  const relTokens = new Set<string>();

  for (const {name, value} of attributes) {
    if (!GLOBAL_ATTRIBUTES.has(name) && !allowed?.has(name)) continue;
    // `rel` is written below so links can't opt out of `noopener`.
    if (name === 'rel') {
      for (const token of value.toLowerCase().split(/\s+/)) {
        if (ALLOWED_REL_TOKENS.has(token)) relTokens.add(token);
      }
      continue;
    }

    if (URL_ATTRIBUTES.has(name)) {
      const url = sanitizeUrl(
        value,
        tag === 'img' ? SAFE_IMAGE_PROTOCOLS : SAFE_LINK_PROTOCOLS,
      );
      if (url === undefined) continue;
      output += ` ${name}="${escapeAttributeValue(url)}"`;
      continue;
    }

    if (name === 'target') {
      const target = value.trim().toLowerCase();
      if (!['_blank', '_parent', '_self', '_top'].includes(target)) continue;
      opensNewWindow = target === '_blank';
      output += ` target="${target}"`;
      continue;
    }

    if (NUMERIC_ATTRIBUTES.has(name)) {
      const number = value.trim();
      if (!/^\d{1,5}%?$/.test(number)) continue;
      output += ` ${name}="${number}"`;
      continue;
    }

    if (name === 'dir' && !/^(ltr|rtl|auto)$/i.test(value.trim())) continue;
    if (
      name === 'scope' &&
      !/^(row|col|rowgroup|colgroup)$/i.test(value.trim())
    )
      continue;
    if (name === 'type' && !/^[1aAiI]$/.test(value.trim())) continue;

    if (name === 'open' || name === 'reversed') {
      output += ` ${name}`;
      continue;
    }

    // These attributes can't run script, so references are kept as written
    // and only a bare `&`, `<`, `>` or `"` is escaped.
    output += ` ${name}="${escapeText(value).replace(/"/g, '&quot;')}"`;
  }

  if (tag === 'a' && opensNewWindow) {
    relTokens.add('noopener');
    relTokens.add('noreferrer');
  }
  if (relTokens.size) {
    output += ` rel="${[...relTokens].join(' ')}"`;
  }

  return output;
}

/**
 * Returns the URL to write, or `undefined` to drop the attribute. The value is
 * decoded first so `&#106;avascript:` and `java&Tab;script:` are caught, and
 * the decoded value is what gets written back (re-escaped), so the browser
 * sees exactly the URL that was checked.
 */
function sanitizeUrl(
  value: string,
  allowedProtocols: Set<string>,
): string | undefined {
  // The URL parser trims C0 controls and spaces and ignores tabs and newlines.
  // The trailing run is trimmed with a loop: a `+$` regex is quadratic on a
  // long run of spaces that is not at the end of the value.
  const decoded = decodeReferences(value);
  let end = decoded.length;
  while (end > 0 && isTrimmedUrlChar(decoded.charCodeAt(end - 1))) end -= 1;
  const url = decoded
    .slice(0, end)
    .replace(/^[\u0000-\u0020\u007f-\u009f]+/, '')
    .replace(/[\t\n\r]/g, '');

  if (url === '') return undefined;

  const scheme = /^([a-zA-Z][a-zA-Z0-9+.-]*):/.exec(url);
  if (!scheme) {
    // A colon before any `/`, `?` or `#` would make the browser read a scheme.
    const firstColon = url.indexOf(':');
    const firstDelimiter = url.search(/[/?#]/);
    if (
      firstColon !== -1 &&
      (firstDelimiter === -1 || firstColon < firstDelimiter)
    ) {
      return undefined;
    }
    return url;
  }

  return allowedProtocols.has(scheme[1].toLowerCase()) ? url : undefined;
}

function isTrimmedUrlChar(code: number): boolean {
  return code <= 0x20 || (code >= 0x7f && code <= 0x9f);
}

/**
 * Decodes numeric character references and a small set of named ones. Any
 * other `&` survives as a literal character and is escaped on output, so the
 * browser can never decode something this function did not.
 */
function decodeReferences(value: string): string {
  return value.replace(
    /&(?:#(\d+)|#[xX]([0-9a-fA-F]+)|([a-zA-Z][a-zA-Z0-9]*));?/g,
    (match, decimal?: string, hex?: string, named?: string) => {
      if (decimal || hex) {
        const codePoint = parseInt(decimal ?? hex ?? '', decimal ? 10 : 16);
        if (
          !Number.isFinite(codePoint) ||
          codePoint === 0 ||
          codePoint > 0x10ffff ||
          (codePoint >= 0xd800 && codePoint <= 0xdfff)
        ) {
          return '\ufffd';
        }
        return String.fromCodePoint(codePoint);
      }
      if (named && match.endsWith(';')) {
        const decoded = NAMED_REFERENCES[named.toLowerCase()];
        if (decoded !== undefined) return decoded;
      }
      return match;
    },
  );
}

/** Escapes text, leaving well-formed character references intact. */
function escapeText(text: string): string {
  return text
    .replace(/&(?!#\d+;|#[xX][0-9a-fA-F]+;|[a-zA-Z][a-zA-Z0-9]*;)/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeAttributeValue(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
