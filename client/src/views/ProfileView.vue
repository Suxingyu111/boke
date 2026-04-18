<script setup lang="ts">
import { onMounted, reactive } from "vue";
import { useAuthStore } from "@/stores/auth";
import { useEcosystemStore } from "@/stores/ecosystem";
import { useUserStore } from "@/stores/user";

const authStore = useAuthStore();
const ecosystemStore = useEcosystemStore();
const userStore = useUserStore();

const profileForm = reactive({
  nickname: "",
  avatar: "",
  bio: "",
});

const passwordForm = reactive({
  oldPassword: "",
  newPassword: "",
});

function syncProfileForm() {
  if (!userStore.profile) {
    return;
  }

  Object.assign(profileForm, {
    nickname: userStore.profile.nickname ?? "",
    avatar: userStore.profile.avatar ?? "",
    bio: userStore.profile.bio ?? "",
  });
}

async function saveProfile() {
  const saved = await userStore.updateProfile({
    nickname: profileForm.nickname.trim(),
    avatar: profileForm.avatar.trim(),
    bio: profileForm.bio.trim(),
  });

  if (saved && userStore.profile && authStore.user) {
    authStore.persistUser({
      ...authStore.user,
      nickname: userStore.profile.nickname,
      avatar: userStore.profile.avatar,
      bio: userStore.profile.bio,
    });
  }
}

async function changePassword() {
  if (!passwordForm.oldPassword || !passwordForm.newPassword) {
    userStore.errorMessage = "请填写旧密码和新密码。";
    return;
  }

  const saved = await userStore.changePassword({ ...passwordForm });
  if (saved) {
    Object.assign(passwordForm, { oldPassword: "", newPassword: "" });
  }
}

function notificationTypeLabel(type: string) {
  const labels: Record<string, string> = {
    reply: "回复通知",
    like: "点赞通知",
    system: "系统通知",
  };
  return labels[type] ?? "通知";
}

onMounted(async () => {
  await Promise.allSettled([
    userStore.loadProfile(),
    userStore.loadFavorites(),
    userStore.loadNotifications(),
    ecosystemStore.loadMyPurchases(),
  ]);
  syncProfileForm();
});
</script>

