import { ArgumentMetadata } from '@nestjs/common';
import { SanitizePipe } from '../src/common/pipes/sanitize.pipe';

describe('SanitizePipe', () => {
  const pipe = new SanitizePipe();
  const bodyMetadata: ArgumentMetadata = {
    type: 'body',
    metatype: Object,
    data: '',
  };

  it('应对普通字符串执行 HTML 实体转义', () => {
    const sanitized = pipe.transform(
      {
        title: '<script>alert(1)</script>',
      },
      bodyMetadata,
    ) as { title: string };

    expect(sanitized.title).toBe('&lt;script&gt;alert(1)&lt;/script&gt;');
  });

  it('应对白名单富文本字段执行结构化净化而不是整体转义', () => {
    const sanitized = pipe.transform(
      {
        contentHtml:
          '<h2 id="safe" onclick="alert(1)">标题</h2><script>alert(1)</script><a href="javascript:alert(1)">危险</a>',
      },
      bodyMetadata,
    ) as { contentHtml: string };

    expect(sanitized.contentHtml).toContain('<h2 id="safe">标题</h2>');
    expect(sanitized.contentHtml).not.toContain('onclick');
    expect(sanitized.contentHtml).not.toContain('<script');
    expect(sanitized.contentHtml).not.toContain('javascript:');
  });
});
