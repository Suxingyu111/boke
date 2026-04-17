<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import { getApiErrorMessage } from "@/api/auth";
import { useContentStore } from "@/stores/content";
import { useEcosystemStore } from "@/stores/ecosystem";
import { renderMarkdown } from "@/utils/markdown";

const contentStore = useContentStore();
const ecosystemStore = useEcosystemStore();
const selectedArticleId = ref("");
const pageError = ref("");

const selectedArticle = computed(() =>
  contentStore.articles.find(
    (article) => article.id === selectedArticleId.value,
  ),
);
const draftArticles = computed(() =>
  contentStore.articles.filter((article) => article.status === "draft"),
);

const collaboratorForm = reactive({
  userId: "",
  permission: "editor" as "editor" | "viewer",
});
const draftForm = reactive({
  title: "",
  excerpt: "",
  content: "",
});
const paidForm = reactive({
  price: 9.9,
  previewPercent: 30,
  isActive: true,
  description: "",
});
const notificationForm = reactive({
  toEmail: "",
  subject: "",
  body: "<p>你好，这是一封系统通知。</p>",
  type: "system" as "comment" | "subscription" | "system",
});
const subscriberNotifyForm = reactive({
  articleTitle: "",
  articleSlug: "",
});

watch(selectedArticle, (article) => {
  if (!article) {
    return;
  }

  Object.assign(draftForm, {
    title: article.title,
    excerpt: article.excerpt,
    content: article.content,
  });
  Object.assign(subscriberNotifyForm, {
    articleTitle: article.title,
    articleSlug: article.slug,
  });
});

onMounted(async () => {
  await Promise.allSettled([
    contentStore.loadAdminContent(),
    ecosystemStore.loadNotifications(),
    ecosystemStore.loadSubscribers(),
  ]);

  selectedArticleId.value =
    draftArticles.value[0]?.id ?? contentStore.articles[0]?.id ?? "";
});

async function runAction(action: () => Promise<unknown>, fallback: string) {
  pageError.value = "";
  ecosystemStore.notice = "";
  try {
    await action();
  } catch (error) {
    pageError.value = getApiErrorMessage(error, fallback);
  }
}

async function loadCollaboration() {
  if (!selectedArticleId.value) {
    pageError.value = "请先选择一篇文章。";
    return;
  }

  await runAction(
    () => ecosystemStore.loadCollaboration(selectedArticleId.value),
    "协作数据加载失败",
  );
}

async function addCollaborator() {
  if (!selectedArticleId.value || !collaboratorForm.userId.trim()) {
    pageError.value = "请填写文章和协作者用户 ID。";
    return;
  }

  await runAction(
    () =>
      ecosystemStore.addCollaborator(selectedArticleId.value, {
        userId: collaboratorForm.userId.trim(),
        permission: collaboratorForm.permission,
      }),
    "添加协作者失败",
  );
  collaboratorForm.userId = "";
}

async function updateDraft() {
  if (!selectedArticleId.value) {
    pageError.value = "请先选择一篇草稿。";
    return;
  }

  await runAction(
    () =>
      ecosystemStore.updateDraft(selectedArticleId.value, {
        title: draftForm.title.trim(),
        excerpt: draftForm.excerpt.trim(),
        content: draftForm.content,
        contentHtml: renderMarkdown(draftForm.content),
      }),
    "协作草稿保存失败",
  );
  await contentStore.loadAdminContent();
}

async function savePaidContent() {
  if (!selectedArticleId.value) {
    pageError.value = "请先选择一篇文章。";
    return;
  }

  await runAction(
    () =>
      ecosystemStore.setPaidContent(selectedArticleId.value, {
        price: Number(paidForm.price),
        previewPercent: Number(paidForm.previewPercent),
        isActive: paidForm.isActive,
        description: paidForm.description.trim() || undefined,
      }),
    "付费内容保存失败",
  );
}