<template>
  <section class="content-shell py-10 md:py-14">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p class="eyebrow">Community</p>
        <h1 class="mt-2 font-display text-5xl text-brand md:text-6xl">
          个人中心
        </h1>
        <p class="mt-4 max-w-2xl leading-7 text-ink/66">
          管理资料、查看收藏和处理站内通知。
        </p>
      </div>
      <RouterLink class="focus-ring ui-button-secondary px-4 py-2" to="/">
        返回首页
      </RouterLink>
    </div>

    <p
      v-if="userStore.notice"
      class="mt-6 rounded-md border border-moss/25 bg-white px-4 py-3 text-sm text-moss"
    >
      {{ userStore.notice }}
    </p>
    <p
      v-if="userStore.errorMessage"
      class="mt-6 rounded-md border border-coral/25 bg-coral/10 px-4 py-3 text-sm text-coral"
    >
      {{ userStore.errorMessage }}
    </p>

    <div class="mt-8 grid gap-6 lg:grid-cols-[minmax(0,0.82fr)_1fr]">
      <section class="ui-surface grid gap-5 p-6">
        <div class="flex items-center gap-4">
          <img
            v-if="profileForm.avatar"
            class="h-16 w-16 rounded-md border border-line object-cover"
            :alt="`${profileForm.nickname || authStore.displayName} 的头像`"
            :src="profileForm.avatar"
            width="64"
            height="64"
            loading="lazy"
          />
          <div
            v-else
            class="grid h-16 w-16 place-items-center rounded-md border border-line bg-paper font-display text-3xl text-brand"
          >
            {{ (profileForm.nickname || authStore.displayName || "我").slice(0, 1) }}
          </div>
          <div>
            <h2 class="font-display text-4xl text-brand">
              {{ profileForm.nickname || authStore.displayName || "我的资料" }}
            </h2>
            <p class="text-sm text-ink/56">
              {{ userStore.profile?.email || authStore.user?.email }}
            </p>
          </div>
        </div>

        <div class="grid gap-4 md:grid-cols-2">
          <div class="rounded-md border border-line bg-paper p-4">
            <p class="text-sm text-ink/56">收藏文章</p>
            <p class="mt-2 font-display text-4xl text-brand">
              {{ userStore.profile?.favoriteCount ?? userStore.favorites.length }}
            </p>
          </div>
          <div class="rounded-md border border-line bg-paper p-4">
            <p class="text-sm text-ink/56">评论 / 留言</p>
            <p class="mt-2 font-display text-4xl text-brand">
              {{ userStore.profile?.commentCount ?? 0 }}
            </p>
          </div>
        </div>

        <form class="grid gap-4" @submit.prevent="saveProfile">
          <label>
            <span class="text-sm font-semibold text-ink/60">昵称</span>
            <input
              v-model="profileForm.nickname"
              class="focus-ring mt-2 w-full rounded-md border border-line px-3 py-2"
              type="text"
            />
          </label>
          <label>
            <span class="text-sm font-semibold text-ink/60">头像 URL</span>
            <input
              v-model="profileForm.avatar"
              class="focus-ring mt-2 w-full rounded-md border border-line px-3 py-2"
              type="url"
            />
          </label>
          <label>
            <span class="text-sm font-semibold text-ink/60">个人简介</span>
            <textarea
              v-model="profileForm.bio"
              class="focus-ring mt-2 min-h-28 w-full resize-y rounded-md border border-line px-3 py-2"
            ></textarea>
          </label>
          <button
            class="focus-ring ui-button-primary w-fit px-5 py-3"
            :disabled="userStore.saving"
            type="submit"
          >
            {{ userStore.saving ? "正在保存..." : "保存资料" }}
          </button>
        </form>

        <form class="grid gap-4 border-t border-line pt-5" @submit.prevent="changePassword">
          <h2 class="font-display text-3xl text-brand">账号安全</h2>
          <div class="grid gap-4 md:grid-cols-2">
            <label>
              <span class="text-sm font-semibold text-ink/60">旧密码</span>
              <input
                v-model="passwordForm.oldPassword"
                autocomplete="current-password"
                class="focus-ring mt-2 w-full rounded-md border border-line px-3 py-2"
                type="password"
              />
            </label>
            <label>
              <span class="text-sm font-semibold text-ink/60">新密码</span>
              <input
                v-model="passwordForm.newPassword"
                autocomplete="new-password"
                class="focus-ring mt-2 w-full rounded-md border border-line px-3 py-2"
                minlength="8"
                type="password"
              />
            </label>
          </div>
          <button class="focus-ring ui-button-secondary w-fit px-5 py-3" type="submit">
            修改密码
          </button>
        </form>
      </section>

      <div class="grid gap-6">
        <section class="ui-surface p-6">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p class="eyebrow">Favorites</p>
              <h2 class="mt-2 font-display text-4xl text-brand">收藏的文章</h2>
            </div>
          </div>
          <div v-if="userStore.favorites.length" class="mt-5 grid gap-3">
            <RouterLink
              v-for="favorite in userStore.favorites"
              :key="favorite.id"
              class="focus-ring grid gap-2 rounded-md border border-line bg-paper p-4 hover:border-brand"
              :to="`/articles/${favorite.article.slug}`"
            >
              <p class="font-semibold text-brand">{{ favorite.article.title }}</p>
              <p class="line-clamp-2 text-sm leading-6 text-ink/64">
                {{ favorite.article.excerpt }}
              </p>
              <p class="text-xs text-ink/48">
                收藏于 {{ new Date(favorite.favoritedAt).toLocaleString("zh-CN") }}
              </p>
            </RouterLink>
          </div>
          <p v-else class="mt-5 rounded-md border border-line bg-paper p-4 text-ink/60">
            还没有收藏文章。读到喜欢的内容时，可以在详情页点收藏。
          </p>
        </section>

        <section class="ui-surface p-6">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p class="eyebrow">Purchases</p>
              <h2 class="mt-2 font-display text-4xl text-brand">已购内容</h2>
            </div>
          </div>
          <div v-if="ecosystemStore.myPurchases.length" class="mt-5 grid gap-3">
            <article
              v-for="purchase in ecosystemStore.myPurchases"
              :key="purchase.id"
              class="rounded-md border border-line bg-paper p-4"
            >
              <div class="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <RouterLink
                    v-if="purchase.articleSlug"
                    class="font-semibold text-brand hover:text-coral"
                    :to="`/articles/${purchase.articleSlug}`"
                  >
                    {{ purchase.articleTitle || purchase.articleSlug }}
                  </RouterLink>
                  <p v-else class="font-semibold text-brand">
                    {{ purchase.articleTitle || "付费内容" }}
                  </p>
                  <p class="mt-2 text-sm text-ink/56">
                    支付方式：{{ purchase.paymentMethod || "manual" }}
                  </p>
                </div>
                <div class="text-right">
                  <p class="font-display text-3xl text-brand">
                    ￥{{ Number(purchase.paidAmount || 0).toFixed(2) }}
                  </p>
                  <p class="mt-2 text-xs text-ink/48">
                    {{ new Date(purchase.purchasedAt).toLocaleString("zh-CN") }}
                  </p>
                </div>
              </div>
            </article>
          </div>
          <p v-else class="mt-5 rounded-md border border-line bg-paper p-4 text-ink/60">
            还没有已购内容记录。
          </p>
        </section>

        <section class="ui-surface p-6">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p class="eyebrow">Notifications</p>
              <h2 class="mt-2 font-display text-4xl text-brand">
                消息通知
                <span class="align-middle font-body text-base text-coral">
                  {{ userStore.unreadCount }} 未读
                </span>
              </h2>
            </div>
            <button
              class="focus-ring ui-button-secondary px-4 py-2 text-sm"
              type="button"
              @click="userStore.markAllNotificationsRead()"
            >
              全部已读
            </button>
          </div>

          <div v-if="userStore.notifications.length" class="mt-5 grid gap-3">
            <article
              v-for="notification in userStore.notifications"
              :key="notification.id"
              class="rounded-md border border-line bg-paper p-4"
              :class="{ 'border-coral/50 bg-coral/5': !notification.isRead }"
            >
              <div class="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p class="text-xs font-semibold text-coral">
                    {{ notificationTypeLabel(notification.type) }}
                  </p>
                  <h3 class="mt-1 font-semibold text-brand">
                    {{ notification.title }}
                  </h3>
                </div>
                <p class="text-xs text-ink/48">
                  {{ new Date(notification.createdAt).toLocaleString("zh-CN") }}
                </p>
              </div>
              <p v-if="notification.content" class="mt-3 leading-7 text-ink/64">
                {{ notification.content }}
              </p>
              <div class="mt-4 flex flex-wrap gap-2">
                <button
                  v-if="!notification.isRead"
                  class="focus-ring min-h-9 rounded-md border border-line px-3 py-1 text-sm hover:border-brand hover:text-brand"
                  type="button"
                  @click="userStore.markNotificationRead(notification.id)"
                >
                  标记已读
                </button>
                <button
                  class="focus-ring min-h-9 rounded-md border border-line px-3 py-1 text-sm hover:border-coral hover:text-coral"
                  type="button"
                  @click="userStore.deleteNotification(notification.id)"
                >
                  删除
                </button>
              </div>
            </article>
          </div>
          <p v-else class="mt-5 rounded-md border border-line bg-paper p-4 text-ink/60">
            暂无通知。
          </p>
        </section>
      </div>
    </div>
  </section>
</template>
