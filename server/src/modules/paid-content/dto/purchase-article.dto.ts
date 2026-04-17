import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class PurchaseArticleDto {
  @IsUUID()
  articleId: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  paymentMethod?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  transactionId?: string;
}
