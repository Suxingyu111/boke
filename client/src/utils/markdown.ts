import MarkdownIt from "markdown-it";
import markdownItAnchor from "markdown-it-anchor";
import markdownItFootnote from "markdown-it-footnote";
import markdownItTaskLists from "markdown-it-task-lists";
import hljs from "highlight.js/lib/common";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function slugify(value: string) {
  const normalized = value
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "");

  const slug = normalized
    .replace(/[^a-z0-9\u4e00-\u9fa5\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return slug || `section-${Date.now().toString(36)}`;
}

function isSafeLink(url: string) {
  if (!url) {
    return false;
  }

  if (/^(https?:|mailto:|tel:)/i.test(url)) {
    return true;
  }

  return !/^[a-zA-Z][\w+.-]*:/i.test(url);
}

function renderCodeBlock(code: string, language: string) {
  const languageName = language.trim().toLowerCase();
  const resolvedLanguage =
    languageName && hljs.getLanguage(languageName) ? languageName : "";
  const highlighted = resolvedLanguage
    ? hljs.highlight(code, {
        language: resolvedLanguage,
        ignoreIllegals: true,
      }).value
    : escapeHtml(code);
  const label = resolvedLanguage || "text";

  return [
    `<pre class="markdown-code-block" data-language="${escapeHtml(label)}">`,
    '<div class="markdown-code-toolbar">',
    `<span class="markdown-code-language">${escapeHtml(label)}</span>`,
    '<button class="markdown-code-copy" type="button" data-copy-code>复制代码</button>',
    "</div>",
    `<code class="hljs language-${escapeHtml(label)}">${highlighted}</code>`,
    "</pre>",
  ].join("");
}

const markdownRenderer = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: true,
  breaks: false,
  highlight(code, language) {
    return renderCodeBlock(code, language);
  },
});

markdownRenderer.validateLink = isSafeLink;
markdownRenderer
  .use(markdownItAnchor, {
    level: [1, 2, 3],
    slugify,
    tabIndex: false,
  })
  .use(markdownItTaskLists, {
    enabled: true,
    label: true,
    labelAfter: true,
  })
  .use(markdownItFootnote);

const defaultLinkOpenRenderer =
  markdownRenderer.renderer.rules.link_open ??
  ((tokens, index, options, _env, self) =>
    self.renderToken(tokens, index, options));

markdownRenderer.renderer.rules.link_open = (
  tokens,
  index,
  options,
  env,
  self,
) => {
  const href = tokens[index].attrGet("href") || "";
  if (/^https?:\/\//i.test(href)) {
    tokens[index].attrSet("target", "_blank");
    tokens[index].attrSet("rel", "noreferrer noopener");
  }
  return defaultLinkOpenRenderer(tokens, index, options, env, self);
};

export function renderMarkdown(markdown: string) {
  return markdownRenderer.render(markdown || "");
}

export async function handleMarkdownInteraction(event: MouseEvent) {
  const target = event.target;
  if (!(target instanceof Element)) {
    return false;
  }

  const copyButton = target.closest<HTMLElement>("[data-copy-code]");
  if (!copyButton) {
    return false;
  }

  const codeElement = copyButton
    .closest(".markdown-code-block")
    ?.querySelector("code");
  const code = codeElement?.textContent || "";
  if (!code) {
    copyButton.textContent = "暂无代码";
    return true;
  }

  const originalLabel = copyButton.dataset.originalLabel || copyButton.textContent || "复制代码";
  copyButton.dataset.originalLabel = originalLabel;

  try {
    await navigator.clipboard.writeText(code);
    copyButton.textContent = "已复制";
    copyButton.dataset.copied = "true";
  } catch {
    copyButton.textContent = "复制失败";
    copyButton.dataset.copied = "false";
  }

  window.setTimeout(() => {
    if (copyButton.isConnected) {
      copyButton.textContent = originalLabel;
      delete copyButton.dataset.copied;
    }
  }, 1600);

  return true;
}
