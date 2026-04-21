import { IsNotEmptyObject, IsObject } from 'class-validator';

export class UpdateDatabaseTableRowDto {
  @IsObject({ message: 'primaryKey 必须为对象' })
  @IsNotEmptyObject({}, { message: 'primaryKey 不能为空对象' })
  primaryKey: Record<string, unknown>;

  @IsObject({ message: 'values 必须为对象' })
  @IsNotEmptyObject({}, { message: 'values 不能为空对象' })
  values: Record<string, unknown>;
}
