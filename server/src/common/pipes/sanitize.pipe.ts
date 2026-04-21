import { PipeTransform, Injectable, ArgumentMetadata } from '@nestjs/common';
import { sanitizeRichTextHtml } from '@common/security/html-sanitizer.util';

/**
 * XSS 清洗管道
 * 对字符串类型的输入进行 HTML 实体转义，防止 XSS 攻击
 */
@Injectable()
export class SanitizePipe implements PipeTransform {
  transform(value: unknown, metadata: ArgumentMetadata): unknown {
    if (metadata.type !== 'body') {
      return value;
    }
    return this.sanitize(value);
  }

  private sanitize(value: unknown, key?: string): unknown {
    if (typeof value === 'string') {
      if (key === 'contentHtml') {
        return sanitizeRichTextHtml(value);
      }

      return this.escapeHtml(value);
    }
    if (Array.isArray(value)) {
      return value.map(item => this.sanitize(item, key));
    }
    if (value !== null && typeof value === 'object') {
      const sanitized: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(value)) {
        sanitized[key] = this.sanitize(val, key);
      }
      return sanitized;
    }
    return value;
  }

  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  }
}
