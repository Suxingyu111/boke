import { IsString, Length } from 'class-validator';

export class ReplyCommentDto {
  @IsString({ message: '回复内容必须为字符串' })
  @Length(2, 5000, { message: '回复内容长度需在 2 到 5000 个字符之间' })
  content: string;
}