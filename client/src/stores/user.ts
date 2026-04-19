import { defineStore } from "pinia";
import { getApiErrorMessage } from "@/api/auth";
import * as favoritesApi from "@/api/favorites";
import * as notificationsApi from "@/api/notifications";
import * as usersApi from "@/api/users";
import type {
  FavoriteArticle,
  UserNotification,
  UserProfile,
} from "@/types/blog";

export const useUserStore = defineStore("user", {
  state: () => ({
    profile: null as UserProfile | null,
    favorites: [] as FavoriteArticle[],
    favoriteState: {} as Record<string, boolean>,
    notifications: [] as UserNotification[],
    unreadCount: 0,
    loading: false,
    saving: false,
    avatarUploading: false,
    errorMessage: "",
    notice: "",
  }),
  actions: {
    async loadProfile() {
      this.loading = true;
      this.errorMessage = "";
      try {
        this.profile = await usersApi.getProfile();
      } catch (error) {
        this.errorMessage = getApiErrorMessage(error, "个人资料加载失败");
      } finally {
        this.loading = false;
      }
    },
    async updateProfile(payload: usersApi.UpdateProfilePayload) {
      this.saving = true;
      this.notice = "";
      this.errorMessage = "";
      try {
        const result = await usersApi.updateProfile(payload);
        // 合并而非替换，避免丢失 favoriteCount / commentCount 等字段
        this.profile = { ...this.profile, ...result } as UserProfile;
        this.notice = "个人资料已保存";
        return true;
      } catch (error) {
        this.errorMessage = getApiErrorMessage(error, "个人资料保存失败");
        return false;
      } finally {
        this.saving = false;
      }
    },
    async uploadAvatar(file: File) {
      this.avatarUploading = true;
      this.notice = "";
      this.errorMessage = "";
      try {
        const result = await usersApi.uploadAvatar(file);
        if (this.profile) {
          this.profile = { ...this.profile, avatar: result.url };
        }
        this.notice = "头像上传成功";
        return result.url;
      } catch (error) {
        this.errorMessage = getApiErrorMessage(error, "头像上传失败");
        return null;
      } finally {
        this.avatarUploading = false;
      }
    },
    async changePassword(payload: usersApi.ChangePasswordPayload) {
      this.saving = true;
      this.notice = "";
      this.errorMessage = "";
      try {
        const result = await usersApi.changePassword(payload);
        this.notice = result.message || "密码已修改";
        return true;
      } catch (error) {
        this.errorMessage = getApiErrorMessage(error, "密码修改失败");
        return false;
      } finally {
        this.saving = false;
      }
    },
    async loadFavorites() {
      this.loading = true;
      this.errorMessage = "";
      try {
        const result = await usersApi.getFavoriteArticles();
        this.favorites = result.items;
        this.favoriteState = result.items.reduce<Record<string, boolean>>(
          (state, item) => {
            state[item.article.id] = true;
            return state;
          },
          { ...this.favoriteState },
        );
      } catch (error) {
        this.errorMessage = getApiErrorMessage(error, "收藏列表加载失败");
      } finally {
        this.loading = false;
      }
    },
    async checkFavorite(articleId: string) {
      try {
        this.favoriteState[articleId] = await favoritesApi.checkFavorite(articleId);
      } catch {
        this.favoriteState[articleId] = false;
      }
    },
    async toggleFavorite(articleId: string) {
      this.notice = "";
      this.errorMessage = "";
      const isFavorited = Boolean(this.favoriteState[articleId]);
      try {
        if (isFavorited) {
          await favoritesApi.removeFavorite(articleId);
          this.favoriteState[articleId] = false;
          this.notice = "已取消收藏";
        } else {
          await favoritesApi.addFavorite(articleId);
          this.favoriteState[articleId] = true;
          this.notice = "已收藏文章";
        }
        await this.loadFavorites();
      } catch (error) {
        this.errorMessage = getApiErrorMessage(error, "收藏操作失败");
      }
    },
    async loadNotifications() {
      this.loading = true;
      this.errorMessage = "";
      try {
        const result = await notificationsApi.getNotifications();
        this.notifications = result.items;
        this.unreadCount = result.unreadCount;
      } catch (error) {
        this.errorMessage = getApiErrorMessage(error, "通知加载失败");
      } finally {
        this.loading = false;
      }
    },
    async loadUnreadCount() {
      try {
        this.unreadCount = await notificationsApi.getUnreadCount();
      } catch {
        this.unreadCount = 0;
      }
    },
    async markNotificationRead(id: string) {
      await notificationsApi.markAsRead(id);
      await this.loadNotifications();
    },
    async markAllNotificationsRead() {
      await notificationsApi.markAllAsRead();
      await this.loadNotifications();
    },
    async deleteNotification(id: string) {
      await notificationsApi.deleteNotification(id);
      await this.loadNotifications();
    },
  },
});
