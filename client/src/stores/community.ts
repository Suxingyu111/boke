import { defineStore } from "pinia";
import { getApiErrorMessage } from "@/api/auth";
import * as communityApi from "@/api/community";
import * as visitorStatsApi from "@/api/visitor-stats";
import type {
  Announcement,
  GuestbookMessage,
  VisitorStats,
} from "@/types/blog";

export const useCommunityStore = defineStore("community", {
  state: () => ({
    announcements: [] as Announcement[],
    guestbookMessages: [] as GuestbookMessage[],
    visitorStats: null as VisitorStats | null,
    loading: false,
    saving: false,
    errorMessage: "",
    notice: "",
  }),
  actions: {
    async loadPublicCommunity() {
      this.loading = true;
      this.errorMessage = "";
      try {
        this.announcements = await communityApi.getAnnouncements();
        this.visitorStats = null;
      } catch (error) {
        this.errorMessage = getApiErrorMessage(error, "社区数据暂不可用");
      } finally {
        this.loading = false;
      }
    },
    async loadGuestbook() {
      this.loading = true;
      this.errorMessage = "";
      try {
        this.guestbookMessages = await communityApi.getGuestbookMessages();
      } catch (error) {
        this.errorMessage = getApiErrorMessage(error, "留言板暂不可用");
      } finally {
        this.loading = false;
      }
    },
    async submitGuestbookMessage(payload: {
      nickname: string;
      email: string;
      content: string;
    }) {
      this.saving = true;
      this.notice = "";
      this.errorMessage = "";
      try {
        const message = await communityApi.createGuestbookMessage(payload);
        this.guestbookMessages.unshift(message);
        this.notice = "留言已提交，审核通过后会展示在留言板。";
        return message;
      } catch (error) {
        this.errorMessage = getApiErrorMessage(error, "留言提交失败");
        return null;
      } finally {
        this.saving = false;
      }
    },
    async loadAdminVisitorStats(days = 30) {
      this.loading = true;
      this.errorMessage = "";
      try {
        const [today, topPages, referers] = await Promise.all([
          visitorStatsApi.getTodayVisitorStats(),
          visitorStatsApi.getTopPages(10, days),
          visitorStatsApi.getRefererStats(days),
        ]);

        this.visitorStats = {
          totalViews: today.totalVisits,
          uniqueVisitors: today.uniqueVisitors,
          avgStaySeconds: today.avgStayDuration,
          topSources: referers.map((item) => ({
            source: item.referer || "direct",
            count: item.visits,
          })),
          topPages: topPages.map((item) => ({
            path: item.path,
            title: item.path,
            views: item.visits,
          })),
        };
      } catch (error) {
        this.visitorStats = null;
        this.errorMessage = getApiErrorMessage(error, "访客统计接口加载失败");
        throw error;
      } finally {
        this.loading = false;
      }
    },
  },
});
