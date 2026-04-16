import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
} from 'class-validator';

export class UpdatePageDto {
  @IsOptional()
  @IsString({ message: '页面标题必须为字符串' })
  @Length(1, 255, { message: '页面标题长度必须在 1 到 255 个字符之间' })
  title?: string;

  @IsOptional()
  @IsString({ message: '页面 slug 必须为字符串' })
  @Length(1, 255, { message: '页面 slug 长度必须在 1 到 255 个字符之间' })
  @Matches(/^[a-z0-9-]+$/, { message: '页面 slug 仅支持小写字母、数字和中划线' })
  slug?: string;

  @IsOptional()
  @IsEnum(['about', 'custom', 'resume', 'portfolio'], { message: '页面类型不合法' })
  pageType?: 'about' | 'custom' | 'resume' | 'portfolio';

  @IsOptional()
  @IsString({ message: '页面内容必须为字符串' })
  @MaxLength(200000, { message: '页面内容不能超过 200000 个字符' })
  content?: string;

  @IsOptional()
  @IsString({ message: '页面 HTML 内容必须为字符串' })
  contentHtml?: string;

  @IsOptional()
  @IsString({ message: '页面摘要必须为字符串' })
  @MaxLength(500, { message: '页面摘要不能超过 500 个字符' })
  summary?: string;

  @IsOptional()
  @IsBoolean({ message: '首页显示标记必须为布尔值' })
  isHomeVisible?: boolean;

  @IsOptional()
  @IsEnum(['draft', 'published'], { message: '页面状态不合法' })
  status?: 'draft' | 'published';

  @IsOptional()
  @IsString({ message: 'SEO 标题必须为字符串' })
  @MaxLength(255, { message: 'SEO 标题不能超过 255 个字符' })
  seoTitle?: string;

  @IsOptional()
  @IsString({ message: 'SEO 描述必须为字符串' })
  @MaxLength(500, { message: 'SEO 描述不能超过 500 个字符' })
  seoDescription?: string;
}
