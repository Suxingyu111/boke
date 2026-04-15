import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateArticleDto {
  @IsOptional()
  @IsString({ message: '文章标题必须为字符串' })
  @Length(1, 255, { message: '文章标题长度必须在 1 到 255 个字符之间' })
  title?: string;

  @IsOptional()
  @IsString({ message: '文章 slug 必须为字符串' })
  @Length(1, 255, { message: '文章 slug 长度必须在 1 到 255 个字符之间' })
  @Matches(/^[a-z0-9-]+$/, { message: '文章 slug 仅支持小写字母、数字和中划线' })
  slug?: string;

  @IsOptional()
  @IsString({ message: '文章摘要必须为字符串' })
  @MaxLength(2000, { message: '文章摘要不能超过 2000 个字符' })
  excerpt?: string;

  @IsOptional()
  @IsString({ message: '文章内容必须为字符串' })
  @MaxLength(200000, { message: '文章内容不能超过 200000 个字符' })
  content?: string;

  @IsOptional()
  @IsString({ message: '文章 HTML 内容必须为字符串' })
  contentHtml?: string;

  @IsOptional()
  @IsString({ message: '封面图地址必须为字符串' })
  @MaxLength(500, { message: '封面图地址不能超过 500 个字符' })
  coverImage?: string;

  @IsOptional()
  @IsUUID('4', { message: '分类 ID 格式不正确' })
  categoryId?: string;

  @IsOptional()
  @IsArray({ message: '标签 ID 必须为数组' })
  @ArrayUnique({ message: '标签 ID 不能重复' })
  @IsUUID('4', { each: true, message: '标签 ID 格式不正确' })
  tagIds?: string[];

  @IsOptional()
  @IsEnum(['draft', 'scheduled', 'published', 'archived'], {
    message: '文章状态不合法',
  })
  status?: 'draft' | 'scheduled' | 'published' | 'archived';

  @IsOptional()
  @IsEnum(['public', 'private', 'password'], {
    message: '文章可见性不合法',
  })
  visibility?: 'public' | 'private' | 'password';

  @IsOptional()
  @IsBoolean({ message: '允许评论标记必须为布尔值' })
  allowComment?: boolean;

  @IsOptional()
  @IsBoolean({ message: '置顶标记必须为布尔值' })
  isTop?: boolean;

  @IsOptional()
  @IsInt({ message: '排序值必须为整数' })
  @Min(0, { message: '排序值不能小于 0' })
  sortOrder?: number;

  @IsOptional()
  @IsString({ message: 'SEO 标题必须为字符串' })
  @MaxLength(255, { message: 'SEO 标题不能超过 255 个字符' })
  seoTitle?: string;

  @IsOptional()
  @IsString({ message: 'SEO 描述必须为字符串' })
  @MaxLength(500, { message: 'SEO 描述不能超过 500 个字符' })
  seoDescription?: string;

  @IsOptional()
  @IsString({ message: 'SEO 关键词必须为字符串' })
  @MaxLength(255, { message: 'SEO 关键词不能超过 255 个字符' })
  seoKeywords?: string;

  @IsOptional()
  @IsISO8601({}, { message: '定时发布时间格式不正确' })
  scheduledAt?: string;
}