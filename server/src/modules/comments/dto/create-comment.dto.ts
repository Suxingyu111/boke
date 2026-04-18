import { IsEmail, IsOptional, IsString, IsUrl, Length } from 'class-validator';

export class CreateCommentDto {
  @IsString({ message: '评论作者名称必须为字符串' })
  @Length(2, 100, { message: '评论作者名称长度需在 2 到 100 个字符之间' })
  authorName: string;

  @IsEmail({}, { message: '评论作者邮箱格式不正确' })
  authorEmail: string;

  @IsOptional()
  @IsUrl(
    { require_protocol: true },
    { message: '评论作者网站地址必须为完整 URL，并包含协议头' },
  )
  authorWebsite?: string;

  @IsOptional()
  @IsString({ message: '父评论 ID 必须为字符串' })
  parentId?: string;

  @IsString({ message: '评论内容必须为字符串' })
  @Length(2, 5000, { message: '评论内容长度需在 2 到 5000 个字符之间' })
  content: string;
}