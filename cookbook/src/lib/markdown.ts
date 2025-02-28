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
  data: Record<string, string>;
};

export function mdFrontMatter(data: Record<string, string>): MDFrontMatter {
  return {
    type: 'FRONTMATTER',
    data,
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
  | MDNote;

export function renderMDBlock(block: MDBlock): string {
  switch (block.type) {
    case 'HEADING':
      const hashes = '#'.repeat(block.level);
      return `${hashes} ${block.text}`;
    case 'IMAGE':
      return `![${block.alt}](${block.src})`;
    case 'CODE':
      const code = ['```' + block.language, block.content, '```'];
      if (block.collapsed) {
        return ['<details>\n', ...code, '\n</details>'].join('\n');
      }
      return code.join('\n');
    case 'SHOPIFY_CODEFILES':
      return [
        '{% codeblock file %}',
        ...block.files.map((file) =>
          [
            '```' +
              file.code.language +
              `?title: '${file.title}', filename: '${file.filename}'`,
            file.code.content,
            '```\n',
          ].join('\n'),
        ),
        '{% endcodeblock %}',
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
      return [
        '---',
        ...Object.entries(block.data).map(([key, value]) => `${key}: ${value}`),
        '---',
      ].join('\n');
    case 'NOTE':
      return [
        '> [!NOTE]',
        block.text
          .split('\n')
          .map((line) => `> ${line}`)
          .join('\n'),
      ].join('\n');
    default:
      const exhaustiveCheck: never = block;
      throw new Error('invalid type for markdown block');
  }
}
