import {
  createRouter,
  createWebHistory,
  type RouteRecordRaw,
} from "vue-router";
import BlogLayout from "@/layouts/BlogLayout.vue";
import { useAuthStore } from "@/stores/auth";
import { getDefaultAuthorizedRoute, hasMinimumRole, resolveMinimumRole } from "@/utils/permissions";
import HomeView from "@/views/HomeView.vue";

// 懒加载：非首屏路由按需加载，减少首屏 JS 体积
const AdminLayout = () => import("@/layouts/AdminLayout.vue");
const ArticleDetailView = () => import("@/views/ArticleDetailView.vue");
const CategoriesView = () => import("@/views/CategoriesView.vue");
const AboutView = () => import("@/views/AboutView.vue");
const GuestbookView = () => import("@/views/GuestbookView.vue");
const ArchivesView = () => import("@/views/ArchivesView.vue");
const PageDetailView = () => import("@/views/PageDetailView.vue");
const ProfileView = () => import("@/views/ProfileView.vue");
const SearchView = () => import("@/views/SearchView.vue");
const NotFoundView = () => import("@/views/NotFoundView.vue");
const OAuthCallbackView = () => import("@/views/OAuthCallbackView.vue");
const SubscriptionStatusView = () =>
  import("@/views/SubscriptionStatusView.vue");
const LoginView = () => import("@/views/admin/LoginView.vue");
const RegisterView = () => import("@/views/admin/RegisterView.vue");
const DashboardView = () => import("@/views/admin/DashboardView.vue");
const ArticleManageView = () => import("@/views/admin/ArticleManageView.vue");
const CommentManageView = () => import("@/views/admin/CommentManageView.vue");
const PageManageView = () => import("@/views/admin/PageManageView.vue");
const SettingsView = () => import("@/views/admin/SettingsView.vue");
const TechnicalView = () => import("@/views/admin/TechnicalView.vue");
const DatabaseManageView = () => import("@/views/admin/DatabaseManageView.vue");

const routes: RouteRecordRaw[] = [
  {
    path: "/",
    component: BlogLayout,
    children: [
      { path: "", name: "home", component: HomeView, meta: { title: "首页" } },
      {
        path: "articles/:slug",
        name: "article-detail",
        component: ArticleDetailView,
      },
      {
        path: "categories",
        name: "categories",
        component: CategoriesView,
        meta: { title: "文章分类" },
      },
      { path: "tags", name: "tags", redirect: "/categories" },
      { path: "about", name: "about", component: AboutView, meta: { title: "关于我" } },
      {
        path: "guestbook",
        name: "guestbook",
        component: GuestbookView,
        meta: { title: "留言板" },
      },
      {
        path: "archives",
        name: "archives",
        component: ArchivesView,
        meta: { title: "文章归档" },
      },
      { path: "pages/:slug", name: "page-detail", component: PageDetailView },
      { path: "search", name: "search", component: SearchView, meta: { title: "搜索文章" } },
      {
        path: "subscriptions/confirm/:token",
        name: "subscription-confirm",
        component: SubscriptionStatusView,
      },
      {
        path: "unsubscribe",
        name: "subscription-unsubscribe",
        component: SubscriptionStatusView,
      },
    ],
  },
  { path: "/login", name: "login", component: LoginView },
  { path: "/register", name: "register", component: RegisterView },
  { path: "/oauth/callback", name: "oauth-callback", component: OAuthCallbackView },
  {
    path: "/profile",
    name: "profile",
    component: ProfileView,
    meta: { requiresAuth: true, title: "个人中心" },
  },
  {
    path: "/admin",
    component: AdminLayout,
    meta: { requiresAuth: true },
    children: [
      {
        path: "",
        name: "admin-dashboard",
        component: DashboardView,
        meta: { minRole: "admin" },
      },
      {
        path: "articles",
        name: "admin-articles",
        component: ArticleManageView,
        meta: { minRole: "author" },
      },
      {
        path: "comments",
        name: "admin-comments",
        component: CommentManageView,
        meta: { minRole: "admin" },
      },
      {
        path: "pages",
        name: "admin-pages",
        component: PageManageView,
        meta: { minRole: "admin" },
      },
      {
        path: "settings",
        name: "admin-settings",
        component: SettingsView,
        meta: { minRole: "admin" },
      },
      {
        path: "technical",
        name: "admin-technical",
        component: TechnicalView,
        meta: { minRole: "admin" },
      },
      {
        path: "database",
        name: "admin-database",
        component: DatabaseManageView,
        meta: { minRole: "super_admin" },
      },
    ],
  },
  {
    path: "/:pathMatch(.*)*",
    name: "not-found",
    component: NotFoundView,
    meta: { title: "页面不存在" },
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 };
  },
});

router.beforeEach(async (to) => {
  const authStore = useAuthStore();
  const requiresAuth = to.matched.some((record) => record.meta.requiresAuth);
  const minimumRole = resolveMinimumRole(
    to.matched.map((record) => record.meta.minRole),
  );

  if (authStore.isAuthenticated && !authStore.user) {
    try {
      await authStore.refreshCurrentUser();
    } catch {
      await authStore.logout();
    }
  }

  if ((requiresAuth || minimumRole) && !authStore.isAuthenticated) {
    return {
      name: "login",
      query: { redirect: to.fullPath },
    };
  }

  if (
    (to.name === "login" || to.name === "register") &&
    authStore.isAuthenticated
  ) {
    return getDefaultAuthorizedRoute(authStore.user);
  }

  if (
    minimumRole &&
    authStore.isAuthenticated &&
    !hasMinimumRole(authStore.user, minimumRole)
  ) {
    return authStore.canAccessManagement
      ? getDefaultAuthorizedRoute(authStore.user)
      : { name: "home" };
  }
});

export default router;
