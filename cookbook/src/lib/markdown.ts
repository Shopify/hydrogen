import {assertNever} from './util';
import fs from 'fs';
import YAML from 'yaml';
import {RenderFormat} from './render';
export type MDNote = {
  type: 'NOTE';
  text: string;
};

export function mdNote(text: string): MDNote {
  return {
    type: 'NOTE',
    text,
  };
}

export type MDFrontMatter = {
  type: 'FRONTMATTER';
  data: Record<string, unknown>;
  comments?: string[];
};

export function mdFrontMatter(
  data: Record<string, unknown>,
  comments?: string[],
): MDFrontMatter {
  return {
    type: 'FRONTMATTER',
    data,
    comments,
  };
}

export type MDHeading = {
  type: 'HEADING';
  level: number;
  text: string;
};

export function mdHeading(level: number, text: string): MDHeading {
  return {
    type: 'HEADING',
    level,
    text,
  };
}

export type MDImage = {
  type: 'IMAGE';
  alt: string;
  src: string;
};

export function mdImage(alt: string, src: string): MDImage {
  return {
    type: 'IMAGE',
    alt,
    src,
  };
}

export type MDCode = {
  type: 'CODE';
  language: string;
  content: string;
  collapsed: boolean;
};

export function mdCode(
  language: string,
  content: string,
  collapsed: boolean,
): MDCode {
  return {
    type: 'CODE',
    language,
    content,
    collapsed,
  };
}

export type MDShopifyCodefiles = {
  type: 'SHOPIFY_CODEFILES';
  files: MDShopifyCodefile[];
};

export type MDShopifyCodefile = {
  title: string;
  filename: string;
  code: MDCode;
};

export function mdShopifyCodefiles(
  files: MDShopifyCodefile[],
): MDShopifyCodefiles {
  return {
    type: 'SHOPIFY_CODEFILES',
    files,
  };
}

export type MDList = {
  type: 'LIST';
  items: string[];
};

export function mdList(items: string[]): MDList {
  return {
    type: 'LIST',
    items,
  };
}

export type MDParagraph = {
  type: 'PARAGRAPH';
  text: string;
};

export function mdParagraph(text: string): MDParagraph {
  return {
    type: 'PARAGRAPH',
    text,
  };
}

export type MDTable = {
  type: 'TABLE';
  headers: string[];
  rows: string[][];
};

export function mdTable(headers: string[], rows: string[][]): MDTable {
  return {
    type: 'TABLE',
    headers,
    rows,
  };
}

export type MDQuote = {
  type: 'QUOTE';
  text: string;
};

export function mdQuote(text: string): MDQuote {
  return {
    type: 'QUOTE',
    text,
  };
}

export type RawHTML = {
  type: 'RAW_HTML';
  html: string;
};

export function mdRawHTML(html: string): RawHTML {
  return {type: 'RAW_HTML', html};
}

export type MDBlock =
  | MDHeading
  | MDImage
  | MDCode
  | MDShopifyCodefiles
  | MDList
  | MDParagraph
  | MDTable
  | MDQuote
  | MDFrontMatter
  | MDNote
  | RawHTML;

export function renderMDBlock(block: MDBlock, format: RenderFormat): string {
  switch (block.type) {
    case 'HEADING':
      const hashes = '#'.repeat(block.level);
      return `${hashes} ${block.text}`;
    case 'IMAGE':
      return `![${block.alt}](${block.src})`;
    case 'CODE':
      const code = ['~~~' + block.language, block.content, '~~~'];
      if (block.collapsed) {
        switch (format) {
          case 'github':
            return ['<details>\n', ...code, '\n</details>'].join('\n');
          case 'shopify.dev':
            return [
              '<details>\n',
              '<CodeBlock type="file">',
              ...code,
              '</CodeBlock>',
              '\n</details>',
            ].join('\n');
          default:
            assertNever(format);
        }
      }
      return code.join('\n');
    case 'SHOPIFY_CODEFILES':
      return [
        '<CodeBlock type="file">',
        ...block.files.map((file) =>
          [
            '```' +
              file.code.language +
              `?title: '${file.title}', filename: '${file.filename}'`,
            file.code.content,
            '```\n',
          ].join('\n'),
        ),
        '</CodeBlock>',
      ].join('\n');
    case 'LIST':
      return block.items.map((item) => `- ${item}`).join('\n');
    case 'PARAGRAPH':
      return block.text;
    case 'TABLE':
      const header = '| ' + block.headers.join(' | ') + ' |';
      const divider = '| ' + block.headers.map(() => '---').join(' | ') + ' |';
      return [
        header,
        divider,
        ...block.rows.map((row) => '| ' + row.join(' | ') + ' |'),
      ].join('\n');
    case 'QUOTE':
      return `> ${block.text}`;
    case 'FRONTMATTER':
      const stringified = YAML.stringify(block.data, {
        lineWidth: 0,
        defaultStringType: 'PLAIN',
        defaultKeyType: 'PLAIN',
      })
        .trim()
        // Remove any quotes wrapping the stringified values manually,
        // as some of them may have been added by the YAML stringifier.
        .split('\n')
        .map((line) => {
          return line.replace(/^([^'"]+): ['"](.+)['"]/, '$1: $2');
        })
        .join('\n');

      return [
        '---',
        ...(block.comments ?? []).map((comment) => `# ${comment}`),
        stringified,
        '---',
      ].join('\n');
    case 'NOTE':
      if (format === 'shopify.dev') {
        return `<Notice framed type="note" label="Note">\n${block.text}\n</Notice>`;
      } else {
        return [
          '> [!NOTE]',
          block.text.split('\n').map((line) => `> ${line}`),
        ].join('\n');
      }
    case 'RAW_HTML':
      return block.html;
    default:
      assertNever(block);
  }
}

export function mdLinkString(url: string, text: string): string {
  return `[${text}](${url})`;
}

export function mdCodeString(code: string): string {
  return `\`${code}\``;
}

export function maybeMDBlock<T>(
  value: T | null | undefined,
  makeBlock: (v: T) => MDBlock[],
): MDBlock[] {
  if (value == null) {
    return [];
  }
  return makeBlock(value);
}

export function serializeMDBlocksToFile(
  blocks: MDBlock[],
  filePath: string,
  format: RenderFormat,
) {
  let data = blocks
    .map((block) => renderMDBlock(block, format).trim())
    .join('\n\n');
  if (format === 'shopify.dev') {
    data = data.replace(/\{\{/g, "{{ '{{' }}");
  }
  fs.writeFileSync(filePath, data);
}
