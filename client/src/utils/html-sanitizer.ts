import DOMPurify from "dompurify";

const RICH_TEXT_ALLOWED_TAGS = [
  "a",
  "blockquote",
  "br",
  "button",
  "code",
  "del",
  "div",
  "em",
  "figcaption",
  "figure",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "hr",
  "img",
  "input",
  "label",
  "li",
  "mark",
  "ol",
  "p",
  "pre",
  "section",
  "span",
  "strong",
  "sub",
  "sup",
  "table",
  "tbody",
  "td",
  "th",
  "thead",
  "tr",
  "ul",
];

const RICH_TEXT_ALLOWED_ATTR = [
  "alt",
  "checked",
  "class",
  "data-copy-code",
  "data-language",
  "data-markdown-lightbox",
  "disabled",
  "href",
  "id",
  "loading",
  "rel",
  "src",
  "tabindex",
  "target",
  "title",
  "type",
];

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function sanitizeRichTextHtml(value: string): string {
  return DOMPurify.sanitize(value || "", {
    ALLOWED_TAGS: RICH_TEXT_ALLOWED_TAGS,
    ALLOWED_ATTR: RICH_TEXT_ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
    FORBID_ATTR: ["style"],
    FORBID_TAGS: ["style"],
  });
}

export function sanitizeSearchHighlightHtml(value?: string | null): string {
  const escaped = escapeHtml(value || "");

  return escaped
    .replace(/&lt;mark&gt;/g, "<mark>")
    .replace(/&lt;\/mark&gt;/g, "</mark>");
}
