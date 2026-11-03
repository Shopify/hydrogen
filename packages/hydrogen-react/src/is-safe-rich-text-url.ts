/** Whether a URL is safe for the default rich text link renderers. */
export function isSafeRichTextUrl(url: string): boolean {
  if (typeof url !== 'string') return false;

  try {
    const {protocol} = new URL(url, 'https://richtext.invalid');
    return ['http:', 'https:', 'mailto:', 'tel:', 'sms:'].includes(protocol);
  } catch {
    return false;
  }
}
