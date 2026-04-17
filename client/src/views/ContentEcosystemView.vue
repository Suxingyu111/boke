<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import heroImage from "@/assets/hero.png";
import { getApiErrorMessage } from "@/api/auth";
import { useEcosystemStore } from "@/stores/ecosystem";

const ecosystemStore = useEcosystemStore();
const subscriptionForm = reactive({
  name: "",
  email: "",
});
const subscriptionError = ref("");

const totalArchiveArticles = computed(() =>
  ecosystemStore.archiveMonths.reduce((sum, item) => sum + item.count, 0),
);
const firstSearchResult = computed(() => ecosystemStore.searchResults[0]);
const archiveCards = computed(() =>
  ecosystemStore.archiveMonths.map((item) => ({
    ...item,
    monthLabel: `${item.year}.${String(item.month).padStart(2, "0")}`,
    title: `${item.year} 年 ${item.month} 月`,
    summary: "后端按已发布文章的发布时间自动聚合。",
  })),
);
const ecosystemStats = computed(() => [
  {
    label: "归档文章",
    value: String(totalArchiveArticles.value),
    note: "来自 GET /api/archives",
  },
  {
    label: "搜索结果",
    value: String(ecosystemStore.searchMeta.total),
    note: "来自 GET /api/search",
  },
  {
    label: "订阅入口",
    value: "实时",
    note: "提交到 POST /api/subscriptions",
  },
]);

const searchSignals = [
  "Elasticsearch 全文索引",
  "标题 / 正文 / 标签加权",
  "高亮摘要与命中片段",
  "拼写容错与中文分词预留",
];

const collaborationUsers = [
  { name: "林", color: "#2f7c6e", action: "正在调整摘要" },
  { name: "周", color: "#c96b34", action: "留下 2 条评论" },
  { name: "许", color: "#1f4d6d", action: "刚完成校对" },
];

const paidTiers = [
  { name: "公开段落", detail: "标题、摘要、目录与前 20% 内容可读" },
  { name: "付费正文", detail: "登录后校验购买状态，再解锁完整正文" },
  { name: "作者收益", detail: "订单、阅读权限与内容状态独立记录" },
];

const notificationFlows = [
  {
    title: "评论通知",
    detail: "有人回复文章或评论时，向作者与相关讨论者发送邮件。",
  },
  {
    title: "新文章订阅",
    detail: "文章发布后进入订阅队列，按用户订阅状态触达。",
  },
];

const roadmap = [
  {
    step: "01",
    title: "搜索接入",
    detail: "后端写入 Elasticsearch，前端展示高亮命中与筛选入口。",
  },
  {
    step: "02",
    title: "归档公开",
    detail: "按年月生成文章索引，让长期内容有清晰的时间脉络。",
  },
  {
    step: "03",
    title: "协作与变现",
    detail: "把草稿协同、付费权限和邮件通知接成稳定生产链。",
  },
];

function renderHighlight(value?: string | null) {
  const escaped = (value || "等待搜索接口返回结果")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

  return escaped
    .replace(/&lt;mark&gt;/g, "<mark>")
    .replace(/&lt;\/mark&gt;/g, "</mark>");
}

async function selectArchive(year: number, month: number) {
  try {
    await ecosystemStore.loadArchiveArticles(year, month);
  } catch {
    // 错误信息已在 store 中转换为中文。
  }
}

async function submitSubscription() {
  subscriptionError.value = "";
  const email = subscriptionForm.email.trim();
  if (!email.includes("@")) {
    subscriptionError.value = "请输入有效邮箱。";
    return;
  }

  try {
    await ecosystemStore.subscribe({
      email,
      name: subscriptionForm.name.trim() || undefined,
    });
    subscriptionForm.email = "";
    subscriptionForm.name = "";
  } catch (error) {
    subscriptionError.value = getApiErrorMessage(error, "订阅提交失败");
  }
}

onMounted(async () => {
  await Promise.allSettled([
    ecosystemStore.loadArchives(),
    ecosystemStore.searchArticles({ page: 1, pageSize: 3 }),
  ]);
});
</script>

