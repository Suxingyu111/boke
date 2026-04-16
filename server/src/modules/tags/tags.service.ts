import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Article, ArticleTag, Tag } from '@database/entities';
import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';

const TAG_NOT_FOUND_MESSAGE = '标签不存在';
const TAG_SLUG_EXISTS_MESSAGE = '标签 slug 已存在';
const TAG_IN_USE_MESSAGE = '标签已被文章引用，无法删除';

@Injectable()
export class TagsService {
  constructor(
    @InjectRepository(Tag)
    private readonly tagRepository: Repository<Tag>,
    @InjectRepository(ArticleTag)
    private readonly articleTagRepository: Repository<ArticleTag>,
    @InjectRepository(Article)
    private readonly articleRepository: Repository<Article>,
  ) {}

  async create(dto: CreateTagDto): Promise<Tag> {
    await this.ensureSlugUnique(dto.slug);

    const tag = this.tagRepository.create({
      name: dto.name.trim(),
      slug: dto.slug.trim(),
    });

    return this.tagRepository.save(tag);
  }

  async findAll(): Promise<Tag[]> {
    const tags = await this.tagRepository.find();

    return tags.sort((left, right) => {
      if (left.articleCount !== right.articleCount) {
        return right.articleCount - left.articleCount;
      }

      return left.name.localeCompare(right.name, 'zh-CN');
    });
  }

  async findById(id: string): Promise<Tag> {
    const tag = await this.tagRepository.findOne({ where: { id } });
    if (!tag) {
      throw new NotFoundException(TAG_NOT_FOUND_MESSAGE);
    }

    return tag;
  }

  async update(id: string, dto: UpdateTagDto): Promise<Tag> {
    const tag = await this.findById(id);

    if (dto.slug && dto.slug.trim() !== tag.slug) {
      await this.ensureSlugUnique(dto.slug, id);
    }

    const updatedTag: Tag = {
      ...tag,
      name: dto.name?.trim() ?? tag.name,
      slug: dto.slug?.trim() ?? tag.slug,
      updatedAt: new Date(),
    };

    return this.tagRepository.save(updatedTag);
  }

  async remove(id: string): Promise<{ message: string }> {
    const tag = await this.findById(id);
    const articleRelations = await this.articleTagRepository.find({ where: { tagId: id } });

    if (articleRelations.length > 0) {
      const articleIds = [...new Set(articleRelations.map(relation => relation.articleId))];
      const articles = await this.articleRepository.find();
      const hasActiveArticle = articles.some(
        article => articleIds.includes(article.id) && article.deletedAt === null,
      );

      if (hasActiveArticle) {
        throw new ConflictException(TAG_IN_USE_MESSAGE);
      }
    }

    await this.tagRepository.remove(tag);
    return { message: '标签删除成功' };
  }

  private async ensureSlugUnique(slug: string, currentId?: string): Promise<void> {
    const tag = await this.tagRepository.findOne({ where: { slug: slug.trim() } });
    if (tag && tag.id !== currentId) {
      throw new ConflictException(TAG_SLUG_EXISTS_MESSAGE);
    }
  }
}
