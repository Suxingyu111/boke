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
  allowComment: boolean;
  viewCount: number;
  likes: number;
  commentCount: number;
  author: Author;
  category: Category;
  tags: Tag[];
  publishedAt: string;
  scheduledAt?: string;
  deletedAt?: string;
  seoTitle?: string | null;
  seoDescription?: string | null;
  seoKeywords?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LinkItem {
  id: string;
  name: string;
  url: string;
  description: string;
}

export interface SocialLink {
  label: string;
  url: string;
}

export interface TimelineItem {
  year: string;
  title: string;
  desc: string;
}

export interface AboutSettings {
  techStack: string[];
  timeline: TimelineItem[];
  contactEmail: string;
  githubUrl: string;
}

export type PageType = "about" | "custom" | "resume" | "portfolio";
export type PageStatus = "draft" | "published";

export interface CustomPage {
  id: string;
  title: string;
  slug: string;
  pageType: PageType;
  content: string;
  contentHtml?: string | null;
  summary?: string | null;
  isHomeVisible: boolean;
  status: PageStatus;
  seoTitle?: string | null;
  seoDescription?: string | null;
  publishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
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
  keywords: string;
  author: string;
  logo: string;
  favicon: string;
  ogImage: string;
  icp: string;
  copyright: string;
  socialLinks: SocialLink[];
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

export interface OAuthProviders {
  github: boolean;
  google: boolean;
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

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  nickname: string | null;
  avatar: string | null;
  bio: string | null;
  role: UserRole;
  createdAt: string;
  favoriteCount: number;
  commentCount: number;
}

export interface FavoriteArticle {
  id: string;
  favoritedAt: string;
  article: Pick<
    Article,
    | "id"
    | "title"
    | "slug"
    | "excerpt"
    | "coverImage"
    | "publishedAt"
    | "viewCount"
    | "category"
    | "author"
  >;
}

export type NotificationType = "reply" | "like" | "system";

export interface UserNotification {
  id: string;
  userId?: string;
  type: NotificationType;
  title: string;
  content: string | null;
  relatedId?: string | null;
  relatedType?: string | null;
  isRead: boolean;
  readAt?: string | null;
  createdAt: string;
}

export interface GuestbookMessage {
  id: string;
  nickname: string;
  email: string;
  content: string;
  createdAt: string;
  status: "published" | "pending";
}

export interface GuestbookEntryRecord {
  id: string;
  nickname: string;
  email?: string | null;
  website?: string | null;
  avatarUrl?: string | null;
  content: string;
  parentId: string | null;
  status: "approved" | "pending" | "rejected";
  isAdminReply?: boolean;
  createdAt: string;
  replies?: GuestbookEntryRecord[];
}

export interface GuestbookPageData {
  items: GuestbookEntryRecord[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface GuestbookCreateResult {
  id: string;
  nickname: string;
  content: string;
  createdAt: string;
  message: string;
}

export type CommentStatus = "pending" | "approved" | "spam" | "rejected";

export interface PublicComment {
  id: string;
  articleId: string;
  parentId: string | null;
  authorName: string;
  authorWebsite?: string | null;
  content: string;
  createdAt: string;
  repliedAt?: string | null;
  replies: PublicComment[];
}

export interface AdminComment {
  id: string;
  articleId: string;
  parentId: string | null;
  userId?: string | null;
  authorName: string;
  authorEmail: string;
  authorWebsite?: string | null;
  content: string;
  likeCount: number;
  status: CommentStatus;
  repliedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  article?: {
    id: string;
    title: string;
    slug: string;
  } | null;
}

export interface CommentPage<T = PublicComment> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface CommentPayload {
  authorName: string;
  authorEmail: string;
  authorWebsite?: string;
  parentId?: string;
  content: string;
}

export interface CommentReplyPayload {
  content: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  level: "info" | "warning" | "success";
  publishedAt: string;
  isActive: boolean;
  status?: "draft" | "published";
  isPinned?: boolean;
  createdAt?: string;
}

export interface AnnouncementRecord {
  id: string;
  title: string;
  content: string;
  status: "draft" | "published" | "archived";
  isPinned: boolean;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface AnnouncementPageData {
  items: AnnouncementRecord[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface VisitorStats {
  totalViews: number;
  uniqueVisitors: number;
  avgStaySeconds: number;
  topSources: Array<{ source: string; count: number }>;
  topPages: Array<{ path: string; title: string; views: number }>;
}
