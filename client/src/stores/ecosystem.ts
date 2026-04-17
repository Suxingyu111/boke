import { defineStore } from "pinia";
import { getApiErrorMessage } from "@/api/auth";
import * as ecosystemApi from "@/api/ecosystem";

export const useEcosystemStore = defineStore("ecosystem", {
  state: () => ({
    archiveMonths: [] as ecosystemApi.ArchiveMonth[],
    selectedArchive: null as ecosystemApi.ArchiveGroup | null,
    searchResults: [] as ecosystemApi.SearchResultItem[],
    searchMeta: {
      total: 0,
      page: 1,
      pageSize: 10,
      totalPages: 0,
    },
    paidInfo: null as ecosystemApi.PaidContentInfo | null,
    paidContent: null as ecosystemApi.PaidArticleContent | null,
    purchaseRecords: [] as ecosystemApi.PurchaseRecord[],
    myPurchases: [] as ecosystemApi.PurchaseRecord[],
    collaborators: [] as ecosystemApi.DraftCollaborator[],
    editHistory: [] as ecosystemApi.DraftEditLog[],
    notifications: [] as ecosystemApi.EmailNotification[],
    subscribers: [] as ecosystemApi.EmailSubscriber[],
    notificationMeta: {
      total: 0,
      page: 1,
      pageSize: 20,
      totalPages: 0,
    },
    subscriberMeta: {
      total: 0,
      page: 1,
      pageSize: 20,
      totalPages: 0,
    },
    loading: false,
    adminLoading: false,
    errorMessage: "",
    notice: "",
  }),
  getters: {
    latestArchiveMonth: (state) => state.archiveMonths[0] ?? null,
    hasPaidAccess: (state) => state.paidContent?.hasAccess ?? true,
  },
  actions: {
    async loadArchives() {
      this.loading = true;
      this.errorMessage = "";
      try {
        this.archiveMonths = await ecosystemApi.getArchiveSummary();
        const first = this.archiveMonths[0];
        if (first) {
          this.selectedArchive = await ecosystemApi.getArchiveArticles(
            first.year,
            first.month,
          );
        } else {
          this.selectedArchive = null;
        }
      } catch (error) {
        this.errorMessage = getApiErrorMessage(error, "归档接口加载失败");
        throw error;
      } finally {
        this.loading = false;
      }
    },
    async loadArchiveArticles(year: number, month: number) {
      this.loading = true;
      this.errorMessage = "";
      try {
        this.selectedArchive = await ecosystemApi.getArchiveArticles(
          year,
          month,
        );
        return this.selectedArchive;
      } catch (error) {
        this.errorMessage = getApiErrorMessage(error, "归档文章加载失败");
        throw error;
      } finally {
        this.loading = false;
      }
    },
    async searchArticles(query: ecosystemApi.SearchQuery = {}) {
      this.loading = true;
      this.errorMessage = "";
      try {
        const result = await ecosystemApi.searchArticles({
          page: 1,
          pageSize: 10,
          ...query,
        });
        this.searchResults = result.items;
        this.searchMeta = {
          total: result.total,
          page: result.page,
          pageSize: result.pageSize,
          totalPages: result.totalPages,
        };
        return result;
      } catch (error) {
        this.errorMessage = getApiErrorMessage(error, "全文搜索接口加载失败");
        throw error;
      } finally {
        this.loading = false;
      }
    },
    async subscribe(payload: ecosystemApi.SubscriptionPayload) {
      this.loading = true;
      this.errorMessage = "";
      this.notice = "";
      try {
        const result = await ecosystemApi.subscribe(payload);
        this.notice = result.message || "订阅请求已提交，请查看邮箱确认";
        return result;
      } catch (error) {
        this.errorMessage = getApiErrorMessage(error, "订阅提交失败");
        throw error;
      } finally {
        this.loading = false;
      }
    },
    async confirmSubscription(token: string) {
      this.loading = true;
      this.errorMessage = "";
      this.notice = "";
      try {
        const result = await ecosystemApi.confirmSubscription(token);
        this.notice = result.message || "订阅确认成功";
        return result;
      } catch (error) {
        this.errorMessage = getApiErrorMessage(error, "订阅确认失败");
        throw error;
      } finally {
        this.loading = false;
      }
    },
    async unsubscribe(token: string) {
      this.loading = true;
      this.errorMessage = "";
      this.notice = "";
      try {
        const result = await ecosystemApi.unsubscribe(token);
        this.notice = result.message || "已成功取消订阅";
        return result;
      } catch (error) {
        this.errorMessage = getApiErrorMessage(error, "取消订阅失败");
        throw error;
      } finally {
        this.loading = false;
      }
    },
    async loadPaidArticle(articleId: string) {
      this.loading = true;
      this.errorMessage = "";
      try {
        const [info, content] = await Promise.all([
          ecosystemApi.getPaidInfo(articleId),
          ecosystemApi.getPaidArticleContent(articleId),
        ]);
        this.paidInfo = info;
        this.paidContent = content;
        return { info, content };
      } catch (error) {
        this.errorMessage = getApiErrorMessage(error, "付费内容接口加载失败");
        throw error;
      } finally {
        this.loading = false;
      }
    },
    async purchaseArticle(articleId: string) {
      this.loading = true;
      this.errorMessage = "";
      this.notice = "";
      try {
        const result = await ecosystemApi.purchaseArticle({
          articleId,
          paymentMethod: "manual",
        });
        this.notice = "购买记录已创建";
        await this.loadPaidArticle(articleId);
        return result;
      } catch (error) {
        this.errorMessage = getApiErrorMessage(error, "购买文章失败");
        throw error;
      } finally {
        this.loading = false;
      }
    },
    async loadMyPurchases() {
      this.loading = true;
      this.errorMessage = "";
      try {
        this.myPurchases = await ecosystemApi.getMyPurchases();
      } catch (error) {
        this.errorMessage = getApiErrorMessage(error, "购买列表加载失败");
        throw error;
      } finally {
        this.loading = false;
      }
    },
    async rebuildSearchIndex() {
      this.adminLoading = true;
      this.errorMessage = "";
      this.notice = "";
      try {
        const result = await ecosystemApi.rebuildSearchIndex();
        this.notice = `索引重建完成：成功 ${result.indexed}，失败 ${result.failed}`;
        return result;
      } catch (error) {
        this.errorMessage = getApiErrorMessage(error, "搜索索引重建失败");
        throw error;
      } finally {
        this.adminLoading = false;
      }
    },
    async loadCollaboration(articleId: string) {
      this.adminLoading = true;
      this.errorMessage = "";
      try {
        const [collaborators, history] = await Promise.all([
          ecosystemApi.getCollaborators(articleId),
          ecosystemApi.getEditHistory(articleId),
        ]);
        this.collaborators = collaborators;
        this.editHistory = history;
      } catch (error) {
        this.errorMessage = getApiErrorMessage(error, "协作信息加载失败");
        throw error;
      } finally {
        this.adminLoading = false;
      }
    },
    async addCollaborator(
      articleId: string,
      payload: ecosystemApi.CollaboratorPayload,
    ) {
      await ecosystemApi.addCollaborator(articleId, payload);
      await this.loadCollaboration(articleId);
      this.notice = "协作者已添加";
    },
    async removeCollaborator(articleId: string, collaboratorId: string) {
      await ecosystemApi.removeCollaborator(articleId, collaboratorId);
      await this.loadCollaboration(articleId);
      this.notice = "协作者已移除";
    },
    async updateDraft(
      articleId: string,
      payload: ecosystemApi.DraftUpdatePayload,
    ) {
      await ecosystemApi.updateDraft(articleId, payload);
      await this.loadCollaboration(articleId);
      this.notice = "协作草稿已保存";
    },
    async setPaidContent(
      articleId: string,
      payload: ecosystemApi.PaidContentPayload,
    ) {
      await ecosystemApi.setPaidContent(articleId, payload);
      await this.loadPurchaseRecords(articleId);
      this.notice = "付费内容设置已保存";
    },
    async removePaidContent(articleId: string) {
      await ecosystemApi.removePaidContent(articleId);
      this.purchaseRecords = [];
      this.notice = "付费设置已移除";
    },
    async loadPurchaseRecords(articleId: string) {
      this.adminLoading = true;
      this.errorMessage = "";
      try {
        this.purchaseRecords = await ecosystemApi.getPurchaseRecords(articleId);
      } catch (error) {
        this.errorMessage = getApiErrorMessage(error, "购买记录加载失败");
        throw error;
      } finally {
        this.adminLoading = false;
      }
    },
    async sendNotification(payload: ecosystemApi.NotificationPayload) {
      await ecosystemApi.sendNotification(payload);
      await this.loadNotifications();
      this.notice = "通知已写入发送队列";
    },
    async notifySubscribers(payload: ecosystemApi.NotifySubscribersPayload) {
      const result = await ecosystemApi.notifySubscribers(payload);
      await this.loadNotifications();
      this.notice = `订阅通知完成：发送 ${result.sent}，失败 ${result.failed}`;
      return result;
    },
    async retryFailedNotifications() {
      const result = await ecosystemApi.retryFailedNotifications();
      await this.loadNotifications();
      this.notice = `已重试 ${result.retried} 条失败通知`;
      return result;
    },
    async loadNotifications(page = 1) {
      this.adminLoading = true;
      this.errorMessage = "";
      try {
        const result = await ecosystemApi.getNotifications(page, 20);
        this.notifications = result.items;
        this.notificationMeta = {
          total: result.total,
          page: result.page,
          pageSize: result.pageSize,
          totalPages: result.totalPages,
        };
      } catch (error) {
        this.errorMessage = getApiErrorMessage(error, "通知记录加载失败");
        throw error;
      } finally {
        this.adminLoading = false;
      }
    },
    async loadSubscribers(page = 1) {
      this.adminLoading = true;
      this.errorMessage = "";
      try {
        const result = await ecosystemApi.getSubscribers(page, 20);
        this.subscribers = result.items;
        this.subscriberMeta = {
          total: result.total,
          page: result.page,
          pageSize: result.pageSize,
          totalPages: result.totalPages,
        };
      } catch (error) {
        this.errorMessage = getApiErrorMessage(error, "订阅者列表加载失败");
        throw error;
      } finally {
        this.adminLoading = false;
      }
    },
    async removeSubscriber(id: string) {
      await ecosystemApi.removeSubscriber(id);
      await this.loadSubscribers(this.subscriberMeta.page);
      this.notice = "订阅者已删除";
    },
  },
});
