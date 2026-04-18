<script setup lang="ts">
import { onMounted, reactive } from "vue";
import { useCommunityStore } from "@/stores/community";

const communityStore = useCommunityStore();
const form = reactive({
  nickname: "",
  email: "",
  content: "",
});

async function submitMessage() {
  const nickname = form.nickname.trim();
  const email = form.email.trim();
  const content = form.content.trim();

  if (!nickname || !email || !content) {
    communityStore.errorMessage = "昵称、邮箱和留言内容都要填写。";
    return;
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    communityStore.errorMessage = "请填写有效邮箱。";
    return;
  }

  const message = await communityStore.submitGuestbookMessage({
    nickname,
    email,
    content,
  });

  if (message) {
    Object.assign(form, { nickname: "", email: "", content: "" });
  }
}

onMounted(() => {
  void communityStore.loadGuestbook();
});
</script>

<template>
  <section class="content-shell py-10 md:py-14">
    <div class="grid gap-8 lg:grid-cols-[minmax(0,0.78fr)_1fr] lg:items-start">
      <div>
        <p class="eyebrow">Guestbook</p>
        <h1 class="mt-2 font-display text-5xl text-brand md:text-6xl">
          留言板
        </h1>
        <p class="mt-4 max-w-xl leading-7 text-ink/66">
          留下一句近况、建议或想交换的想法。这里比评论区慢一点，也更适合认真说话。
        </p>

        <form
          class="ui-surface mt-8 grid gap-4 p-5 md:p-6"
          @submit.prevent="submitMessage"
        >
          <div class="grid gap-4 md:grid-cols-2">
            <label>
              <span class="text-sm font-semibold text-ink/60">昵称</span>
              <input
                v-model="form.nickname"
                class="focus-ring mt-2 w-full rounded-md border border-line px-3 py-2"
                maxlength="60"
                type="text"
              />
            </label>
            <label>
              <span class="text-sm font-semibold text-ink/60">邮箱</span>
              <input
                v-model="form.email"
                class="focus-ring mt-2 w-full rounded-md border border-line px-3 py-2"
                maxlength="120"
                type="email"
              />
            </label>
          </div>
          <label>
            <span class="text-sm font-semibold text-ink/60">留言内容</span>
            <textarea
              v-model="form.content"
              class="focus-ring mt-2 min-h-40 w-full resize-y rounded-md border border-line px-3 py-2 leading-7"
              maxlength="1000"
            ></textarea>
          </label>

          <p
            v-if="communityStore.notice"
            class="rounded-md border border-moss/25 bg-moss/10 px-3 py-2 text-sm text-moss"
          >
            {{ communityStore.notice }}
          </p>
          <p
            v-if="communityStore.errorMessage"
            class="rounded-md border border-coral/25 bg-coral/10 px-3 py-2 text-sm text-coral"
          >
            {{ communityStore.errorMessage }}
          </p>

          <button
            class="focus-ring ui-button-primary w-fit px-5 py-3"
            :disabled="communityStore.saving"
            type="submit"
          >
            {{ communityStore.saving ? "正在提交..." : "发布留言" }}
          </button>
        </form>
      </div>

      <div class="grid gap-4">
        <article
          v-for="message in communityStore.guestbookMessages"
          :key="message.id"
          class="ui-surface p-5"
        >
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 class="font-display text-3xl text-brand">
                {{ message.nickname }}
              </h2>
              <p class="text-sm text-ink/48">
                {{ new Date(message.createdAt).toLocaleString("zh-CN") }}
              </p>
            </div>
            <span
              class="rounded-md border border-line bg-paper px-2 py-1 text-xs text-ink/55"
            >
              {{ message.status === "published" ? "已发布" : "审核中" }}
            </span>
          </div>
          <p class="mt-4 whitespace-pre-wrap leading-8 text-ink/70">
            {{ message.content }}
          </p>
        </article>

        <p
          v-if="!communityStore.loading && !communityStore.guestbookMessages.length"
          class="ui-surface p-5 text-ink/62"
        >
          还没有留言。第一条就留给你。
        </p>
      </div>
    </div>
  </section>
</template>
