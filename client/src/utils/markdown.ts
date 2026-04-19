import MarkdownIt from "markdown-it";
import markdownItAnchor from "markdown-it-anchor";
import markdownItFootnote from "markdown-it-footnote";
import markdownItTaskLists from "markdown-it-task-lists";
import hljs from "highlight.js/lib/common";

interface MarkdownLightboxItem {
  src: string;
  alt: string;
}

interface MarkdownLightboxState {
  items: MarkdownLightboxItem[];
  index: number;
  root: HTMLElement;
  image: HTMLImageElement;
  caption: HTMLElement;
  counter: HTMLElement;
  previousButton: HTMLButtonElement;
  nextButton: HTMLButtonElement;
  handleKeydown: (event: KeyboardEvent) => void;
}

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
const defaultImageRenderer =
  markdownRenderer.renderer.rules.image ??
  ((tokens, index, options, _env, self) =>
    self.renderToken(tokens, index, options));

let activeLightbox: MarkdownLightboxState | null = null;

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

markdownRenderer.renderer.rules.image = (tokens, index, options, env, self) => {
  const token = tokens[index];
  const currentClass = token.attrGet("class");
  token.attrSet(
    "class",
    [currentClass, "markdown-image-zoomable"].filter(Boolean).join(" "),
  );
  token.attrSet("data-markdown-lightbox", "true");
  token.attrSet("loading", token.attrGet("loading") || "lazy");
  token.attrSet("tabindex", "0");
  return defaultImageRenderer(tokens, index, options, env, self);
};

export function renderMarkdown(markdown: string) {
  return markdownRenderer.render(markdown || "");
}

function closeMarkdownLightbox() {
  if (!activeLightbox) {
    return;
  }

  document.body.style.removeProperty("overflow");
  document.removeEventListener("keydown", activeLightbox.handleKeydown);
  activeLightbox.root.remove();
  activeLightbox = null;
}

function syncMarkdownLightboxView() {
  if (!activeLightbox) {
    return;
  }

  const currentItem = activeLightbox.items[activeLightbox.index];
  activeLightbox.image.src = currentItem.src;
  activeLightbox.image.alt = currentItem.alt;
  activeLightbox.caption.textContent = currentItem.alt || "图片预览";
  activeLightbox.counter.textContent = `${activeLightbox.index + 1} / ${activeLightbox.items.length}`;
  activeLightbox.previousButton.disabled = activeLightbox.items.length <= 1;
  activeLightbox.nextButton.disabled = activeLightbox.items.length <= 1;
}

function moveMarkdownLightbox(step: number) {
  if (!activeLightbox || activeLightbox.items.length <= 1) {
    return;
  }

  activeLightbox.index =
    (activeLightbox.index + step + activeLightbox.items.length) %
    activeLightbox.items.length;
  syncMarkdownLightboxView();
}

function openMarkdownLightbox(items: MarkdownLightboxItem[], index: number) {
  closeMarkdownLightbox();

  const root = document.createElement("div");
  root.className = "markdown-lightbox";
  root.innerHTML = `
    <div class="markdown-lightbox__backdrop" data-lightbox-close></div>
    <div class="markdown-lightbox__dialog" role="dialog" aria-modal="true" aria-label="图片预览">
      <button class="markdown-lightbox__close" type="button" aria-label="关闭预览" data-lightbox-close>×</button>
      <button class="markdown-lightbox__nav markdown-lightbox__nav--prev" type="button" aria-label="查看上一张">‹</button>
      <figure class="markdown-lightbox__figure">
        <img class="markdown-lightbox__image" alt="" />
        <figcaption class="markdown-lightbox__caption"></figcaption>
      </figure>
      <button class="markdown-lightbox__nav markdown-lightbox__nav--next" type="button" aria-label="查看下一张">›</button>
      <div class="markdown-lightbox__counter"></div>
    </div>
  `;

  const image = root.querySelector<HTMLImageElement>(".markdown-lightbox__image");
  const caption = root.querySelector<HTMLElement>(".markdown-lightbox__caption");
  const counter = root.querySelector<HTMLElement>(".markdown-lightbox__counter");
  const previousButton = root.querySelector<HTMLButtonElement>(".markdown-lightbox__nav--prev");
  const nextButton = root.querySelector<HTMLButtonElement>(".markdown-lightbox__nav--next");
  const closeTriggers = root.querySelectorAll<HTMLElement>("[data-lightbox-close]");

  if (!image || !caption || !counter || !previousButton || !nextButton) {
    return;
  }

  const handleKeydown = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      closeMarkdownLightbox();
      return;
    }

    if (event.key === "ArrowLeft") {
      moveMarkdownLightbox(-1);
      return;
    }

    if (event.key === "ArrowRight") {
      moveMarkdownLightbox(1);
    }
  };

  activeLightbox = {
    items,
    index,
    root,
    image,
    caption,
    counter,
    previousButton,
    nextButton,
    handleKeydown,
  };

  previousButton.addEventListener("click", () => moveMarkdownLightbox(-1));
  nextButton.addEventListener("click", () => moveMarkdownLightbox(1));
  closeTriggers.forEach((trigger) =>
    trigger.addEventListener("click", closeMarkdownLightbox),
  );

  root.addEventListener("click", (event) => {
    if (event.target === root) {
      closeMarkdownLightbox();
    }
  });

  syncMarkdownLightboxView();
  document.body.appendChild(root);
  document.body.style.overflow = "hidden";
  document.addEventListener("keydown", handleKeydown);
}

export async function handleMarkdownInteraction(event: MouseEvent) {
  const target = event.target;
  if (!(target instanceof Element)) {
    return false;
  }

  const copyButton = target.closest<HTMLElement>("[data-copy-code]");
  if (!copyButton) {
    const image = target.closest<HTMLImageElement>("img[data-markdown-lightbox]");
    if (!image) {
      return false;
    }

    const container = image.closest(".markdown-body");
    const items = Array.from(
      container?.querySelectorAll<HTMLImageElement>("img[data-markdown-lightbox]") ??
        [],
    )
      .map((item) => ({
        src: item.currentSrc || item.src,
        alt: item.alt || "",
      }))
      .filter((item) => Boolean(item.src));
    const currentSrc = image.currentSrc || image.src;
    const currentIndex = Math.max(
      items.findIndex((item) => item.src === currentSrc),
      0,
    );

    if (items.length === 0) {
      return false;
    }

    openMarkdownLightbox(items, currentIndex);
    return true;
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
