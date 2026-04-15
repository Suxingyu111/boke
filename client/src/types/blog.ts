export interface ApiResponse<T> {
  success: boolean;
  statusCode: number;
  data: T;
  timestamp: string;
}

export type ArticleStatus = "draft" | "published" | "archived";
export type UserRole = "admin" | "user";

export interface Author {
  id: string;
  username: string;
  nickname: string;
  avatar?: string;
  bio?: string;
  role: UserRole;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  articleCount: number;
  color: string;
}

export interface Tag {
  id: string;
  name: string;
  slug: string;
  articleCount: number;
}

export interface Article {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverImage: string;
  status: ArticleStatus;
  viewCount: number;
  likes: number;
  author: Author;
  category: Category;
  tags: Tag[];
  publishedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface LinkItem {
  id: string;
  name: string;
  url: string;
  description: string;
}

export interface SiteStats {
  articles: number;
  views: number;
  comments: number;
}

export interface SiteSettings {
  title: string;
  subtitle: string;
  description: string;
  icp: string;
  copyright: string;
}
