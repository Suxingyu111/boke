import {
	ArrayUnique,
	IsArray,
	IsEnum,
	IsOptional,
	IsString,
	Length,
	Matches,
	MaxLength,
	ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { SeriesItemDto } from './series-item.dto';

export class UpdateArticleSeriesDto {
	@IsOptional()
	@IsString({ message: '系列名称必须为字符串' })
	@Length(1, 100, { message: '系列名称长度必须在 1 到 100 个字符之间' })
	name?: string;

	@IsOptional()
	@IsString({ message: '系列 slug 必须为字符串' })
	@Length(1, 100, { message: '系列 slug 长度必须在 1 到 100 个字符之间' })
	@Matches(/^[a-z0-9-]+$/, { message: '系列 slug 仅支持小写字母、数字和中划线' })
	slug?: string;

	@IsOptional()
	@IsString({ message: '系列描述必须为字符串' })
	@MaxLength(5000, { message: '系列描述不能超过 5000 个字符' })
	description?: string;

	@IsOptional()
	@IsString({ message: '封面图地址必须为字符串' })
	@MaxLength(500, { message: '封面图地址不能超过 500 个字符' })
	coverImageUrl?: string;

	@IsOptional()
	@IsEnum(['draft', 'published'], { message: '系列状态不合法' })
	status?: 'draft' | 'published';

	@IsOptional()
	@IsArray({ message: '系列文章必须为数组' })
	@ArrayUnique((item: SeriesItemDto) => item.articleId, { message: '系列文章不能重复' })
	@ValidateNested({ each: true })
	@Type(() => SeriesItemDto)
	items?: SeriesItemDto[];
}