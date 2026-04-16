<script setup lang="ts">
import { onMounted, reactive, ref } from "vue";
import { getApiErrorMessage } from "@/api/auth";
import {
  usePagesStore,
  type FriendLinkApplicationPayload,
} from "@/stores/pages";

const pagesStore = usePagesStore();
const applicationNotice = ref("");
const applicationError = ref("");
const applicationLoading = ref(false);
const applicationForm = reactive<FriendLinkApplicationPayload>({
  siteName: "",
  siteUrl: "",
  description: "",
  contactEmail: "",
  applicantName: "",
});

onMounted(() => {
  void pagesStore.loadPublicFriendLinks().catch(() => undefined);
});

function getInitials(value: string) {
  return value.trim().slice(0, 2).toUpperCase();
}

function resetApplicationForm() {
  Object.assign(applicationForm, {
    siteName: "",
    siteUrl: "",
    description: "",
    contactEmail: "",
    applicantName: "",
  });
}

async function submitApplication() {
  applicationNotice.value = "";
  applicationError.value = "";
  const siteName = applicationForm.siteName.trim();
  const siteUrl = applicationForm.siteUrl.trim();

  if (!siteName) {
    applicationError.value = "请填写站点名称。";
    return;
  }

  if (!/^https?:\/\//i.test(siteUrl)) {
    applicationError.value = "站点链接需要以 http:// 或 https:// 开头。";
    return;
  }

  try {
    applicationLoading.value = true;
    await pagesStore.applyFriendLink({
      siteName,
      siteUrl,
      description: applicationForm.description.trim(),
      contactEmail: applicationForm.contactEmail.trim(),
      applicantName: applicationForm.applicantName.trim(),
    });
    applicationNotice.value = "申请已提交，审核通过后会展示在友情链接中。";
    resetApplicationForm();
  } catch (error) {
    applicationError.value = getApiErrorMessage(error, "友链申请提交失败");
  } finally {
    applicationLoading.value = false;
  }
}
</script>

<template>
  <section class="content-shell py-12">
    <p class="eyebrow">Friends</p>
    <h1 class="mt-2 font-display text-5xl">友情链接</h1>
    <p class="mt-4 max-w-2xl leading-7 text-ink/65">
      一些值得长期阅读的站点和工具。所有链接会在新标签页打开。
    </p>

    <p
      v-if="pagesStore.errorMessage"
      class="mt-6 rounded-md border border-coral/25 bg-coral/10 px-4 py-3 text-sm text-coral"
    >
      {{ pagesStore.errorMessage }}
    </p>

    <p v-if="pagesStore.loading" class="mt-6 text-sm text-ink/55">
      正在加载友情链接...
    </p>

    <div
      v-if="pagesStore.approvedLinks.length"
      class="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3"
    >
      <a
        v-for="link in pagesStore.approvedLinks"
        :key="link.id"
        class="focus-ring ui-surface ui-hover-lift grid gap-4 p-5"
        :href="link.siteUrl"
        rel="noreferrer"
        target="_blank"
      >
        <div class="flex items-start gap-4">
          <img
            v-if="link.logoUrl"
            class="h-14 w-14 rounded-md border border-line object-cover"
            :alt="`${link.siteName} 标识`"
            :src="link.logoUrl"
          />
          <div
            v-else
            class="grid h-14 w-14 place-items-center rounded-md border border-line bg-paper font-mono text-sm font-semibold text-moss"
            aria-hidden="true"
          >
            {{ getInitials(link.siteName) }}
          </div>
          <div class="min-w-0">
            <h2 class="font-display text-3xl">{{ link.siteName }}</h2>
            <p class="mt-1 break-all text-sm text-ink/50">
              {{ link.siteUrl }}
            </p>
          </div>
        </div>
        <p class="leading-7 text-ink/65">
          {{ link.description || "这个站点暂时还没有简介。" }}
        </p>
      </a>
    </div>

    <div v-else class="ui-surface mt-8 p-6">
      <h2 class="font-display text-3xl">暂无友链</h2>
      <p class="mt-3 text-ink/65">通过后台添加并审核后，会在这里展示。</p>
    </div>

    <section class="mt-12 grid gap-6 lg:grid-cols-[minmax(0,0.75fr)_1fr]">
      <div>
        <p class="eyebrow">Apply</p>
        <h2 class="mt-2 font-display text-4xl">申请友链</h2>
        <p class="mt-4 leading-7 text-ink/65">
          提交后会进入待审核状态。通过后，你的站点会出现在这里。
        </p>
      </div>

      <form
        class="ui-surface grid gap-4 p-5"
        @submit.prevent="submitApplication"
      >
        <div class="grid gap-4 md:grid-cols-2">
          <label>
            <span class="text-sm text-ink/60">站点名称</span>
            <input
              v-model="applicationForm.siteName"
              class="focus-ring mt-2 w-full rounded-md border border-line px-3 py-2"
              maxlength="100"
              type="text"
            />
          </label>
          <label>
            <span class="text-sm text-ink/60">站点链接</span>
            <input
              v-model="applicationForm.siteUrl"
              class="focus-ring mt-2 w-full rounded-md border border-line px-3 py-2"
              maxlength="255"
              placeholder="https://example.com"
              type="url"
            />
          </label>
        </div>

        <label>
          <span class="text-sm text-ink/60">站点简介</span>
          <textarea
            v-model="applicationForm.description"
            class="focus-ring mt-2 min-h-24 w-full resize-y rounded-md border border-line px-3 py-2"
            maxlength="255"
          ></textarea>
        </label>

        <div class="grid gap-4 md:grid-cols-2">
          <label>
            <span class="text-sm text-ink/60">申请人</span>
            <input
              v-model="applicationForm.applicantName"
              class="focus-ring mt-2 w-full rounded-md border border-line px-3 py-2"
              maxlength="100"
              type="text"
            />
          </label>
          <label>
            <span class="text-sm text-ink/60">联系邮箱</span>
            <input
              v-model="applicationForm.contactEmail"
              class="focus-ring mt-2 w-full rounded-md border border-line px-3 py-2"
              maxlength="255"
              type="email"
            />
          </label>
        </div>

        <p
          v-if="applicationNotice"
          class="rounded-md border border-moss bg-paper px-3 py-2 text-sm text-moss"
        >
          {{ applicationNotice }}
        </p>
        <p v-if="applicationError" class="text-sm text-coral">
          {{ applicationError }}
        </p>

        <button
          class="focus-ring ui-button-primary w-fit px-5 py-3"
          :disabled="applicationLoading"
          type="submit"
        >
          {{ applicationLoading ? "正在提交..." : "提交申请" }}
        </button>
      </form>
    </section>
  </section>
</template>
