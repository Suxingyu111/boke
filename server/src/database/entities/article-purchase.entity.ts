import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Article } from './article.entity';
import { User } from './user.entity';

@Entity('article_purchases')
@Index('idx_purchase_article_user', ['articleId', 'userId'], { unique: true })
@Index('idx_purchase_user', ['userId'])
export class ArticlePurchase {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'article_id', type: 'char', length: 36 })
  articleId: string;

  @ManyToOne(() => Article, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'article_id' })
  article: Article;

  @Column({ name: 'user_id', type: 'char', length: 36 })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'paid_amount', type: 'decimal', precision: 10, scale: 2 })
  paidAmount: number;

  @Column({ name: 'payment_method', type: 'varchar', length: 50, default: 'manual' })
  paymentMethod: string;

  @Column({ name: 'transaction_id', type: 'varchar', length: 200, nullable: true })
  transactionId: string | null;

  @CreateDateColumn({ name: 'purchased_at', type: 'datetime' })
  purchasedAt: Date;
}
