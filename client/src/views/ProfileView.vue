<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import { useAuthStore } from "@/stores/auth";
import { useEcosystemStore } from "@/stores/ecosystem";
import { useUserStore } from "@/stores/user";

const authStore = useAuthStore();
const ecosystemStore = useEcosystemStore();
const userStore = useUserStore();

const mode = ref<"view" | "edit-profile" | "edit-password">("view");
const avatarFileInput = ref<HTMLInputElement | null>(null);

const profileForm = reactive({ nickname: "", email: "", avatar: "", bio: "" });
const passwordForm = reactive({ oldPassword: "", newPassword: "", confirmPassword: "" });
const passwordError = ref("");

const displayName = computed(() => userStore.profile?.nickname || authStore.displayName || "我");
const avatarInitial = computed(() => displayName.value.slice(0, 1).toUpperCase());
const primaryContact = computed(
  () => userStore.profile?.phone || userStore.profile?.email || authStore.user?.phone || authStore.user?.email || "暂未绑定联系方式",
);
const contactVerificationLabel = computed(() => {
  if (userStore.profile?.phone) {
    return userStore.profile.phoneVerified ? "手机号已认证" : "手机号未认证";
  }
  if (userStore.profile?.email || authStore.user?.email) {
    return userStore.profile?.emailVerified || authStore.user?.emailVerified
      ? "邮箱已认证"
      : "邮箱未认证";
  }
  return "未绑定联系方式";
});

const passwordStrength = computed(() => {
  const pw = passwordForm.newPassword;
  if (!pw) return 0;
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw) || /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return Math.min(score, 3);
});
const passwordStrengthLabel = computed(() => ({ 1: "弱", 2: "中", 3: "强" }[passwordStrength.value] ?? ""));
const passwordStrengthColor = computed(() => ({ 1: "bg-coral", 2: "bg-amber-400", 3: "bg-moss" }[passwordStrength.value] ?? "bg-line"));

function syncProfileForm() {
  if (!userStore.profile) return;
  Object.assign(profileForm, {
    nickname: userStore.profile.nickname ?? "",
    email: userStore.profile.email ?? "",
    avatar: userStore.profile.avatar ?? "",
    bio: userStore.profile.bio ?? "",
  });
}
watch(() => userStore.profile, syncProfileForm, { deep: true });

function enterEditProfile() { syncProfileForm(); userStore.notice = ""; userStore.errorMessage = ""; mode.value = "edit-profile"; }
function enterEditPassword() { Object.assign(passwordForm, { oldPassword: "", newPassword: "", confirmPassword: "" }); passwordError.value = ""; userStore.notice = ""; userStore.errorMessage = ""; mode.value = "edit-password"; }
function cancelEdit() { mode.value = "view"; userStore.notice = ""; userStore.errorMessage = ""; }

async function saveProfile() {
  const saved = await userStore.updateProfile({
    nickname: profileForm.nickname.trim() || null,
    avatar: profileForm.avatar.trim() || null,
    bio: profileForm.bio.trim() || null,
    email: profileForm.email.trim() || null,
  });
  if (saved) {
    if (userStore.profile && authStore.user) {
      authStore.persistUser({
        ...authStore.user,
        email: userStore.profile.email,
        phone: userStore.profile.phone,
        nickname: userStore.profile.nickname,
        avatar: userStore.profile.avatar,
        emailVerified: userStore.profile.emailVerified,
        phoneVerified: userStore.profile.phoneVerified,
      });
    }
    if (userStore.profile) {
      syncProfileForm();
    }
    mode.value = "view";
  }
}

function triggerAvatarPicker() { avatarFileInput.value?.click(); }

async function handleAvatarFileChange(event: Event) {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;
  const url = await userStore.uploadAvatar(file);
  if (url) { profileForm.avatar = url; if (authStore.user) authStore.persistUser({ ...authStore.user, avatar: url }); }
  target.value = "";
}

