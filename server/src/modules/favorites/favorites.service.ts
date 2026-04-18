import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Article, Favorite } from '@database/entities';

@Injectable()
export class FavoritesService {
  constructor(
    @InjectRepository(Favorite)
    private readonly favoriteRepository: Repository<Favorite>,
    @InjectRepository(Article)
    private readonly articleRepository: Repository<Article>,
  ) {}

  /** 收藏文章 */
  async addFavorite(userId: string, articleId: string) {
    const article = await this.articleRepository.findOne({
      where: { id: articleId, status: 'published' },
    });
    if (!article) {
      throw new NotFoundException('文章不存在');
    }

    const existing = await this.favoriteRepository.findOne({
      where: { userId, articleId },
    });
    if (existing) {
      throw new ConflictException('已收藏该文章');
    }

    const favorite = this.favoriteRepository.create({ userId, articleId });
    await this.favoriteRepository.save(favorite);

    return { message: '收藏成功', articleId };
  }

  /** 取消收藏 */
  async removeFavorite(userId: string, articleId: string) {
    const favorite = await this.favoriteRepository.findOne({
      where: { userId, articleId },
    });
    if (!favorite) {
      throw new NotFoundException('未收藏该文章');
    }

    await this.favoriteRepository.remove(favorite);
    return { message: '已取消收藏', articleId };
  }

  /** 判断是否已收藏 */
  async isFavorited(userId: string, articleId: string): Promise<{ favorited: boolean }> {
    const count = await this.favoriteRepository.count({
      where: { userId, articleId },
    });
    return { favorited: count > 0 };
  }

  /** 批量判断是否已收藏 */
  async batchCheckFavorited(
    userId: string,
    articleIds: string[],
  ): Promise<Record<string, boolean>> {
    if (articleIds.length === 0) return {};

    const favorites = await this.favoriteRepository
      .createQueryBuilder('f')
      .where('f.user_id = :userId', { userId })
      .andWhere('f.article_id IN (:...articleIds)', { articleIds })
      .getMany();

    const favoritedSet = new Set(favorites.map(f => f.articleId));
    const result: Record<string, boolean> = {};
    for (const id of articleIds) {
      result[id] = favoritedSet.has(id);
    }
    return result;
  }
}
