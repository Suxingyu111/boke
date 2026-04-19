import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Transform } from 'class-transformer';

/** 将空字符串统一转换为 null，非空字符串则 trim */
function trimOrNull(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed === '' ? null : trimmed;
  }
  return String(value);
}

export class UpdateProfileDto {
  @IsOptional()
  @Transform(({ value }) => trimOrNull(value))
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  nickname?: string | null;

  /**
   * 头像 URL：接受 http(s) 外链 或 /api/ 路径（本站上传返回的相对路径）
   * 空字符串经 Transform → null 后 @IsOptional 跳过后续校验（清空）
   */
  @IsOptional()
  @Transform(({ value }) => trimOrNull(value))
  @IsString()
  @MaxLength(500)
  @Matches(/^(https?:\/\/.+|\/api\/.+)$/, {
    message: '头像地址格式不正确，请填写以 http:// 或 https:// 开头的完整网址，或使用上传功能',
  })
  avatar?: string | null;

  @IsOptional()
  @Transform(({ value }) => trimOrNull(value))
  @IsString()
  @MaxLength(500)
  bio?: string | null;

  /**
   * 邮箱：传 null / 空字符串 → 不处理；传合法 email → 更新（冲突时返回 409）
   */
  @IsOptional()
  @Transform(({ value }) => {
    const v = trimOrNull(value);
    return v === null ? undefined : v; // 空邮箱不更新，直接 undefined
  })
  @IsEmail({}, { message: '邮箱格式不正确' })
  @MaxLength(255)
  email?: string;
}
