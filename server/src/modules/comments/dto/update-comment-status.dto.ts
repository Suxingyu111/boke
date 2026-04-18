import { IsEnum } from 'class-validator';

export class UpdateCommentStatusDto {
  @IsEnum(['pending', 'approved', 'spam', 'rejected'], {
    message: '评论状态必须为 pending、approved、spam 或 rejected',
  })
  status: 'pending' | 'approved' | 'spam' | 'rejected';
}