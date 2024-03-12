// This is taken from remix: https://github.com/remix-run/remix/blob/main/packages/remix-server-runtime/markup.ts

const ESCAPE_LOOKUP: {[match: string]: string} = {
  '&': '\\u0026',
  '>': '\\u003e',
  '<': '\\u003c',
  '\u2028': '\\u2028',
  '\u2029': '\\u2029',
};

const ESCAPE_REGEX = /[&><\u2028\u2029]/g;

export function escapeHtml(html: string) {
  return html.replace(ESCAPE_REGEX, (match) => ESCAPE_LOOKUP[match]);
}
