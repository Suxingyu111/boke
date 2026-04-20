<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import { getApiErrorMessage } from "@/api/auth";
import ConfirmDialog from "@/components/ConfirmDialog.vue";
import EmptyState from "@/components/EmptyState.vue";
import Pagination from "@/components/Pagination.vue";
import {
  deleteComment,
  getAdminComments,
  replyComment,
  updateCommentStatus,
} from "@/api/comments";
import { useContentStore } from "@/stores/content";
import type { AdminComment, CommentStatus } from "@/types/blog";

type StatusFilter = CommentStatus | "all";

interface ConfirmRequest {
  title: string;
  message: string;
  confirmLabel: string;
  variant?: "primary" | "danger";
  action: () => Promise<void>;
}

const pageSize = 10;
const contentStore = useContentStore();
const comments = ref<AdminComment[]>([]);
const loading = ref(false);
const submittingId = ref("");
const page = ref(1);
const total = ref(0);
const totalPages = ref(1);
const notice = ref("");
const errorMessage = ref("");
const activeReplyId = ref("");
const statusFilter = ref<StatusFilter>("all");
const articleFilter = ref("all");
const replyDrafts = reactive<Record<string, string>>({});
const confirmRequest = ref<ConfirmRequest | null>(null);
const confirmLoading = ref(false);

const articleMap = computed(
  () => new Map(contentStore.articles.map((article) => [article.id, article])),
);

const articleOptions = computed(() =>
  [...contentStore.articles].sort((left, right) =>
    right.updatedAt.localeCompare(left.updatedAt),
  ),
);

const stats = computed(() => ({
  current: total.value,
  pending: comments.value.filter((comment) => comment.status === "pending")
    .length,
  unreplied: comments.value.filter(
    (comment) => !comment.parentId && !comment.repliedAt,
  ).length,
}));