async function changePassword() {
  passwordError.value = "";
  if (!passwordForm.oldPassword || !passwordForm.newPassword) { passwordError.value = "请填写旧密码和新密码。"; return; }
  if (passwordForm.newPassword.length < 8) { passwordError.value = "新密码至少需要 8 位。"; return; }
  if (passwordForm.newPassword !== passwordForm.confirmPassword) { passwordError.value = "两次输入的新密码不一致。"; return; }
  const saved = await userStore.changePassword({ oldPassword: passwordForm.oldPassword, newPassword: passwordForm.newPassword });
  if (saved) { Object.assign(passwordForm, { oldPassword: "", newPassword: "", confirmPassword: "" }); mode.value = "view"; }
}

function notificationTypeLabel(type: string) {
  return ({ reply: "回复通知", like: "点赞通知", system: "系统通知" } as Record<string, string>)[type] ?? "通知";
}

onMounted(async () => {
  await Promise.allSettled([userStore.loadProfile(), userStore.loadFavorites(), userStore.loadNotifications(), ecosystemStore.loadMyPurchases()]);
  syncProfileForm();
});
</script>

<template>
  <section class="content-shell py-10 md:py-14">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p class="eyebrow">Community</p>
        <h1 class="mt-2 font-display text-5xl text-brand md:text-6xl">个人中心</h1>
        <p class="mt-4 max-w-2xl leading-7 text-ink/66">管理资料、查看收藏和处理站内通知。</p>
      </div>
      <RouterLink class="focus-ring ui-button-secondary px-4 py-2" to="/">返回首页</RouterLink>
    </div>

    <p v-if="userStore.notice" class="mt-6 rounded-md border border-moss/25 bg-white px-4 py-3 text-sm text-moss">{{ userStore.notice }}</p>
    <p v-if="userStore.errorMessage" class="mt-6 rounded-md border border-coral/25 bg-coral/10 px-4 py-3 text-sm text-coral">{{ userStore.errorMessage }}</p>

    <div class="mt-8 grid gap-6 lg:grid-cols-[minmax(0,0.82fr)_1fr]">
      <!-- 左栏 -->
      <div class="grid gap-6 self-start">

        <!-- 展示态 -->
        <template v-if="mode === 'view'">
          <section class="ui-surface p-6">
            <div class="flex items-center gap-5">
              <div class="flex-shrink-0">
                <img v-if="userStore.profile?.avatar" class="h-20 w-20 rounded-xl border border-line object-cover" :src="userStore.profile.avatar" :alt="`${displayName} 的头像`" width="80" height="80" loading="lazy" />
                <div v-else class="grid h-20 w-20 place-items-center rounded-xl border border-line bg-paper font-display text-4xl text-brand">{{ avatarInitial }}</div>
              </div>
              <div class="min-w-0">
                <h2 class="truncate font-display text-4xl text-brand">{{ displayName }}</h2>
                <p class="mt-1 text-sm text-ink/56">{{ primaryContact }}</p>
                <p class="mt-0.5 text-xs text-ink/40">{{ contactVerificationLabel }}</p>
                <p class="mt-0.5 text-xs text-ink/40">@{{ userStore.profile?.username || authStore.user?.username }}</p>
              </div>
            </div>
            <p v-if="userStore.profile?.bio" class="mt-4 leading-7 text-ink/72">{{ userStore.profile.bio }}</p>
            <div class="mt-5 grid grid-cols-2 gap-3">
              <div class="rounded-md border border-line bg-paper p-4">
                <p class="text-sm text-ink/56">收藏文章</p>
                <p class="mt-1 font-display text-4xl text-brand">{{ userStore.profile?.favoriteCount ?? userStore.favorites.length }}</p>
              </div>
              <div class="rounded-md border border-line bg-paper p-4">
                <p class="text-sm text-ink/56">评论 / 留言</p>
                <p class="mt-1 font-display text-4xl text-brand">{{ userStore.profile?.commentCount ?? 0 }}</p>
              </div>
            </div>
            <div class="mt-6 flex flex-wrap gap-3">
              <button type="button" class="focus-ring ui-button-primary px-5 py-2.5" @click="enterEditProfile">编辑资料</button>
              <button type="button" class="focus-ring ui-button-secondary px-5 py-2.5" @click="enterEditPassword">修改密码</button>
            </div>
          </section>
        </template>

        <!-- 编辑资料态 -->
        <template v-else-if="mode === 'edit-profile'">
          <section class="ui-surface p-6">
            <div class="mb-5 flex items-center justify-between gap-3">
              <div><p class="eyebrow">Profile</p><h2 class="mt-1 font-display text-3xl text-brand">编辑资料</h2></div>
              <button type="button" class="focus-ring text-sm text-ink/48 hover:text-ink" @click="cancelEdit">← 取消</button>
            </div>
            <form class="grid gap-4" @submit.prevent="saveProfile">
              <!-- 头像 -->
              <div>
                <span class="text-sm font-semibold text-ink/60">头像</span>
                <div class="mt-2 flex items-center gap-4">
                  <div class="relative flex-shrink-0">
                    <img v-if="profileForm.avatar" class="h-16 w-16 rounded-xl border border-line object-cover" :src="profileForm.avatar" alt="头像预览" width="64" height="64" />
                    <div v-else class="grid h-16 w-16 place-items-center rounded-xl border border-line bg-paper font-display text-3xl text-brand">{{ avatarInitial }}</div>
                    <button type="button" class="absolute inset-0 flex items-center justify-center rounded-xl bg-ink/40 opacity-0 transition-opacity hover:opacity-100 focus:opacity-100" :class="{ 'opacity-100': userStore.avatarUploading }" :disabled="userStore.avatarUploading" :title="userStore.avatarUploading ? '上传中…' : '点击更换头像'" @click="triggerAvatarPicker">
                      <span v-if="userStore.avatarUploading" class="text-xl">⏳</span>
                      <span v-else class="text-xl text-white">📷</span>
                    </button>
                    <input ref="avatarFileInput" type="file" accept="image/jpeg,image/png,image/webp,image/gif" class="hidden" @change="handleAvatarFileChange" />
                  </div>
                  <div class="min-w-0 flex-1">
                    <div class="flex gap-2">
                      <input v-model="profileForm.avatar" class="focus-ring min-w-0 flex-1 rounded-md border border-line px-3 py-2" type="text" maxlength="500" placeholder="https://… 或点击右侧上传" />
                      <button type="button" class="focus-ring flex-shrink-0 rounded-md border border-line px-3 py-2 text-sm hover:border-brand hover:text-brand disabled:opacity-50" :disabled="userStore.avatarUploading" @click="triggerAvatarPicker">{{ userStore.avatarUploading ? "上传中…" : "上传图片" }}</button>
                    </div>
                    <p class="mt-1 text-xs text-ink/40">支持 JPG / PNG / WebP / GIF，最大 2 MB</p>
                  </div>
                </div>
              </div>
              <!-- 昵称 -->
              <label>
                <span class="text-sm font-semibold text-ink/60">昵称</span>
                <input v-model="profileForm.nickname" class="focus-ring mt-2 w-full rounded-md border border-line px-3 py-2" type="text" maxlength="100" placeholder="留空将显示用户名" />
              </label>
              <!-- 邮箱 -->
              <label>
                <span class="text-sm font-semibold text-ink/60">邮箱</span>
                <input v-model="profileForm.email" class="focus-ring mt-2 w-full rounded-md border border-line px-3 py-2" type="email" maxlength="255" placeholder="your@email.com" />
                <p class="mt-1 text-xs text-ink/40">手机号注册账号可在这里补充邮箱；修改后需重新认证。</p>
              </label>
              <label v-if="userStore.profile?.phone">
                <span class="text-sm font-semibold text-ink/60">手机号</span>
                <input :value="userStore.profile.phone" class="mt-2 w-full rounded-md border border-line bg-paper px-3 py-2 text-ink/60" type="text" readonly />
              </label>
              <!-- 简介 -->
              <label>
                <span class="text-sm font-semibold text-ink/60">个人简介</span>
                <textarea v-model="profileForm.bio" class="focus-ring mt-2 min-h-28 w-full resize-y rounded-md border border-line px-3 py-2" maxlength="500" placeholder="介绍一下自己…"></textarea>
                <p class="mt-1 text-right text-xs text-ink/40">{{ profileForm.bio.length }} / 500</p>
              </label>
              <div class="flex flex-wrap gap-3">
                <button class="focus-ring ui-button-primary w-fit px-5 py-2.5" :disabled="userStore.saving" type="submit">{{ userStore.saving ? "正在保存…" : "保存资料" }}</button>
                <button type="button" class="focus-ring ui-button-secondary w-fit px-5 py-2.5" @click="cancelEdit">取消</button>
              </div>
            </form>
          </section>
        </template>

        <!-- 修改密码态 -->
        <template v-else-if="mode === 'edit-password'">
          <section class="ui-surface p-6">
            <div class="mb-5 flex items-center justify-between gap-3">
              <div><p class="eyebrow">Security</p><h2 class="mt-1 font-display text-3xl text-brand">修改密码</h2></div>
              <button type="button" class="focus-ring text-sm text-ink/48 hover:text-ink" @click="cancelEdit">← 取消</button>
            </div>
            <p v-if="passwordError" class="mb-4 rounded-md border border-coral/25 bg-coral/10 px-4 py-3 text-sm text-coral">{{ passwordError }}</p>
            <form class="grid gap-4" @submit.prevent="changePassword">
              <label>
                <span class="text-sm font-semibold text-ink/60">旧密码</span>
                <input v-model="passwordForm.oldPassword" autocomplete="current-password" class="focus-ring mt-2 w-full rounded-md border border-line px-3 py-2" type="password" placeholder="当前密码" />
              </label>
              <label>
                <span class="text-sm font-semibold text-ink/60">新密码</span>
                <input v-model="passwordForm.newPassword" autocomplete="new-password" class="focus-ring mt-2 w-full rounded-md border border-line px-3 py-2" minlength="8" type="password" placeholder="至少 8 位" />
                <div v-if="passwordForm.newPassword" class="mt-2 flex items-center gap-2">
                  <div class="flex flex-1 gap-1">
                    <div v-for="i in 3" :key="i" class="h-1.5 flex-1 rounded-full transition-colors" :class="i <= passwordStrength ? passwordStrengthColor : 'bg-line'"></div>
                  </div>
                  <span class="text-xs text-ink/56">{{ passwordStrengthLabel }}</span>
                </div>
              </label>
              <label>
                <span class="text-sm font-semibold text-ink/60">确认新密码</span>
                <input v-model="passwordForm.confirmPassword" autocomplete="new-password" class="focus-ring mt-2 w-full rounded-md border border-line px-3 py-2" :class="{ 'border-coral': passwordForm.confirmPassword && passwordForm.confirmPassword !== passwordForm.newPassword, 'border-moss': passwordForm.confirmPassword && passwordForm.confirmPassword === passwordForm.newPassword }" minlength="8" type="password" />
              </label>
              <div class="flex flex-wrap gap-3">
                <button class="focus-ring ui-button-primary w-fit px-5 py-2.5" :disabled="userStore.saving" type="submit">{{ userStore.saving ? "提交中…" : "确认修改" }}</button>
                <button type="button" class="focus-ring ui-button-secondary w-fit px-5 py-2.5" @click="cancelEdit">取消</button>
              </div>
            </form>
          </section>
        </template>
      </div>

      <!-- 右栏：收藏 / 已购 / 通知 -->
      <div class="grid gap-6">
        <section class="ui-surface p-6">
          <div><p class="eyebrow">Favorites</p><h2 class="mt-2 font-display text-4xl text-brand">收藏的文章</h2></div>
          <div v-if="userStore.favorites.length" class="mt-5 grid gap-3">
            <RouterLink v-for="favorite in userStore.favorites" :key="favorite.id" class="focus-ring grid gap-2 rounded-md border border-line bg-paper p-4 hover:border-brand" :to="`/articles/${favorite.article.slug}`">
              <p class="font-semibold text-brand">{{ favorite.article.title }}</p>
              <p class="line-clamp-2 text-sm leading-6 text-ink/64">{{ favorite.article.excerpt }}</p>
              <p class="text-xs text-ink/48">收藏于 {{ new Date(favorite.favoritedAt).toLocaleString("zh-CN") }}</p>
            </RouterLink>
          </div>
          <p v-else class="mt-5 rounded-md border border-line bg-paper p-4 text-ink/60">还没有收藏文章。读到喜欢的内容时，可以在详情页点收藏。</p>
        </section>

        <section class="ui-surface p-6">
          <div><p class="eyebrow">Purchases</p><h2 class="mt-2 font-display text-4xl text-brand">已购内容</h2></div>
          <div v-if="ecosystemStore.myPurchases.length" class="mt-5 grid gap-3">
            <article v-for="purchase in ecosystemStore.myPurchases" :key="purchase.id" class="rounded-md border border-line bg-paper p-4">
              <div class="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <RouterLink v-if="purchase.articleSlug" class="font-semibold text-brand hover:text-coral" :to="`/articles/${purchase.articleSlug}`">{{ purchase.articleTitle || purchase.articleSlug }}</RouterLink>
                  <p v-else class="font-semibold text-brand">{{ purchase.articleTitle || "付费内容" }}</p>
                  <p class="mt-2 text-sm text-ink/56">支付方式：{{ purchase.paymentMethod || "manual" }}</p>
                </div>
                <div class="text-right">
                  <p class="font-display text-3xl text-brand">￥{{ Number(purchase.paidAmount || 0).toFixed(2) }}</p>
                  <p class="mt-2 text-xs text-ink/48">{{ new Date(purchase.purchasedAt).toLocaleString("zh-CN") }}</p>
                </div>
              </div>
            </article>
          </div>
          <p v-else class="mt-5 rounded-md border border-line bg-paper p-4 text-ink/60">还没有已购内容记录。</p>
        </section>

        <section class="ui-surface p-6">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p class="eyebrow">Notifications</p>
              <h2 class="mt-2 font-display text-4xl text-brand">消息通知<span v-if="userStore.unreadCount" class="align-middle font-body text-base text-coral"> {{ userStore.unreadCount }} 未读</span></h2>
            </div>
            <button class="focus-ring ui-button-secondary px-4 py-2 text-sm" type="button" @click="userStore.markAllNotificationsRead()">全部已读</button>
          </div>
          <div v-if="userStore.notifications.length" class="mt-5 grid gap-3">
            <article v-for="notification in userStore.notifications" :key="notification.id" class="rounded-md border border-line bg-paper p-4" :class="{ 'border-coral/50 bg-coral/5': !notification.isRead }">
              <div class="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p class="text-xs font-semibold text-coral">{{ notificationTypeLabel(notification.type) }}</p>
                  <h3 class="mt-1 font-semibold text-brand">{{ notification.title }}</h3>
                </div>
                <p class="text-xs text-ink/48">{{ new Date(notification.createdAt).toLocaleString("zh-CN") }}</p>
              </div>
              <p v-if="notification.content" class="mt-3 leading-7 text-ink/64">{{ notification.content }}</p>
              <div class="mt-4 flex flex-wrap gap-2">
                <button v-if="!notification.isRead" class="focus-ring min-h-9 rounded-md border border-line px-3 py-1 text-sm hover:border-brand hover:text-brand" type="button" @click="userStore.markNotificationRead(notification.id)">标记已读</button>
                <button class="focus-ring min-h-9 rounded-md border border-line px-3 py-1 text-sm hover:border-coral hover:text-coral" type="button" @click="userStore.deleteNotification(notification.id)">删除</button>
              </div>
            </article>
          </div>
          <p v-else class="mt-5 rounded-md border border-line bg-paper p-4 text-ink/60">暂无通知。</p>
        </section>
      </div>
    </div>
  </section>
</template>
