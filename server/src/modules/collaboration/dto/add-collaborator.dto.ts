import { IsEnum, IsUUID } from 'class-validator';

export class AddCollaboratorDto {
  @IsUUID()
  userId: string;

  @IsEnum(['editor', 'viewer'])
  permission: 'editor' | 'viewer';
}
