import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { Article, Category } from '@database/entities';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

const CATEGORY_NOT_FOUND_MESSAGE = '分类不存在';
const CATEGORY_SLUG_EXISTS_MESSAGE = '分类 slug 已存在';
const CATEGORY_IN_USE_MESSAGE = '分类下仍有文章，无法删除';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(Article)
    private readonly articleRepository: Repository<Article>,
  ) {}

  async create(dto: CreateCategoryDto): Promise<Category> {
    await this.ensureSlugUnique(dto.slug);

    const category = this.categoryRepository.create({
      name: dto.name.trim(),
      slug: dto.slug.trim(),
      description: dto.description?.trim() ?? null,
      sortOrder: dto.sortOrder ?? 0,
      isVisible: dto.isVisible ?? true,
      color: dto.color ?? '#000000',
    });

    return this.categoryRepository.save(category);
  }

  async findAll(options?: { visibleOnly?: boolean }): Promise<Category[]> {
    const categories = await this.categoryRepository.find();

    return categories
      .filter(category => !options?.visibleOnly || category.isVisible)
      .sort((left, right) => {
        if (left.sortOrder !== right.sortOrder) {
          return left.sortOrder - right.sortOrder;
        }

        return left.name.localeCompare(right.name, 'zh-CN');
      });
  }

  async findById(id: string): Promise<Category> {
    const category = await this.categoryRepository.findOne({ where: { id } });
    if (!category) {
      throw new NotFoundException(CATEGORY_NOT_FOUND_MESSAGE);
    }

    return category;
  }

  async update(id: string, dto: UpdateCategoryDto): Promise<Category> {
    const category = await this.findById(id);

    if (dto.slug && dto.slug.trim() !== category.slug) {
      await this.ensureSlugUnique(dto.slug, id);
    }

    const updatedCategory: Category = {
      ...category,
      name: dto.name?.trim() ?? category.name,
      slug: dto.slug?.trim() ?? category.slug,
      description:
        dto.description !== undefined ? (dto.description?.trim() ?? null) : category.description,
      sortOrder: dto.sortOrder ?? category.sortOrder,
      isVisible: dto.isVisible ?? category.isVisible,
      color: dto.color ?? category.color,
      updatedAt: new Date(),
    };

    return this.categoryRepository.save(updatedCategory);
  }

  async remove(id: string): Promise<{ message: string }> {
    const category = await this.findById(id);
    const articleCount = await this.articleRepository.count({
      where: {
        categoryId: id,
        deletedAt: IsNull(),
      },
    });

    if (articleCount > 0) {
      throw new ConflictException(CATEGORY_IN_USE_MESSAGE);
    }

    await this.categoryRepository.remove(category);
    return { message: '分类删除成功' };
  }

  private async ensureSlugUnique(slug: string, currentId?: string): Promise<void> {
    const category = await this.categoryRepository.findOne({ where: { slug: slug.trim() } });
    if (category && category.id !== currentId) {
      throw new ConflictException(CATEGORY_SLUG_EXISTS_MESSAGE);
    }
  }
}
