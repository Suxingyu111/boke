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
import PageDetailView from "@/views/PageDetailView.vue";
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

const routes: RouteRecordRaw[] = [
  {
    path: "/",
    component: BlogLayout,
    children: [
      { path: "", name: "home", component: HomeView },
      {
        path: "articles/:slug",
        name: "article-detail",
        component: ArticleDetailView,
      },
      { path: "categories", name: "categories", component: CategoriesView },
      { path: "tags", name: "tags", component: TagsView },
      { path: "about", name: "about", component: AboutView },
      { path: "links", name: "links", component: LinksView },
      { path: "pages/:slug", name: "page-detail", component: PageDetailView },
      { path: "search", name: "search", component: SearchView },
      {
        path: "ecosystem",
        name: "content-ecosystem",
        component: ContentEcosystemView,
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
