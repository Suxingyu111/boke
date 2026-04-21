import { describe, expect, it } from "vitest";
import {
  sanitizeRichTextHtml,
  sanitizeSearchHighlightHtml,
} from "@/utils/html-sanitizer";
import { renderStoredRichText } from "@/utils/markdown";

describe("html sanitizer", () => {
  it("应移除富文本中的脚本、事件属性和危险协议", () => {
    const sanitized = sanitizeRichTextHtml(
      '<h2 id="safe" onclick="alert(1)">标题</h2><img src="https://example.com/a.png" onerror="alert(1)"><script>alert(1)</script><a href="javascript:alert(1)">危险</a><a href="https://example.com">安全链接</a>',
    );

    expect(sanitized).toContain('<h2 id="safe">标题</h2>');
    expect(sanitized).toContain('src="https://example.com/a.png"');
    expect(sanitized).toContain('href="https://example.com"');
    expect(sanitized).not.toContain("onclick");
    expect(sanitized).not.toContain("onerror");
    expect(sanitized).not.toContain("<script");
    expect(sanitized).not.toContain("javascript:");
  });

  it("搜索高亮仅保留 mark 标签，其余内容转义显示", () => {
    const sanitized = sanitizeSearchHighlightHtml(
      '<mark>命中</mark><img src=x onerror=alert(1)>',
    );

    expect(sanitized).toBe("<mark>命中</mark>&lt;img src=x onerror=alert(1)&gt;");
  });

  it("读取服务端回传的 contentHtml 时也应做兜底净化", () => {
    const rendered = renderStoredRichText(
      "普通内容",
      '<p onclick="alert(1)">安全段落</p><script>alert(1)</script>',
    );

    expect(rendered).toBe("<p>安全段落</p>");
  });
});
