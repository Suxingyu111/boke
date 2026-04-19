import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, IsUrl, Length } from 'class-validator';

export class CreateCommentDto {
  @ApiProperty({ description: '评论作者昵称', example: '访客甲' })
  @IsString({ message: '评论作者名称必须为字符串' })
  @Length(2, 100, { message: '评论作者名称长度需在 2 到 100 个字符之间' })
  authorName: string;

  @ApiProperty({ description: '评论作者邮箱', example: 'guest@example.com' })
  @IsEmail({}, { message: '评论作者邮箱格式不正确' })
  authorEmail: string;

  @ApiPropertyOptional({ description: '个人网站完整地址', example: 'https://example.com' })
  @IsOptional()
  @IsUrl(
    { require_protocol: true },
    { message: '评论作者网站地址必须为完整 URL，并包含协议头' },
  )
  authorWebsite?: string;

  @ApiPropertyOptional({
    description: '父评论 ID，存在时表示回复评论',
    example: '20000000-0000-4000-8000-000000000001',
  })
  @IsOptional()
  @IsString({ message: '父评论 ID 必须为字符串' })
  parentId?: string;

  @ApiProperty({ description: '评论正文', example: '这篇文章很有帮助。' })
  @IsString({ message: '评论内容必须为字符串' })
  @Length(2, 5000, { message: '评论内容长度需在 2 到 5000 个字符之间' })
  content: string;
}