function formatDate(value?: string | null) {
  if (!value) {
    return "未设置";
  }

  return new Date(value).toLocaleString("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function statusLabel(status: CommentStatus) {
  if (status === "approved") {
    return "已通过";
  }
  if (status === "pending") {
    return "待审核";
  }
  if (status === "spam") {
    return "垃圾评论";
  }
  return "已拒绝";
}

function statusClass(status: CommentStatus) {
  if (status === "approved") {
    return "border-moss/30 bg-moss/5 text-moss";
  }
  if (status === "pending") {
    return "border-cobalt/30 bg-cobalt/5 text-cobalt";
  }
  if (status === "spam") {
    return "border-coral/30 bg-coral/5 text-coral";
  }
  return "border-ink/15 bg-paper text-ink/58";
}

function getArticleTitle(comment: AdminComment) {
  return comment.article?.title || articleMap.value.get(comment.articleId)?.title || "未知文章";
}

function getArticleSlug(comment: AdminComment) {
  return comment.article?.slug || articleMap.value.get(comment.articleId)?.slug || "";
}

async function loadCommentData() {
  loading.value = true;
  errorMessage.value = "";

  try {
    const data = await getAdminComments({
      page: page.value,
      pageSize,
      status: statusFilter.value === "all" ? undefined : statusFilter.value,
      articleId: articleFilter.value === "all" ? undefined : articleFilter.value,
    });

    comments.value = data.items;
    total.value = data.total;
    totalPages.value = data.totalPages;
  } catch (error) {
    errorMessage.value = getApiErrorMessage(error, "评论列表加载失败");
  } finally {
    loading.value = false;
  }
}

async function loadArticleContext() {
  try {
    await contentStore.loadAdminContent();
  } catch {
    // 评论管理页只依赖文章标题映射，加载失败时仍可继续工作。
  }
}

async function refreshPageContext() {
  await loadCommentData();
}

async function changeStatus(comment: AdminComment, status: CommentStatus) {
  if (comment.status === status) {
    return;
  }

  submittingId.value = comment.id;
  errorMessage.value = "";

  try {
    const result = await updateCommentStatus(comment.id, status);
    notice.value = result.message;
    await refreshPageContext();
  } catch (error) {
    errorMessage.value = getApiErrorMessage(error, "评论状态更新失败");
  } finally {
    submittingId.value = "";
  }
}

function toggleReply(comment: AdminComment) {
  activeReplyId.value = activeReplyId.value === comment.id ? "" : comment.id;
  replyDrafts[comment.id] = replyDrafts[comment.id] || "";
}

async function submitReply(comment: AdminComment) {
  const content = (replyDrafts[comment.id] || "").trim();
  if (content.length < 2) {
    errorMessage.value = "回复内容至少需要 2 个字符。";
    return;
  }

  submittingId.value = comment.id;
  errorMessage.value = "";

  try {
    await replyComment(comment.id, { content });
    notice.value = "管理员回复已发布。";
    replyDrafts[comment.id] = "";
    activeReplyId.value = "";
    await refreshPageContext();
  } catch (error) {
    errorMessage.value = getApiErrorMessage(error, "评论回复失败");
  } finally {
    submittingId.value = "";
  }
}

async function removeCommentRecord(comment: AdminComment) {
  confirmRequest.value = {
    title: "删除评论",
    message: `确认删除 ${comment.authorName} 的这条评论？其子回复也会一起删除。`,
    confirmLabel: "确认删除",
    variant: "danger",
    action: async () => {
      submittingId.value = comment.id;
      errorMessage.value = "";

      try {
        const result = await deleteComment(comment.id);
        notice.value = result.message;
        if (comments.value.length === 1 && page.value > 1) {
          page.value -= 1;
        }
        await refreshPageContext();
      } catch (error) {
        errorMessage.value = getApiErrorMessage(error, "评论删除失败");
        throw error;
      } finally {
        submittingId.value = "";
      }
    },
  };
}

function closeConfirmDialog() {
  if (!confirmLoading.value) {
    confirmRequest.value = null;
  }
}

async function executeConfirmDialog() {
  if (!confirmRequest.value) {
    return;
  }

  confirmLoading.value = true;
  try {
    await confirmRequest.value.action();
    confirmRequest.value = null;
  } finally {
    confirmLoading.value = false;
  }
}

watch([statusFilter, articleFilter], () => {
  if (page.value === 1) {
    void loadCommentData();
    return;
  }

  page.value = 1;
});

watch(page, () => {
  void loadCommentData();
});

onMounted(async () => {
  await Promise.allSettled([loadCommentData(), loadArticleContext()]);
});
</script>

<template>
  <div>
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p class="eyebrow">Moderation</p>
        <h1 class="mt-2 font-display text-5xl text-brand">评论管理</h1>
        <p class="mt-3 max-w-2xl text-ink/65">
          审核公开评论、发布管理员回复，并处理无效或垃圾内容。
        </p>
      </div>
    </div>

    <p
      v-if="notice"
      class="mt-5 rounded-md border border-moss bg-white px-4 py-3 text-sm font-medium text-moss shadow-insetline"
    >
      {{ notice }}
    </p>
    <p
      v-if="errorMessage"
      class="mt-5 rounded-md border border-coral/30 bg-coral/5 px-4 py-3 text-sm font-medium text-coral"
    >
      {{ errorMessage }}
    </p>

    <div class="mt-8 grid gap-3 sm:grid-cols-3">
      <div class="ui-surface-soft p-5">
        <p class="text-sm text-ink/55">当前筛选总数</p>
        <p class="mt-2 font-display text-3xl">{{ stats.current }}</p>
      </div>
      <div class="ui-surface-soft p-5">
        <p class="text-sm text-ink/55">本页待审核</p>
        <p class="mt-2 font-display text-3xl">{{ stats.pending }}</p>
      </div>
      <div class="ui-surface-soft p-5">
        <p class="text-sm text-ink/55">本页待回复</p>
        <p class="mt-2 font-display text-3xl">{{ stats.unreplied }}</p>
      </div>
    </div>

    <section class="mt-6 grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
      <aside class="ui-surface h-fit grid gap-4 p-6">
        <div>
          <h2 class="font-display text-3xl text-brand">筛选条件</h2>
          <p class="mt-2 text-sm text-ink/60">
            先按状态和文章范围收窄，再逐条处理。
          </p>
        </div>

        <label>
          <span class="text-sm text-ink/60">状态</span>
          <select
            v-model="statusFilter"
            class="focus-ring mt-2 w-full rounded-md border border-line bg-white px-3 py-2"
          >
            <option value="all">全部状态</option>
            <option value="pending">待审核</option>
            <option value="approved">已通过</option>
            <option value="rejected">已拒绝</option>
            <option value="spam">垃圾评论</option>
          </select>
        </label>

        <label>
          <span class="text-sm text-ink/60">文章</span>
          <select
            v-model="articleFilter"
            class="focus-ring mt-2 w-full rounded-md border border-line bg-white px-3 py-2"
          >
            <option value="all">全部文章</option>
            <option
              v-for="article in articleOptions"
              :key="article.id"
              :value="article.id"
            >
              {{ article.title }}
            </option>
          </select>
        </label>

        <div class="rounded-md border border-line bg-paper px-4 py-4 text-sm text-ink/62">
          共 {{ total }} 条评论，第 {{ page }} / {{ totalPages }} 页
        </div>
      </aside>

      <div class="grid gap-4">
        <div v-if="loading" class="ui-surface grid gap-4 p-6">
          <div
            v-for="index in 4"
            :key="index"
            class="animate-pulse rounded-md border border-line bg-paper px-4 py-5"
          >
            <div class="h-4 w-40 rounded-md bg-line"></div>
            <div class="mt-3 h-4 w-full rounded-md bg-line"></div>
            <div class="mt-2 h-4 w-3/4 rounded-md bg-line"></div>
          </div>
        </div>

        <EmptyState
          v-else-if="comments.length === 0"
          compact
          title="没有评论"
          description="当前筛选条件下没有评论。"
        />

        <template v-else>
          <article
            v-for="comment in comments"
            :key="comment.id"
            class="ui-surface grid gap-5 p-6"
          >
            <div class="flex flex-wrap items-start justify-between gap-4">
              <div class="min-w-0">
                <div class="flex flex-wrap items-center gap-2">
                  <h2 class="font-display text-3xl text-brand">
                    {{ comment.authorName }}
                  </h2>
                  <span
                    class="rounded-md border px-2 py-1 text-xs"
                    :class="statusClass(comment.status)"
                  >
                    {{ statusLabel(comment.status) }}
                  </span>
                  <span
                    v-if="comment.parentId"
                    class="rounded-md border border-line bg-paper px-2 py-1 text-xs text-ink/55"
                  >
                    回复评论
                  </span>
                </div>

                <div class="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink/55">
                  <span>{{ comment.authorEmail }}</span>
                  <span>{{ formatDate(comment.createdAt) }}</span>
                  <span v-if="comment.repliedAt">已回复 {{ formatDate(comment.repliedAt) }}</span>
                </div>

                <div class="mt-3 flex flex-wrap items-center gap-3 text-sm">
                  <RouterLink
                    v-if="getArticleSlug(comment)"
                    class="focus-ring text-coral hover:text-brand"
                    :to="`/articles/${getArticleSlug(comment)}`"
                  >
                    {{ getArticleTitle(comment) }}
                  </RouterLink>
                  <span v-else class="text-ink/55">{{ getArticleTitle(comment) }}</span>
                  <a
                    v-if="comment.authorWebsite"
                    class="focus-ring text-ink/55 hover:text-brand"
                    :href="comment.authorWebsite"
                    rel="noreferrer"
                    target="_blank"
                  >
                    访问作者站点
                  </a>
                </div>
              </div>

              <div class="flex flex-wrap gap-2">
                <button
                  class="focus-ring rounded-md border border-moss/35 px-3 py-2 text-sm text-moss hover:bg-moss hover:text-white"
                  :disabled="submittingId === comment.id"
                  type="button"
                  @click="changeStatus(comment, 'approved')"
                >
                  通过
                </button>
                <button
                  class="focus-ring rounded-md border border-line px-3 py-2 text-sm text-ink/65 hover:border-brand hover:text-brand"
                  :disabled="submittingId === comment.id"
                  type="button"
                  @click="changeStatus(comment, 'rejected')"
                >
                  驳回
                </button>
                <button
                  class="focus-ring rounded-md border border-coral/35 px-3 py-2 text-sm text-coral hover:bg-coral hover:text-white"
                  :disabled="submittingId === comment.id"
                  type="button"
                  @click="changeStatus(comment, 'spam')"
                >
                  标记垃圾
                </button>
                <button
                  class="focus-ring rounded-md border border-line px-3 py-2 text-sm text-ink/65 hover:border-brand hover:text-brand"
                  :disabled="submittingId === comment.id"
                  type="button"
                  @click="toggleReply(comment)"
                >
                  {{ activeReplyId === comment.id ? "收起回复" : "回复" }}
                </button>
                <button
                  class="focus-ring rounded-md border border-coral px-3 py-2 text-sm text-coral"
                  :disabled="submittingId === comment.id"
                  type="button"
                  @click="removeCommentRecord(comment)"
                >
                  删除
                </button>
              </div>
            </div>

            <p class="whitespace-pre-wrap leading-7 text-ink/76">
              {{ comment.content }}
            </p>

            <div
              v-if="activeReplyId === comment.id"
              class="grid gap-3 rounded-md border border-line bg-paper px-4 py-4"
            >
              <label>
                <span class="text-sm text-ink/60">管理员回复</span>
                <textarea
                  v-model="replyDrafts[comment.id]"
                  class="focus-ring mt-2 min-h-[140px] w-full resize-y rounded-md border border-line bg-white px-3 py-3 leading-7"
                  maxlength="5000"
                  placeholder="写下回复内容，提交后会直接作为已通过回复发布。"
                ></textarea>
              </label>
              <div class="flex flex-wrap gap-2">
                <button
                  class="focus-ring ui-button-primary px-4 py-2"
                  :disabled="submittingId === comment.id"
                  type="button"
                  @click="submitReply(comment)"
                >
                  {{ submittingId === comment.id ? "正在提交..." : "发布回复" }}
                </button>
                <button
                  class="focus-ring ui-button-secondary px-4 py-2"
                  type="button"
                  @click="activeReplyId = ''"
                >
                  取消
                </button>
              </div>
            </div>
          </article>
        </template>

        <Pagination
          :current-page="page"
          :disabled="loading"
          :total="total"
          :total-pages="totalPages"
          @change="page = $event"
        />
      </div>
    </section>
  </div>
  <ConfirmDialog
    :open="Boolean(confirmRequest)"
    :title="confirmRequest?.title || ''"
    :message="confirmRequest?.message || ''"
    :confirm-label="confirmRequest?.confirmLabel || '确认'"
    :loading="confirmLoading"
    :variant="confirmRequest?.variant || 'primary'"
    @cancel="closeConfirmDialog"
    @confirm="executeConfirmDialog"
  />
</template>
