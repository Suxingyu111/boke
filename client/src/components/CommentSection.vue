<script setup lang="ts">
import { computed, nextTick, reactive, ref, watch } from "vue";
import { getApiErrorMessage } from "@/api/auth";
import {
  createArticleComment,
  getArticleComments,
} from "@/api/comments";
import CommentThreadItem from "@/components/CommentThreadItem.vue";
import { useAuthStore } from "@/stores/auth";
import type { CommentPayload, PublicComment } from "@/types/blog";

const props = withDefaults(
  defineProps<{
    articleId: string;
    articleTitle?: string;
    allowComment?: boolean;
  }>(),
  {
    articleTitle: "",
    allowComment: true,
  },
);

const authStore = useAuthStore();
const comments = ref<PublicComment[]>([]);
const loading = ref(false);
const loadingMore = ref(false);
const submitting = ref(false);
const errorMessage = ref("");
const notice = ref("");
const replyTarget = ref<PublicComment | null>(null);
const contentInputRef = ref<HTMLTextAreaElement | null>(null);
const pagination = reactive({
  total: 0,
  page: 1,
  pageSize: 20,
  totalPages: 1,
});

const form = reactive<CommentPayload>({
  authorName: "",
  authorEmail: "",
  authorWebsite: "",
  content: "",
});

const hasMore = computed(() => pagination.page < pagination.totalPages);
const isAuthenticated = computed(() => authStore.isAuthenticated);
const commentTitle = computed(() =>
  pagination.total > 0 ? `${pagination.total} 条评论` : "还没有评论",
);