<template>
  <section
    class="relative overflow-hidden border-b border-line/70 bg-ink text-white"
  >
    <img
      class="absolute inset-0 h-full w-full object-cover opacity-34 mix-blend-luminosity"
      :src="heroImage"
      alt="内容工作台"
      width="1200"
      height="800"
    />
    <div class="absolute inset-0 bg-[rgba(16,20,26,0.68)]"></div>
    <div
      class="content-shell relative grid gap-8 py-14 md:py-16 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end"
    >
      <div class="max-w-4xl">
        <p class="text-sm font-semibold text-citron">Content Ecosystem</p>
        <h1
          class="mt-4 font-display text-5xl leading-tight text-white md:text-7xl"
        >
          内容生态
        </h1>
        <p class="mt-5 max-w-3xl text-lg leading-8 text-white/82">
          搜索、归档、协作、付费和邮件通知被放进同一条内容生产线。写作不再只是发布一篇文章，而是一套能被发现、沉淀、协同和持续触达的系统。
        </p>
        <div class="mt-8 flex flex-wrap gap-3">
          <RouterLink
            class="focus-ring min-h-11 rounded-md bg-white px-5 py-3 font-semibold text-brand shadow-lifted hover:-translate-y-0.5"
            to="/search"
          >
            体验全文搜索
          </RouterLink>
          <RouterLink
            class="focus-ring min-h-11 rounded-md border border-white/38 bg-white/10 px-5 py-3 font-semibold text-white hover:bg-white/18"
            to="/admin/articles"
          >
            进入草稿管理
          </RouterLink>
        </div>
      </div>

      <div
        class="grid gap-3 border-l border-white/22 pl-5 text-sm text-white/76"
        aria-label="内容生态概览"
      >
        <div v-for="stat in ecosystemStats" :key="stat.label">
          <p class="font-display text-4xl leading-none text-white">
            {{ stat.value }}
          </p>
          <p class="mt-2 font-semibold text-citron">{{ stat.label }}</p>
          <p class="mt-1 leading-6">{{ stat.note }}</p>
        </div>
      </div>
    </div>
  </section>

  <section class="content-shell py-10 md:py-14">
    <div class="grid gap-6 lg:grid-cols-[minmax(0,0.96fr)_minmax(320px,1fr)]">
      <div class="rounded-md border border-line bg-white/88 p-5 shadow-lifted">
        <p class="text-sm font-semibold text-coral">全文搜索</p>
        <h2 class="mt-3 font-display text-4xl leading-tight text-brand">
          Elasticsearch 把旧文章重新点亮
        </h2>
        <p class="mt-4 leading-7 text-ink/72">
          搜索页会继续保留轻量输入体验，但检索能力升级为全文索引。标题、正文、摘要、分类和标签都参与召回，结果可以返回命中片段、排序分数和筛选条件。
        </p>
        <div class="mt-6 flex flex-wrap gap-2">
          <span
            v-for="signal in searchSignals"
            :key="signal"
            class="rounded-md border border-line bg-wash/80 px-3 py-2 text-sm font-semibold text-ink/74"
          >
            {{ signal }}
          </span>
        </div>
      </div>

      <div
        class="rounded-md border border-[rgba(31,77,109,0.22)] bg-[#10141a] p-5 text-white shadow-editorial"
      >
        <div class="flex items-center justify-between gap-3">
          <span class="font-mono text-sm text-citron">GET /api/search</span>
          <span class="rounded-md bg-moss px-2 py-1 text-xs font-semibold">
            实时接口
          </span>
        </div>
        <div class="mt-5 rounded-md bg-white/8 p-4 font-mono text-sm leading-7">
          <p>
            <span class="text-citron">query</span>
            <span class="text-white/54"> = </span>
            <span>"{{ firstSearchResult ? "latest" : "all" }}"</span>
          </p>
          <p>
            <span class="text-citron">score</span>
            <span class="text-white/54"> = </span>
            <span>{{
              typeof firstSearchResult?.score === "number"
                ? firstSearchResult.score.toFixed(2)
                : "database"
            }}</span>
          </p>
          <p>
            <span class="text-citron">highlight</span>
            <span class="text-white/54"> = </span>
            <span
              v-html="
                renderHighlight(
                  firstSearchResult?.contentHighlight ||
                    firstSearchResult?.excerpt ||
                    firstSearchResult?.title,
                )
              "
            ></span>
          </p>
        </div>
        <div class="mt-5 grid gap-3 sm:grid-cols-3">
          <div class="rounded-md border border-white/12 p-3">
            <p class="font-display text-3xl">标题</p>
            <p class="mt-1 text-sm text-white/62">权重 4.0</p>
          </div>
          <div class="rounded-md border border-white/12 p-3">
            <p class="font-display text-3xl">正文</p>
            <p class="mt-1 text-sm text-white/62">权重 2.0</p>
          </div>
          <div class="rounded-md border border-white/12 p-3">
            <p class="font-display text-3xl">标签</p>
            <p class="mt-1 text-sm text-white/62">权重 1.5</p>
          </div>
        </div>
      </div>
    </div>
  </section>

  <section class="border-y border-line/70 bg-white/52">
    <div
      class="content-shell grid gap-8 py-10 md:py-14 lg:grid-cols-[360px_1fr]"
    >
      <div>
        <p class="text-sm font-semibold text-coral">文章归档</p>
        <h2 class="mt-3 font-display text-4xl leading-tight text-brand">
          按年月回看写作轨迹
        </h2>
        <p class="mt-4 leading-7 text-ink/70">
          归档页按发布时间自动分组，既适合读者追溯主题，也方便作者观察内容节奏。
        </p>
      </div>

      <div class="grid gap-3">
        <article
          v-for="item in archiveCards"
          :key="item.monthLabel"
          class="grid gap-4 rounded-md border border-line bg-white/86 p-4 shadow-insetline md:grid-cols-[120px_1fr_auto] md:items-center"
        >
          <button
            class="focus-ring rounded-md text-left font-mono text-lg font-semibold text-brand hover:text-coral"
            type="button"
            @click="selectArchive(item.year, item.month)"
          >
            {{ item.monthLabel }}
          </button>
          <div>
            <h3 class="font-display text-3xl leading-tight text-ink">
              {{ item.title }}
            </h3>
            <p class="mt-2 leading-7 text-ink/68">{{ item.summary }}</p>
          </div>
          <p
            class="w-fit rounded-md border border-coral/28 bg-coral/10 px-3 py-2 text-sm font-semibold text-coral"
          >
            {{ item.count }} 篇
          </p>
        </article>
        <div
          v-if="ecosystemStore.selectedArchive?.articles.length"
          class="rounded-md border border-line bg-white/86 p-4 shadow-insetline"
        >
          <p class="text-sm font-semibold text-coral">
            {{ ecosystemStore.selectedArchive.year }} 年
            {{ ecosystemStore.selectedArchive.month }} 月文章
          </p>
          <div class="mt-4 grid gap-3">
            <RouterLink
              v-for="article in ecosystemStore.selectedArchive.articles"
              :key="article.id"
              class="focus-ring rounded-md border border-line bg-paper px-4 py-3 hover:border-brand hover:bg-white"
              :to="`/articles/${article.slug}`"
            >
              <p class="font-semibold text-brand">{{ article.title }}</p>
              <p class="mt-1 text-sm leading-6 text-ink/62">
                {{ article.excerpt || "暂无摘要" }}
              </p>
            </RouterLink>
          </div>
        </div>
        <p
          v-else-if="!ecosystemStore.loading"
          class="rounded-md border border-line bg-white/70 p-4 text-sm text-ink/60"
        >
          暂无可展示的归档文章。
        </p>
      </div>
    </div>
  </section>

  <section class="content-shell py-10 md:py-14">
    <div class="grid gap-6 lg:grid-cols-2">
      <div
        class="rounded-md border border-line bg-white/88 p-5 shadow-lifted md:p-6"
      >
        <p class="text-sm font-semibold text-coral">草稿协作</p>
        <h2 class="mt-3 font-display text-4xl leading-tight text-brand">
          多人同时靠近同一篇草稿
        </h2>
        <p class="mt-4 leading-7 text-ink/70">
          草稿编辑保留作者主线，同时允许校对、评论和共同编辑进入一个工作区。在线状态、段落讨论和版本记录会让协作更可控。
        </p>
        <div class="mt-6 grid gap-3">
          <div
            v-for="user in collaborationUsers"
            :key="user.name"
            class="flex items-center gap-3 rounded-md border border-line bg-wash/68 p-3"
          >
            <span
              class="grid h-11 w-11 shrink-0 place-items-center rounded-md font-semibold text-white"
              :style="{ backgroundColor: user.color }"
            >
              {{ user.name }}
            </span>
            <div>
              <p class="font-semibold text-ink">{{ user.action }}</p>
              <p class="mt-1 text-sm text-ink/60">草稿已自动保存</p>
            </div>
          </div>
        </div>
      </div>

      <div
        class="rounded-md border border-line bg-[linear-gradient(145deg,#fff_0%,#eef2f6_100%)] p-5 shadow-lifted md:p-6"
      >
        <p class="text-sm font-semibold text-coral">付费内容</p>
        <h2 class="mt-3 font-display text-4xl leading-tight text-brand">
          公开阅读和付费解锁分层共存
        </h2>
        <p class="mt-4 leading-7 text-ink/70">
          一篇文章可以先展示公开片段，再把深度正文放入付费区。前端负责清晰表达权限状态，让读者知道已经看到哪里、还能解锁什么。
        </p>
        <div
          class="mt-6 overflow-hidden rounded-md border border-line bg-white"
        >
          <div class="border-b border-line bg-ink px-4 py-3 text-white">
            <p class="font-semibold">付费文章预览</p>
            <p class="mt-1 text-sm text-white/64">解锁后继续阅读全文</p>
          </div>
          <div class="grid gap-3 p-4">
            <div
              v-for="tier in paidTiers"
              :key="tier.name"
              class="rounded-md border border-line bg-white/90 p-3"
            >
              <p class="font-semibold text-brand">{{ tier.name }}</p>
              <p class="mt-1 text-sm leading-6 text-ink/66">
                {{ tier.detail }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <section class="border-y border-line/70 bg-ink text-white">
    <div
      class="content-shell grid gap-8 py-10 md:py-14 lg:grid-cols-[0.8fr_1fr]"
    >
      <div>
        <p class="text-sm font-semibold text-citron">邮件通知</p>
        <h2 class="mt-3 font-display text-4xl leading-tight text-white">
          订阅请求直接进入后端队列
        </h2>
        <p class="mt-4 leading-7 text-white/72">
          读者留下邮箱后，前端会提交到订阅接口；确认邮件、退订令牌和后台通知记录交给服务端处理。
        </p>
        <form class="mt-6 grid gap-3" @submit.prevent="submitSubscription">
          <label class="block">
            <span class="text-sm text-white/62">称呼</span>
            <input
              v-model="subscriptionForm.name"
              class="focus-ring mt-2 w-full rounded-md border border-white/18 bg-white/10 px-3 py-2 text-white placeholder:text-white/42"
              placeholder="可留空"
              type="text"
            />
          </label>
          <label class="block">
            <span class="text-sm text-white/62">邮箱</span>
            <input
              v-model="subscriptionForm.email"
              class="focus-ring mt-2 w-full rounded-md border border-white/18 bg-white/10 px-3 py-2 text-white placeholder:text-white/42"
              placeholder="reader@example.com"
              type="email"
            />
          </label>
          <button
            class="focus-ring min-h-11 w-fit rounded-md bg-citron px-5 py-3 font-semibold text-ink hover:bg-white"
            :disabled="ecosystemStore.loading"
            type="submit"
          >
            订阅新文章
          </button>
          <p v-if="ecosystemStore.notice" class="text-sm text-citron">
            {{ ecosystemStore.notice }}
          </p>
          <p v-if="subscriptionError" class="text-sm text-coral">
            {{ subscriptionError }}
          </p>
        </form>
      </div>
      <div class="grid gap-4 md:grid-cols-2">
        <article
          v-for="flow in notificationFlows"
          :key="flow.title"
          class="rounded-md border border-white/12 bg-white/8 p-5"
        >
          <h3 class="font-display text-3xl leading-tight text-white">
            {{ flow.title }}
          </h3>
          <p class="mt-3 leading-7 text-white/70">{{ flow.detail }}</p>
          <div class="mt-5 h-2 rounded-md bg-white/12">
            <div class="h-2 w-3/4 rounded-md bg-citron"></div>
          </div>
        </article>
      </div>
    </div>
  </section>

  <section class="content-shell py-10 md:py-14">
    <div class="mb-7 max-w-3xl">
      <p class="text-sm font-semibold text-coral">落地路径</p>
      <h2 class="mt-3 font-display text-4xl leading-tight text-brand">
        从被搜索到被订阅
      </h2>
    </div>
    <div class="grid gap-4 md:grid-cols-3">
      <article
        v-for="item in roadmap"
        :key="item.step"
        class="rounded-md border border-line bg-white/86 p-5 shadow-insetline"
      >
        <p class="font-mono text-sm font-semibold text-coral">
          {{ item.step }}
        </p>
        <h3 class="mt-3 font-display text-3xl leading-tight text-ink">
          {{ item.title }}
        </h3>
        <p class="mt-3 leading-7 text-ink/68">{{ item.detail }}</p>
      </article>
    </div>
  </section>
</template>
