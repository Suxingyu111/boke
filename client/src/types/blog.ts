export interface ApiResponse<T> {
  success: boolean;
  statusCode: number;
  message: string;
  data: T;
  errors?: string | string[] | null;
  timestamp: string;
}

export type ArticleStatus = "draft" | "scheduled" | "published" | "archived";
export type UserRole = "super_admin" | "admin" | "author" | "user";

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
  contentHtml?: string;
  coverImage: string;
  status: ArticleStatus;
  viewCount: number;
  likes: number;
  author: Author;
  category: Category;
  tags: Tag[];
  publishedAt: string;
  scheduledAt?: string;
  deletedAt?: string;
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

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  nickname: string | null;
  avatar: string | null;
  bio: string | null;
  isActive: boolean;
  role: UserRole;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  accessToken: string;
  tokenType: "Bearer";
  expiresIn: string;
  user: AuthUser;
}

export interface LoginPayload {
  account: string;
  password: string;
}

export interface RegisterPayload {
  username: string;
  email: string;
  password: string;
  nickname?: string;
}
