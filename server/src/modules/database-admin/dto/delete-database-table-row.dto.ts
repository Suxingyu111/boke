import { IsNotEmptyObject, IsObject } from 'class-validator';

export class DeleteDatabaseTableRowDto {
  @IsObject({ message: 'primaryKey 必须为对象' })
  @IsNotEmptyObject({}, { message: 'primaryKey 不能为空对象' })
  primaryKey: Record<string, unknown>;
}
