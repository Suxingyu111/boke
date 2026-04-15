import 'reflect-metadata';
import { getMetadataArgsStorage } from 'typeorm';
import { Article, ArticleTag, Category, Tag, User } from '../src/database/entities';

describe('entity column mapping', () => {
  const metadataStorage = getMetadataArgsStorage();
  const findColumn = (
    target: typeof User | typeof Article | typeof ArticleTag | typeof Category | typeof Tag,
    propertyName: string,
  ): ReturnType<typeof metadataStorage.columns.find> =>
    metadataStorage.columns.find(
      column => column.target === target && column.propertyName === propertyName,
    );
  const findColumnName = (
    target: typeof User | typeof Article | typeof ArticleTag | typeof Category | typeof Tag,
    propertyName: string,
  ): string | undefined =>
    findColumn(target, propertyName)?.options.name?.toString() ?? propertyName;

  it('User 实体应映射到 SQL 列名', () => {
    expect(findColumnName(User, 'password')).toBe('password_hash');
    expect(findColumnName(User, 'avatar')).toBe('avatar_url');
    expect(findColumnName(User, 'isActive')).toBe('status');
    expect(findColumn(User, 'password')?.options.select).toBe(false);
    expect(findColumn(User, 'role')?.options.default).toBe('user');
  });

  it('Article 实体应映射到 SQL 列名', () => {
    expect(findColumnName(Article, 'userId')).toBe('author_id');
    expect(findColumnName(Article, 'excerpt')).toBe('summary');
    expect(findColumnName(Article, 'coverImage')).toBe('cover_image_url');
    expect(findColumnName(Article, 'likes')).toBe('like_count');
  });

  it('Category 和 Tag 实体应映射到当前 SQL 列名', () => {
    expect(findColumnName(Category, 'articleCount')).toBe('article_count');
    expect(findColumnName(Tag, 'articleCount')).toBe('article_count');
  });

  it('ArticleTag 实体应映射到当前 SQL 列名', () => {
    expect(findColumnName(ArticleTag, 'articleId')).toBe('article_id');
    expect(findColumnName(ArticleTag, 'tagId')).toBe('tag_id');
  });
});