import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import sharp from 'sharp';
import { assertAllowedFileSignature } from '@common/security/file-validation.util';
import { User, Favorite, Article, Guestbook } from '@database/entities';
import { MediaAssetsService, UploadedMediaFile } from '../media-assets/media-assets.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

const PASSWORD_SALT_ROUNDS = 10;
const AVATAR_ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

/** 将头像压缩为 WebP，最长边限制 1024 px，质量 85 */
async function compressAvatar(file: UploadedMediaFile): Promise<UploadedMediaFile> {
  // GIF 不做压缩（保留动图）
  if (file.mimetype === 'image/gif') return file;

  const compressed = await sharp(file.buffer)
    .rotate()                        // 自动修正 EXIF 旋转方向
    .resize(1024, 1024, {
      fit: 'inside',
      withoutEnlargement: true,      // 小图不放大
    })
    .webp({ quality: 85 })
    .toBuffer();

  return {
    originalname: file.originalname.replace(/\.[^.]+$/, '.webp'),
    mimetype: 'image/webp',
    size: compressed.length,
    buffer: compressed,
  };
}

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
    private readonly mediaAssetsService: MediaAssetsService,
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

    return this.buildProfileResponse(user, favoriteCount, commentCount);
  }

  /** 更新用户资料（undefined = 不更新；null = 清空；string = 更新） */
  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    // 邮箱更新：检查冲突
    if (dto.email !== undefined) {
      const newEmail = dto.email.toLowerCase();
      if (newEmail !== user.email) {
        const conflict = await this.userRepository.findOne({ where: { email: newEmail } });
        if (conflict) {
          throw new ConflictException('该邮箱已被其他账号使用');
        }
        user.email = newEmail;
        user.emailVerifiedAt = null;
      }
    }

    if (dto.nickname !== undefined) {
      const nextNickname = dto.nickname ?? null;
      if (nextNickname !== user.nickname && nextNickname) {
        const conflict = await this.userRepository.findOne({ where: { nickname: nextNickname } });
        if (conflict) {
          throw new ConflictException('该昵称已被其他账号使用');
        }
      }
      user.nickname = nextNickname;
    }
    if (dto.avatar !== undefined) user.avatar = dto.avatar ?? null;
    if (dto.bio !== undefined) user.bio = dto.bio ?? null;

    const savedUser = await this.userRepository.save(user);

    const [favoriteCount, commentCount] = await Promise.all([
      this.favoriteRepository.count({ where: { userId } }),
      this.guestbookRepository.count({ where: { nickname: savedUser.nickname || savedUser.username } }),
    ]);

    return this.buildProfileResponse(savedUser, favoriteCount, commentCount);
  }

  /** 上传并更新用户头像，返回新的头像 URL */
  async uploadAvatar(currentUser: User, file: UploadedMediaFile) {
    if (!file) {
      throw new BadRequestException('请选择要上传的图片');
    }

    if (!AVATAR_ALLOWED_TYPES.includes(file.mimetype)) {
      throw new BadRequestException('头像只支持 JPG、PNG、WebP、GIF 格式');
    }
    assertAllowedFileSignature(file);

    const compressed = await compressAvatar(file);
    const asset = await this.mediaAssetsService.upload(compressed, currentUser, '用户头像');
    await this.userRepository.update(currentUser.id, { avatar: asset.fileUrl });

    return { url: asset.fileUrl };
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

  private buildProfileResponse(user: User, favoriteCount: number, commentCount: number) {
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      phone: user.phone,
      nickname: user.nickname,
      avatar: user.avatar,
      bio: user.bio,
      registrationType: user.registrationType,
      emailVerified: Boolean(user.emailVerifiedAt),
      phoneVerified: Boolean(user.phoneVerifiedAt),
      role: user.role,
      createdAt: user.createdAt,
      favoriteCount,
      commentCount,
    };
  }
}