function syncIdentityFields() {
  if (!authStore.user) {
    return;
  }

  form.authorName = authStore.displayName;
  form.authorEmail = authStore.user.email ?? "";
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function resetDraft(clearIdentity = false) {
  const previous = {
    authorName: form.authorName,
    authorEmail: form.authorEmail,
    authorWebsite: form.authorWebsite ?? "",
  };

  form.content = "";

  if (authStore.user && !clearIdentity) {
    syncIdentityFields();
    form.authorWebsite = "";
    return;
  }

  form.authorName = clearIdentity ? "" : previous.authorName;
  form.authorEmail = clearIdentity ? "" : previous.authorEmail;
  form.authorWebsite = clearIdentity ? "" : previous.authorWebsite;
}

async function focusEditor() {
  await nextTick();
  contentInputRef.value?.focus();
}

function setReplyTarget(comment: PublicComment) {
  replyTarget.value = comment;
  notice.value = `正在回复 ${comment.authorName} · ${formatDate(comment.createdAt)}`;
  void focusEditor();
}

function cancelReply() {
  replyTarget.value = null;
  notice.value = "";
}

async function loadComments(page = 1, append = false) {
  if (!props.articleId) {
    return;
  }

  errorMessage.value = "";

  if (append) {
    loadingMore.value = true;
  } else {
    loading.value = true;
  }

  try {
    const data = await getArticleComments(props.articleId, {
      page,
      pageSize: pagination.pageSize,
    });

    comments.value = append ? [...comments.value, ...data.items] : data.items;
    pagination.total = data.total;
    pagination.page = data.page;
    pagination.pageSize = data.pageSize;
    pagination.totalPages = data.totalPages;
  } catch (error) {
    errorMessage.value = getApiErrorMessage(error, "评论加载失败");
  } finally {
    loading.value = false;
    loadingMore.value = false;
  }
}

async function submitComment() {
  errorMessage.value = "";
  notice.value = "";

  const content = form.content.trim();
  const authorName = form.authorName.trim();
  const authorEmail = form.authorEmail.trim();
  const authorWebsite = form.authorWebsite?.trim() || "";

  if (!content) {
    errorMessage.value = "评论内容不能为空。";
    return;
  }

  if (!isAuthenticated.value && (!authorName || !authorEmail)) {
    errorMessage.value = "请填写昵称和邮箱。";
    return;
  }

  if (authorWebsite && !/^https?:\/\//i.test(authorWebsite)) {
    errorMessage.value = "个人网站需要以 http:// 或 https:// 开头。";
    return;
  }

  submitting.value = true;

  try {
    const result = await createArticleComment(props.articleId, {
      authorName: authorName || authStore.displayName,
      authorEmail: authorEmail || authStore.user?.email || "",
      authorWebsite: authorWebsite || undefined,
      parentId: replyTarget.value?.id,
      content,
    });

    notice.value = result.message;
    replyTarget.value = null;
    resetDraft(false);
    await loadComments(1, false);
  } catch (error) {
    errorMessage.value = getApiErrorMessage(error, "评论提交失败");
  } finally {
    submitting.value = false;
  }
}

watch(
  () => authStore.user,
  () => {
    if (authStore.user) {
      syncIdentityFields();
      return;
    }

    if (!submitting.value) {
      resetDraft(true);
    }
  },
  { immediate: true },
);

watch(
  () => props.articleId,
  () => {
    comments.value = [];
    pagination.total = 0;
    pagination.page = 1;
    pagination.totalPages = 1;
    replyTarget.value = null;
    notice.value = "";
    errorMessage.value = "";
    resetDraft(!authStore.user);
    void loadComments(1, false);
  },
  { immediate: true },
);
</script>

<template>
  <section class="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_360px]">
    <div class="ui-surface p-5 md:p-6">
      <div class="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p class="eyebrow">Conversation</p>
          <h2 class="mt-2 font-display text-4xl text-brand">评论区</h2>
          <p class="mt-2 text-sm text-ink/58">
            {{ commentTitle }}
            <span v-if="articleTitle"> · 《{{ articleTitle }}》</span>
          </p>
        </div>
        <button
          v-if="replyTarget"
          class="focus-ring rounded-md border border-line px-4 py-2 text-sm text-ink/68 hover:border-coral hover:text-coral"
          type="button"
          @click="cancelReply"
        >
          取消回复
        </button>
      </div>

      <p
        v-if="notice"
        class="mt-5 rounded-md border border-moss/25 bg-moss/5 px-4 py-3 text-sm text-moss"
      >
        {{ notice }}
      </p>
      <p
        v-if="errorMessage"
        class="mt-5 rounded-md border border-coral/25 bg-coral/5 px-4 py-3 text-sm text-coral"
      >
        {{ errorMessage }}
      </p>

      <div v-if="loading" class="mt-6 grid gap-4">
        <div
          v-for="index in 3"
          :key="index"
          class="animate-pulse border-l border-line pl-4"
        >
          <div class="h-4 w-36 rounded-md bg-line"></div>
          <div class="mt-3 h-4 w-full rounded-md bg-line"></div>
          <div class="mt-2 h-4 w-3/4 rounded-md bg-line"></div>
        </div>
      </div>

      <div v-else-if="comments.length" class="mt-6 grid gap-5">
        <CommentThreadItem
          v-for="comment in comments"
          :key="comment.id"
          :active-reply-id="replyTarget?.id ?? null"
          :comment="comment"
          @reply="setReplyTarget"
        />
      </div>

      <div
        v-else
        class="mt-6 rounded-md border border-dashed border-line bg-paper px-5 py-8 text-center text-ink/58"
      >
        {{ allowComment ? "做第一个留言的人吧。" : "这篇文章暂时关闭了评论。" }}
      </div>

      <div v-if="hasMore" class="mt-6 flex justify-center">
        <button
          class="focus-ring ui-button-secondary px-5 py-3 text-sm"
          :disabled="loadingMore"
          type="button"
          @click="loadComments(pagination.page + 1, true)"
        >
          {{ loadingMore ? "正在加载更多评论..." : "查看更多评论" }}
        </button>
      </div>
    </div>

    <aside class="ui-surface h-fit p-5 md:p-6">
      <p class="eyebrow">Write Back</p>
      <h3 class="mt-2 font-display text-3xl text-brand">
        {{ replyTarget ? `回复 ${replyTarget.authorName}` : "发表你的评论" }}
      </h3>
      <p class="mt-3 text-sm leading-7 text-ink/62">
        评论提交后需要后台审核，管理员回复会自动出现在对应线程里。
      </p>

      <form class="mt-5 grid gap-4" @submit.prevent="submitComment">
        <template v-if="isAuthenticated">
          <div class="rounded-md border border-line bg-paper px-4 py-3 text-sm text-ink/68">
            当前将以 <span class="font-semibold text-brand">{{ authStore.displayName }}</span>
            身份发表评论
          </div>
        </template>
        <template v-else>
          <label class="block">
            <span class="text-sm text-ink/60">昵称</span>
            <input
              v-model="form.authorName"
              class="focus-ring mt-2 w-full rounded-md px-3 py-2"
              maxlength="100"
              placeholder="怎么称呼你"
              type="text"
            />
          </label>

          <label class="block">
            <span class="text-sm text-ink/60">邮箱</span>
            <input
              v-model="form.authorEmail"
              class="focus-ring mt-2 w-full rounded-md px-3 py-2"
              placeholder="用于审核与联系，不会公开展示"
              type="email"
            />
          </label>
        </template>

        <label class="block">
          <span class="text-sm text-ink/60">个人网站</span>
          <input
            v-model="form.authorWebsite"
            class="focus-ring mt-2 w-full rounded-md px-3 py-2"
            placeholder="https://example.com"
            type="url"
          />
        </label>

        <label class="block">
          <span class="text-sm text-ink/60">内容</span>
          <textarea
            ref="contentInputRef"
            v-model="form.content"
            class="focus-ring mt-2 min-h-[180px] w-full resize-y rounded-md px-3 py-3 leading-7"
            maxlength="5000"
            placeholder="写点真诚、有信息量的反馈。"
          ></textarea>
        </label>

        <div
          v-if="replyTarget"
          class="rounded-md border border-line bg-paper px-4 py-3 text-sm text-ink/62"
        >
          正在回复：
          <span class="font-semibold text-brand">{{ replyTarget.authorName }}</span>
          <p class="mt-2 line-clamp-3 whitespace-pre-wrap text-ink/54">
            {{ replyTarget.content }}
          </p>
        </div>

        <button
          class="focus-ring ui-button-primary w-full px-5 py-3"
          :disabled="submitting || !allowComment"
          type="submit"
        >
          {{
            !allowComment
              ? "当前文章未开放评论"
              : submitting
                ? "正在提交..."
                : replyTarget
                  ? "提交回复"
                  : "提交评论"
          }}
        </button>
      </form>
    </aside>
  </section>
</template>
