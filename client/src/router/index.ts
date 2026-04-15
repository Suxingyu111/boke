import {
  createRouter,
  createWebHistory,
  type RouteRecordRaw,
} from "vue-router";
import BlogLayout from "@/layouts/BlogLayout.vue";
import AdminLayout from "@/layouts/AdminLayout.vue";
import HomeView from "@/views/HomeView.vue";
import ArticleDetailView from "@/views/ArticleDetailView.vue";
import CategoriesView from "@/views/CategoriesView.vue";
import TagsView from "@/views/TagsView.vue";
import AboutView from "@/views/AboutView.vue";
import LinksView from "@/views/LinksView.vue";
import SearchView from "@/views/SearchView.vue";
import LoginView from "@/views/admin/LoginView.vue";
import DashboardView from "@/views/admin/DashboardView.vue";
import ArticleManageView from "@/views/admin/ArticleManageView.vue";
import SettingsView from "@/views/admin/SettingsView.vue";

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
      { path: "search", name: "search", component: SearchView },
    ],
  },
  { path: "/login", name: "login", component: LoginView },
  {
    path: "/admin",
    component: AdminLayout,
    children: [
      { path: "", name: "admin-dashboard", component: DashboardView },
      {
        path: "articles",
        name: "admin-articles",
        component: ArticleManageView,
      },
      { path: "settings", name: "admin-settings", component: SettingsView },
    ],
  },
];

export default createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 };
  },
});
