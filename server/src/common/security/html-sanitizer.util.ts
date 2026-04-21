import sanitizeHtml from 'sanitize-html';

const RICH_TEXT_ALLOWED_TAGS = [
  'a',
  'blockquote',
  'br',
  'button',
  'code',
  'del',
  'div',
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
  'img',
  'input',
  'label',
  'li',
  'mark',
  'ol',
  'p',
  'pre',
  'section',
  'span',
  'strong',
  'sub',
  'sup',
  'table',
  'tbody',
  'td',
  'th',
  'thead',
  'tr',
  'ul',
] as const;

const RICH_TEXT_ALLOWED_ATTRIBUTES: sanitizeHtml.IOptions['allowedAttributes'] = {
  '*': ['class', 'id'],
  a: ['href', 'rel', 'target'],
  button: ['class', 'data-copy-code', 'type'],
  code: ['class'],
  img: ['alt', 'class', 'data-markdown-lightbox', 'loading', 'src', 'tabindex', 'title'],
  input: ['checked', 'class', 'disabled', 'type'],
  pre: ['class', 'data-language'],
};

const RICH_TEXT_SANITIZER_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [...RICH_TEXT_ALLOWED_TAGS],
  allowedAttributes: RICH_TEXT_ALLOWED_ATTRIBUTES,
  allowedSchemes: ['http', 'https', 'mailto', 'tel'],
  allowedSchemesByTag: {
    img: ['http', 'https', 'data'],
  },
  allowProtocolRelative: false,
  parseStyleAttributes: false,
};

export function sanitizeRichTextHtml(value: string): string {
  return sanitizeHtml(value, RICH_TEXT_SANITIZER_OPTIONS);
}

export function sanitizeOptionalRichTextHtml(value?: string | null): string | null {
  const normalized = value?.trim();

  if (!normalized) {
    return null;
  }

  return sanitizeRichTextHtml(normalized);
}