async function sendNotification() {
  if (!notificationForm.toEmail || !notificationForm.subject) {
    pageError.value = "请填写收件人和标题。";
    return;
  }

  await runAction(
    () =>
      ecosystemStore.sendNotification({
        toEmail: notificationForm.toEmail.trim(),
        subject: notificationForm.subject.trim(),
        body: notificationForm.body,
        type: notificationForm.type,
      }),
    "发送通知失败",
  );
}

async function notifySubscribers() {
  if (!subscriberNotifyForm.articleTitle || !subscriberNotifyForm.articleSlug) {
    pageError.value = "请填写文章标题和 slug。";
    return;
  }

  await runAction(
    () =>
      ecosystemStore.notifySubscribers({
        articleTitle: subscriberNotifyForm.articleTitle.trim(),
        articleSlug: subscriberNotifyForm.articleSlug.trim(),
      }),
    "通知订阅者失败",
  );
}

function formatDate(value?: string | null) {
  return value
    ? new Date(value).toLocaleString("zh-CN", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "未设置";
}
</script>

<template>
  <div>
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p class="eyebrow">Content Ecosystem</p>
        <h1 class="mt-2 font-display text-5xl text-brand">内容生态管理</h1>
        <p class="mt-3 max-w-2xl text-ink/65">
          搜索索引、草稿协作、付费内容、邮件通知和订阅者接口在这里集中操作。
        </p>
      </div>
      <button
        class="focus-ring ui-button-primary px-5 py-3"
        :disabled="ecosystemStore.adminLoading"
        type="button"
        @click="
          runAction(
            () => ecosystemStore.rebuildSearchIndex(),
            '搜索索引重建失败',
          )
        "
      >
        重建搜索索引
      </button>
    </div>

    <p
      v-if="ecosystemStore.notice"
      class="mt-5 rounded-md border border-moss bg-white px-4 py-3 text-sm font-medium text-moss"
    >
      {{ ecosystemStore.notice }}
    </p>
    <p
      v-if="pageError || ecosystemStore.errorMessage"
      class="mt-5 rounded-md border border-coral bg-white px-4 py-3 text-sm font-medium text-coral"
    >
      {{ pageError || ecosystemStore.errorMessage }}
    </p>

    <section class="mt-8 grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
      <div class="ui-surface-soft grid h-fit gap-4 p-5">
        <label>
          <span class="text-sm text-ink/60">选择文章</span>
          <select
            v-model="selectedArticleId"
            class="focus-ring mt-2 w-full rounded-md border border-line bg-white px-3 py-2"
          >
            <option
              v-for="article in contentStore.articles"
              :key="article.id"
              :value="article.id"
            >
              {{ article.title }}（{{ article.status }}）
            </option>
          </select>
        </label>
        <div
          v-if="selectedArticle"
          class="rounded-md border border-line bg-white p-4"
        >
          <p class="font-semibold text-brand">{{ selectedArticle.title }}</p>
          <p class="mt-2 text-sm leading-6 text-ink/62">
            {{ selectedArticle.excerpt || "暂无摘要" }}
          </p>
        </div>
        <button
          class="focus-ring ui-button-secondary px-4 py-2"
          type="button"
          @click="loadCollaboration"
        >
          加载协作记录
        </button>
        <button
          class="focus-ring ui-button-secondary px-4 py-2"
          type="button"
          @click="
            runAction(
              () => ecosystemStore.loadPurchaseRecords(selectedArticleId),
              '购买记录加载失败',
            )
          "
        >
          加载购买记录
        </button>
      </div>

      <div class="grid gap-6">
        <section class="ui-surface grid gap-5 p-5">
          <div>
            <p class="text-sm font-semibold text-coral">草稿协作</p>
            <h2 class="mt-2 font-display text-3xl text-brand">
              协作者与编辑历史
            </h2>
          </div>
          <div class="grid gap-4 lg:grid-cols-2">
            <form class="grid gap-3" @submit.prevent="addCollaborator">
              <label>
                <span class="text-sm text-ink/60">协作者用户 ID</span>
                <input
                  v-model="collaboratorForm.userId"
                  class="focus-ring mt-2 w-full rounded-md border border-line px-3 py-2"
                  placeholder="uuid"
                  type="text"
                />
              </label>
              <label>
                <span class="text-sm text-ink/60">权限</span>
                <select
                  v-model="collaboratorForm.permission"
                  class="focus-ring mt-2 w-full rounded-md border border-line bg-white px-3 py-2"
                >
                  <option value="editor">editor</option>
                  <option value="viewer">viewer</option>
                </select>
              </label>
              <button
                class="focus-ring ui-button-primary px-4 py-2"
                type="submit"
              >
                添加协作者
              </button>
            </form>

            <form class="grid gap-3" @submit.prevent="updateDraft">
              <label>
                <span class="text-sm text-ink/60">草稿标题</span>
                <input
                  v-model="draftForm.title"
                  class="focus-ring mt-2 w-full rounded-md border border-line px-3 py-2"
                  type="text"
                />
              </label>
              <label>
                <span class="text-sm text-ink/60">草稿摘要</span>
                <textarea
                  v-model="draftForm.excerpt"
                  class="focus-ring mt-2 min-h-20 w-full rounded-md border border-line px-3 py-2"
                ></textarea>
              </label>
              <label>
                <span class="text-sm text-ink/60">Markdown 正文</span>
                <textarea
                  v-model="draftForm.content"
                  class="focus-ring mt-2 min-h-32 w-full rounded-md border border-line px-3 py-2 font-mono text-sm"
                ></textarea>
              </label>
              <button
                class="focus-ring ui-button-primary px-4 py-2"
                type="submit"
              >
                协作保存草稿
              </button>
            </form>
          </div>

          <div class="grid gap-4 lg:grid-cols-2">
            <div class="rounded-md border border-line bg-paper p-4">
              <p class="font-semibold text-brand">协作者</p>
              <div class="mt-3 grid gap-2">
                <div
                  v-for="item in ecosystemStore.collaborators"
                  :key="item.id"
                  class="flex flex-wrap items-center justify-between gap-2 rounded-md border border-line bg-white px-3 py-2 text-sm"
                >
                  <span
                    >{{ item.nickname || item.username || item.userId }} ·
                    {{ item.permission }}</span
                  >
                  <button
                    class="focus-ring rounded-md border border-coral px-2 py-1 text-coral"
                    type="button"
                    @click="
                      runAction(
                        () =>
                          ecosystemStore.removeCollaborator(
                            selectedArticleId,
                            item.id,
                          ),
                        '移除协作者失败',
                      )
                    "
                  >
                    移除
                  </button>
                </div>
                <p
                  v-if="!ecosystemStore.collaborators.length"
                  class="text-sm text-ink/55"
                >
                  暂无协作者。
                </p>
              </div>
            </div>

            <div class="rounded-md border border-line bg-paper p-4">
              <p class="font-semibold text-brand">编辑历史</p>
              <div class="mt-3 grid gap-2">
                <div
                  v-for="item in ecosystemStore.editHistory"
                  :key="item.id"
                  class="rounded-md border border-line bg-white px-3 py-2 text-sm"
                >
                  <p>{{ item.summary }}</p>
                  <p class="mt-1 text-ink/50">
                    {{ item.username || item.userId }} ·
                    {{ formatDate(item.createdAt) }}
                  </p>
                </div>
                <p
                  v-if="!ecosystemStore.editHistory.length"
                  class="text-sm text-ink/55"
                >
                  暂无编辑历史。
                </p>
              </div>
            </div>
          </div>
        </section>

        <section class="ui-surface grid gap-5 p-5">
          <div>
            <p class="text-sm font-semibold text-coral">付费内容</p>
            <h2 class="mt-2 font-display text-3xl text-brand">
              设置价格与查看购买记录
            </h2>
          </div>
          <form
            class="grid gap-4 lg:grid-cols-4"
            @submit.prevent="savePaidContent"
          >
            <label>
              <span class="text-sm text-ink/60">价格</span>
              <input
                v-model.number="paidForm.price"
                class="focus-ring mt-2 w-full rounded-md border border-line px-3 py-2"
                min="0.01"
                step="0.01"
                type="number"
              />
            </label>
            <label>
              <span class="text-sm text-ink/60">预览比例</span>
              <input
                v-model.number="paidForm.previewPercent"
                class="focus-ring mt-2 w-full rounded-md border border-line px-3 py-2"
                max="100"
                min="0"
                type="number"
              />
            </label>
            <label class="flex items-end gap-2">
              <input
                v-model="paidForm.isActive"
                class="mb-3 accent-brand"
                type="checkbox"
              />
              <span class="pb-2 text-sm text-ink/70">启用付费</span>
            </label>
            <button
              class="focus-ring ui-button-primary h-fit self-end px-4 py-2"
              type="submit"
            >
              保存付费设置
            </button>
            <label class="lg:col-span-3">
              <span class="text-sm text-ink/60">付费说明</span>
              <input
                v-model="paidForm.description"
                class="focus-ring mt-2 w-full rounded-md border border-line px-3 py-2"
                placeholder="解锁后可阅读全文"
                type="text"
              />
            </label>
            <button
              class="focus-ring ui-button-secondary h-fit self-end px-4 py-2"
              type="button"
              @click="
                runAction(
                  () => ecosystemStore.removePaidContent(selectedArticleId),
                  '移除付费设置失败',
                )
              "
            >
              移除付费设置
            </button>
          </form>
          <div class="overflow-x-auto rounded-md border border-line">
            <table class="w-full min-w-[640px] text-left text-sm">
              <thead class="bg-wash text-ink/60">
                <tr>
                  <th class="p-3">用户</th>
                  <th class="p-3">金额</th>
                  <th class="p-3">方式</th>
                  <th class="p-3">时间</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-line bg-white">
                <tr
                  v-for="record in ecosystemStore.purchaseRecords"
                  :key="record.id"
                >
                  <td class="p-3">
                    {{ record.username || record.userId || "读者" }}
                  </td>
                  <td class="p-3">
                    ¥{{ Number(record.paidAmount).toFixed(2) }}
                  </td>
                  <td class="p-3">{{ record.paymentMethod || "manual" }}</td>
                  <td class="p-3">{{ formatDate(record.purchasedAt) }}</td>
                </tr>
                <tr v-if="!ecosystemStore.purchaseRecords.length">
                  <td class="p-3 text-ink/55" colspan="4">暂无购买记录。</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section class="ui-surface grid gap-5 p-5">
          <div>
            <p class="text-sm font-semibold text-coral">通知与订阅</p>
            <h2 class="mt-2 font-display text-3xl text-brand">
              发送通知、触达订阅者、重试失败队列
            </h2>
          </div>
          <div class="grid gap-5 lg:grid-cols-2">
            <form class="grid gap-3" @submit.prevent="sendNotification">
              <label>
                <span class="text-sm text-ink/60">收件人邮箱</span>
                <input
                  v-model="notificationForm.toEmail"
                  class="focus-ring mt-2 w-full rounded-md border border-line px-3 py-2"
                  type="email"
                />
              </label>
              <label>
                <span class="text-sm text-ink/60">主题</span>
                <input
                  v-model="notificationForm.subject"
                  class="focus-ring mt-2 w-full rounded-md border border-line px-3 py-2"
                  type="text"
                />
              </label>
              <label>
                <span class="text-sm text-ink/60">类型</span>
                <select
                  v-model="notificationForm.type"
                  class="focus-ring mt-2 w-full rounded-md border border-line bg-white px-3 py-2"
                >
                  <option value="system">system</option>
                  <option value="comment">comment</option>
                  <option value="subscription">subscription</option>
                </select>
              </label>
              <label>
                <span class="text-sm text-ink/60">HTML 正文</span>
                <textarea
                  v-model="notificationForm.body"
                  class="focus-ring mt-2 min-h-28 w-full rounded-md border border-line px-3 py-2 font-mono text-sm"
                ></textarea>
              </label>
              <button
                class="focus-ring ui-button-primary px-4 py-2"
                type="submit"
              >
                发送自定义通知
              </button>
            </form>

            <form class="grid h-fit gap-3" @submit.prevent="notifySubscribers">
              <label>
                <span class="text-sm text-ink/60">文章标题</span>
                <input
                  v-model="subscriberNotifyForm.articleTitle"
                  class="focus-ring mt-2 w-full rounded-md border border-line px-3 py-2"
                  type="text"
                />
              </label>
              <label>
                <span class="text-sm text-ink/60">文章 slug</span>
                <input
                  v-model="subscriberNotifyForm.articleSlug"
                  class="focus-ring mt-2 w-full rounded-md border border-line px-3 py-2"
                  type="text"
                />
              </label>
              <div class="flex flex-wrap gap-2">
                <button
                  class="focus-ring ui-button-primary px-4 py-2"
                  type="submit"
                >
                  通知订阅者
                </button>
                <button
                  class="focus-ring ui-button-secondary px-4 py-2"
                  type="button"
                  @click="
                    runAction(
                      () => ecosystemStore.retryFailedNotifications(),
                      '重试失败通知失败',
                    )
                  "
                >
                  重试失败通知
                </button>
              </div>
            </form>
          </div>

          <div class="grid gap-5 lg:grid-cols-2">
            <div class="rounded-md border border-line bg-paper p-4">
              <p class="font-semibold text-brand">
                通知记录（{{ ecosystemStore.notificationMeta.total }}）
              </p>
              <div class="mt-3 grid gap-2">
                <div
                  v-for="item in ecosystemStore.notifications"
                  :key="item.id"
                  class="rounded-md border border-line bg-white px-3 py-2 text-sm"
                >
                  <p class="font-semibold">{{ item.subject }}</p>
                  <p class="mt-1 text-ink/55">
                    {{ item.toEmail }} · {{ item.status }} ·
                    {{ formatDate(item.createdAt) }}
                  </p>
                </div>
                <p
                  v-if="!ecosystemStore.notifications.length"
                  class="text-sm text-ink/55"
                >
                  暂无通知记录。
                </p>
              </div>
            </div>

            <div class="rounded-md border border-line bg-paper p-4">
              <p class="font-semibold text-brand">
                订阅者（{{ ecosystemStore.subscriberMeta.total }}）
              </p>
              <div class="mt-3 grid gap-2">
                <div
                  v-for="item in ecosystemStore.subscribers"
                  :key="item.id"
                  class="flex flex-wrap items-center justify-between gap-2 rounded-md border border-line bg-white px-3 py-2 text-sm"
                >
                  <span>
                    {{ item.name || "匿名读者" }} · {{ item.email }} ·
                    {{ item.isConfirmed ? "已确认" : "待确认" }}
                  </span>
                  <button
                    class="focus-ring rounded-md border border-coral px-2 py-1 text-coral"
                    type="button"
                    @click="
                      runAction(
                        () => ecosystemStore.removeSubscriber(item.id),
                        '删除订阅者失败',
                      )
                    "
                  >
                    删除
                  </button>
                </div>
                <p
                  v-if="!ecosystemStore.subscribers.length"
                  class="text-sm text-ink/55"
                >
                  暂无订阅者。
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </section>
  </div>
</template>
