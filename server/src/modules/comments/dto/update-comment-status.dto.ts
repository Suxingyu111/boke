import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';

export class UpdateCommentStatusDto {
  @ApiProperty({
    description: '评论审核状态',
    enum: ['pending', 'approved', 'spam', 'rejected'],
    example: 'approved',
  })
  @IsEnum(['pending', 'approved', 'spam', 'rejected'], {
    message: '评论状态必须为 pending、approved、spam 或 rejected',
  })
  status: 'pending' | 'approved' | 'spam' | 'rejected';
}
