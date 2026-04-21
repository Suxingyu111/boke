import { IsNotEmptyObject, IsObject } from 'class-validator';

export class CreateDatabaseTableRowDto {
  @IsObject({ message: 'values 必须为对象' })
  @IsNotEmptyObject({}, { message: 'values 不能为空对象' })
  values: Record<string, unknown>;
}
