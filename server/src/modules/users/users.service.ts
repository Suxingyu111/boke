import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, Favorite, Article, Guestbook } from '@database/entities';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

const PASSWORD_SALT_ROUNDS = 10;

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Favorite)
    private readonly favoriteRepository: Repository<Favorite>,
    @InjectRepository(Article)
    private readonly articleRepository: Repository<Article>,
    @InjectRepository(Guestbook)
    private readonly guestbookRepository: Repository<Guestbook>,
  ) {}

  /** 获取用户个人资料 */
  async getProfile(userId: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    const [favoriteCount, commentCount] = await Promise.all([
      this.favoriteRepository.count({ where: { userId } }),
      this.guestbookRepository.count({ where: { nickname: user.nickname || user.username } }),
    ]);

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      nickname: user.nickname,
      avatar: user.avatar,
      bio: user.bio,
      role: user.role,
      createdAt: user.createdAt,
      favoriteCount,
      commentCount,
    };
  }

  /** 更新用户资料 */
  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    if (dto.nickname !== undefined) user.nickname = dto.nickname.trim();
    if (dto.avatar !== undefined) user.avatar = dto.avatar.trim();
    if (dto.bio !== undefined) user.bio = dto.bio.trim();

    const savedUser = await this.userRepository.save(user);
    return {
      id: savedUser.id,
      username: savedUser.username,
      email: savedUser.email,
      nickname: savedUser.nickname,
      avatar: savedUser.avatar,
      bio: savedUser.bio,
    };
  }

  /** 修改密码 */
  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.id = :id', { id: userId })
      .getOne();

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    const isOldPasswordValid = await bcrypt.compare(dto.oldPassword, user.password);
    if (!isOldPasswordValid) {
      throw new BadRequestException('旧密码不正确');
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, PASSWORD_SALT_ROUNDS);
    await this.userRepository.update(userId, { password: passwordHash });

    return { message: '密码修改成功' };
  }

  /** 获取用户收藏的文章列表 */
  async getFavoriteArticles(userId: string, page = 1, pageSize = 20) {
    const [items, total] = await this.favoriteRepository.findAndCount({
      where: { userId },
      relations: ['article', 'article.category', 'article.author'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return {
      items: items.map(fav => ({
        id: fav.id,
        favoritedAt: fav.createdAt,
        article: {
          id: fav.article.id,
          title: fav.article.title,
          slug: fav.article.slug,
          excerpt: fav.article.excerpt,
          coverImage: fav.article.coverImage,
          publishedAt: fav.article.publishedAt,
          viewCount: fav.article.viewCount,
          category: fav.article.category,
          author: {
            id: fav.article.author?.id,
            username: fav.article.author?.username,
            nickname: fav.article.author?.nickname,
            avatar: fav.article.author?.avatar,
          },
        },
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }
}
