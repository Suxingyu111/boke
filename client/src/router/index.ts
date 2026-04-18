import {
  createRouter,
  createWebHistory,
  type RouteRecordRaw,
} from "vue-router";
import BlogLayout from "@/layouts/BlogLayout.vue";
import AdminLayout from "@/layouts/AdminLayout.vue";
import { getApiStatusCode } from "@/api/auth";
import { useAuthStore } from "@/stores/auth";
import HomeView from "@/views/HomeView.vue";
import ArticleDetailView from "@/views/ArticleDetailView.vue";
import CategoriesView from "@/views/CategoriesView.vue";
import TagsView from "@/views/TagsView.vue";
import AboutView from "@/views/AboutView.vue";
import LinksView from "@/views/LinksView.vue";
import GuestbookView from "@/views/GuestbookView.vue";
import ArchivesView from "@/views/ArchivesView.vue";
import PageDetailView from "@/views/PageDetailView.vue";
import ProfileView from "@/views/ProfileView.vue";
import SearchView from "@/views/SearchView.vue";
import ContentEcosystemView from "@/views/ContentEcosystemView.vue";
import SubscriptionStatusView from "@/views/SubscriptionStatusView.vue";
import LoginView from "@/views/admin/LoginView.vue";
import RegisterView from "@/views/admin/RegisterView.vue";
import DashboardView from "@/views/admin/DashboardView.vue";
import ArticleManageView from "@/views/admin/ArticleManageView.vue";
import PageManageView from "@/views/admin/PageManageView.vue";
import SettingsView from "@/views/admin/SettingsView.vue";
import ContentEcosystemManageView from "@/views/admin/ContentEcosystemManageView.vue";
import TechnicalView from "@/views/admin/TechnicalView.vue";

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
      { path: "tags", name: "tags", component: TagsView, meta: { title: "标签索引" } },
      { path: "about", name: "about", component: AboutView, meta: { title: "关于我" } },
      { path: "links", name: "links", component: LinksView, meta: { title: "友情链接" } },
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
        path: "ecosystem",
        name: "content-ecosystem",
        component: ContentEcosystemView,
        meta: { title: "内容生态" },
      },
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
  {
    path: "/profile",
    name: "profile",
    component: ProfileView,
    meta: { requiresAuth: true, title: "个人中心" },
  },
  {
    path: "/admin",
    component: AdminLayout,
    meta: { requiresAuth: true, requiresAdmin: true },
    children: [
      { path: "", name: "admin-dashboard", component: DashboardView },
      {
        path: "articles",
        name: "admin-articles",
        component: ArticleManageView,
      },
      {
        path: "pages",
        name: "admin-pages",
        component: PageManageView,
      },
      {
        path: "ecosystem",
        name: "admin-content-ecosystem",
        component: ContentEcosystemManageView,
      },
      { path: "settings", name: "admin-settings", component: SettingsView },
      {
        path: "technical",
        name: "admin-technical",
        component: TechnicalView,
      },
    ],
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

  if (authStore.token && !authStore.user) {
    try {
      await authStore.refreshCurrentUser();
    } catch {
      authStore.logout();
    }
  }

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    return {
      name: "login",
      query: { redirect: to.fullPath },
    };
  }

  if (to.meta.requiresAdmin && authStore.isAuthenticated) {
    try {
      await authStore.refreshCurrentAdminUser();
    } catch (error) {
      if (getApiStatusCode(error) === 401) {
        authStore.logout();
        return {
          name: "login",
          query: { redirect: to.fullPath },
        };
      }

      return { name: "home" };
    }

    if (!authStore.canAccessAdmin) {
      return { name: "home" };
    }
  }

  if (
    (to.name === "login" || to.name === "register") &&
    authStore.isAuthenticated
  ) {
    return authStore.canAccessAdmin
      ? { name: "admin-dashboard" }
      : { name: "home" };
  }
});

export default router;
