import { IsEnum, IsOptional } from 'class-validator';

export class ExportArticleDto {
  @IsOptional()
  @IsEnum(['markdown', 'json'], { message: '导出格式仅支持 markdown 或 json' })
  format?: 'markdown' | 'json';
}