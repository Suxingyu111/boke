import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class ReplyCommentDto {
  @ApiProperty({ description: '管理员回复内容', example: '感谢反馈，我们会继续优化。' })
  @IsString({ message: '回复内容必须为字符串' })
  @Length(2, 5000, { message: '回复内容长度需在 2 到 5000 个字符之间' })
  content: string;
}
