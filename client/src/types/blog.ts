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
  email: string | null;
  phone: string | null;
  nickname: string | null;
  avatar: string | null;
  bio: string | null;
  registrationType: RegisterType | "oauth";
  emailVerified: boolean;
  phoneVerified: boolean;
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

export type RegisterType = "email" | "phone";

export interface RegisterPayload {
  registerType: RegisterType;
  verificationToken: string;
  username: string;
  password: string;
  nickname?: string;
}

export interface RegistrationAvailabilityField {
  available: boolean;
  message: string | null;
  normalizedValue?: string | null;
}

export interface RegistrationAvailability {
  contact?: RegistrationAvailabilityField;
  username?: RegistrationAvailabilityField;
  nickname?: RegistrationAvailabilityField;
}

export interface RegistrationAvailabilityPayload {
  registerType?: RegisterType;
  contact?: string;
  username?: string;
  nickname?: string;
}

export interface SendRegistrationCodePayload {
  registerType: RegisterType;
  contact: string;
}

export interface RegistrationCodeSentResponse {
  registerType: RegisterType;
  maskedContact: string;
  expiresInSeconds: number;
  cooldownSeconds: number;
  debugCode?: string | null;
}

export interface VerifyRegistrationCodePayload {
  registerType: RegisterType;
  contact: string;
  code: string;
}

export interface RegistrationVerificationResponse {
  registerType: RegisterType;
  maskedContact: string;
  verificationToken: string;
  expiresIn: string;
}

export interface UserProfile {
  id: string;
  username: string;
  email: string | null;
  phone: string | null;
  nickname: string | null;
  avatar: string | null;
  bio: string | null;
  registrationType: RegisterType | "oauth";
  emailVerified: boolean;
  phoneVerified: boolean;
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

export type DatabaseCellValue =
  | string
  | number
  | boolean
  | null
  | Array<string | number | boolean | null | Record<string, unknown>>
  | Record<string, unknown>;

export interface DatabaseEngineStat {
  engine: string;
  tableCount: number;
  totalSize: number;
}

export interface DatabaseOverview {
  databaseName: string;
  charset: string | null;
  collation: string | null;
  tableCount: number;
  estimatedRowCount: number;
  dataSize: number;
  indexSize: number;
  totalSize: number;
  typeormEntityCount: number;
  engineStats: DatabaseEngineStat[];
}

export interface DatabaseTableSummary {
  tableName: string;
  engine: string | null;
  estimatedRowCount: number;
  dataSize: number;
  indexSize: number;
  totalSize: number;
  autoIncrement: number | null;
  collation: string | null;
  tableComment: string | null;
  createTime: string | null;
  updateTime: string | null;
  managedByTypeOrm: boolean;
  entityName: string | null;
}

export interface DatabaseTableColumn {
  columnName: string;
  ordinalPosition: number;
  dataType: string;
  columnType: string;
  nullable: boolean;
  primaryKey: boolean;
  unique: boolean;
  indexed: boolean;
  generated: boolean;
  creatable: boolean;
  editable: boolean;
  searchable: boolean;
  hasDefault: boolean;
  enumValues: string[];
  columnDefault: string | null;
  extra: string | null;
  columnComment: string | null;
  characterMaximumLength: number | null;
  numericPrecision: number | null;
  numericScale: number | null;
}

export interface DatabaseTableIndexColumn {
  columnName: string;
  collation: string | null;
  subPart: number | null;
}

export interface DatabaseTableIndex {
  indexName: string;
  unique: boolean;
  primary: boolean;
  indexType: string;
  columns: DatabaseTableIndexColumn[];
}

export interface DatabaseTableForeignKey {
  constraintName: string;
  columns: string[];
  referencedTableName: string;
  referencedColumns: string[];
  updateRule: string | null;
  deleteRule: string | null;
}

export interface DatabaseTableDetail {
  table: DatabaseTableSummary;
  columnCount: number;
  indexCount: number;
  foreignKeyCount: number;
  primaryKeyColumns: string[];
  searchableColumns: string[];
  canCreateRows: boolean;
  canUpdateRows: boolean;
  canDeleteRows: boolean;
  columns: DatabaseTableColumn[];
  indexes: DatabaseTableIndex[];
  foreignKeys: DatabaseTableForeignKey[];
}

export interface DatabaseTableRecord {
  primaryKey: Record<string, DatabaseCellValue>;
  values: Record<string, DatabaseCellValue>;
}

export interface DatabaseTableRowsPage {
  tableName: string;
  primaryKeyColumns: string[];
  searchableColumns: string[];
  canCreateRows: boolean;
  canUpdateRows: boolean;
  canDeleteRows: boolean;
  items: DatabaseTableRecord[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface DatabaseTableMutationResult {
  message: string;
  primaryKey?: Record<string, DatabaseCellValue>;
}
