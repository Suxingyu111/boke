<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { useCommunityStore } from "@/stores/community";

const communityStore = useCommunityStore();
const form = reactive({ nickname: "", email: "", content: "" });
const formFocused = ref(false);

const MAX_CONTENT = 1000;
const charCount = computed(() => form.content.length);
const charPct  = computed(() => Math.min(charCount.value / MAX_CONTENT, 1));

const AVATAR_PALETTE = [
  ["#1f4d6d", "#d6eaf6"], ["#2f7c6e", "#d4f0eb"], ["#c96b34", "#fbe8d8"],
  ["#6d3d1f", "#f5e4d4"], ["#4a5568", "#e8ecf1"], ["#6b4d8c", "#ede0f5"],
];

function getAvatar(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_PALETTE[Math.abs(h) % AVATAR_PALETTE.length];
}

function getInitials(name: string): string {
  return name.trim().slice(0, 2);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("zh-CN", {
    year: "numeric", month: "long", day: "numeric",
  });
}

function formatTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);
  if (mins  < 1)  return "刚刚";
  if (mins  < 60) return `${mins} 分钟前`;
  if (hours < 24) return `${hours} 小时前`;
  if (days  < 30) return `${days} 天前`;
  return formatDate(dateStr);
}

// Group messages by date for timeline separators
type MsgWithGroup = (typeof communityStore.guestbookMessages[0]) & { _dateKey: string };
const grouped = computed<{ dateKey: string; msgs: MsgWithGroup[] }[]>(() => {
  const map = new Map<string, MsgWithGroup[]>();
  for (const m of communityStore.guestbookMessages) {
    const key = new Date(m.createdAt).toLocaleDateString("zh-CN");
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push({ ...m, _dateKey: key });
  }
  return Array.from(map.entries()).map(([dateKey, msgs]) => ({ dateKey, msgs }));
});

async function submitMessage() {
  const nickname = form.nickname.trim();
  const email    = form.email.trim();
  const content  = form.content.trim();

  if (!nickname || !email || !content) {
    communityStore.errorMessage = "昵称、邮箱和留言内容都要填写。";
    return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    communityStore.errorMessage = "请填写有效邮箱。";
    return;
  }

  const message = await communityStore.submitGuestbookMessage({ nickname, email, content });
  if (message) Object.assign(form, { nickname: "", email: "", content: "" });
}

onMounted(() => { void communityStore.loadGuestbook(); });
</script>

<template>
  <div class="gb-page">

    <!-- ═══ MASTHEAD ══════════════════════════════════════════ -->
    <section class="gb-mast" aria-label="留言板页头">
      <!-- Noise texture overlay -->
      <div class="gb-mast__noise" aria-hidden="true"></div>

      <!-- Floating decorative circles -->
      <div class="gb-mast__orb gb-mast__orb--a" aria-hidden="true"></div>
      <div class="gb-mast__orb gb-mast__orb--b" aria-hidden="true"></div>

      <div class="gb-mast__inner">
        <!-- Eyebrow row -->
        <div class="gb-mast__eyebrow-row">
          <span class="gb-mast__tag">
            <svg viewBox="0 0 12 12" fill="currentColor" aria-hidden="true"><circle cx="6" cy="6" r="3.5"/></svg>
            GUESTBOOK
          </span>
          <span class="gb-mast__sep" aria-hidden="true">/</span>
          <span class="gb-mast__count">
            {{ communityStore.loading ? "…" : `${communityStore.guestbookMessages.length} 条留言` }}
          </span>
        </div>

        <!-- Title -->
        <h1 class="gb-mast__title">
          <span class="gb-mast__title-line">留</span>
          <span class="gb-mast__title-line gb-mast__title-line--offset">言</span>
          <span class="gb-mast__title-line">板</span>
        </h1>

        <!-- Tagline -->
        <p class="gb-mast__tagline">
          留下一句近况或建议——这里比评论区慢一点，也更适合认真说话。
        </p>

        <!-- Scroll hint -->
        <div class="gb-mast__scroll-hint" aria-hidden="true">
          <span>向下探索</span>
          <svg viewBox="0 0 20 28" fill="none">
            <rect x="1" y="1" width="18" height="26" rx="9" stroke="currentColor" stroke-width="1.5"/>
            <rect class="gb-scroll-nub" x="8.5" y="6" width="3" height="5" rx="1.5" fill="currentColor"/>
          </svg>
        </div>
      </div>
    </section>

    <!-- ═══ BODY ═════════════════════════════════════════════ -->
    <div class="gb-body">

      <!-- ── TIMELINE (right / main) ─────────────────────── -->
      <main class="gb-timeline" id="main-content">

        <!-- Loading skeletons -->
        <template v-if="communityStore.loading">
          <div v-for="i in 4" :key="i" class="gb-skel" :style="{ animationDelay: `${i * 70}ms` }">
            <div class="gb-skel__dot"></div>
            <div class="gb-skel__card">
              <div class="gb-skel__head"></div>
              <div class="gb-skel__line gb-skel__line--a"></div>
              <div class="gb-skel__line gb-skel__line--b"></div>
            </div>
          </div>
        </template>

        <!-- Date-grouped timeline entries -->
        <template v-else-if="communityStore.guestbookMessages.length">
          <template v-for="(group, gi) in grouped" :key="group.dateKey">
            <!-- Date separator -->
            <div class="gb-date-sep">
              <span>{{ group.dateKey }}</span>
            </div>

            <!-- Messages in this group -->
            <article
              v-for="(msg, mi) in group.msgs"
              :key="msg.id"
              class="gb-entry"
              :style="{ animationDelay: `${(gi * 4 + mi) * 60}ms` }"
            >
              <!-- Timeline dot -->
              <div
                class="gb-entry__dot"
                :style="{ background: getAvatar(msg.nickname)[0] }"
                aria-hidden="true"
              ></div>

              <!-- Bubble -->
              <div class="gb-bubble">
                <!-- Bubble header -->
                <div class="gb-bubble__head">
                  <div
                    class="gb-avatar"
                    :style="{
                      background: getAvatar(msg.nickname)[1],
                      color: getAvatar(msg.nickname)[0],
                    }"
                    aria-hidden="true"
                  >{{ getInitials(msg.nickname) }}</div>

                  <div class="gb-bubble__meta">
                    <span class="gb-bubble__name">{{ msg.nickname }}</span>
                    <time class="gb-bubble__time" :datetime="msg.createdAt" :title="formatDate(msg.createdAt)">
                      {{ formatTime(msg.createdAt) }}
                    </time>
                  </div>

                  <span v-if="msg.status !== 'published'" class="gb-badge" aria-label="待审核">
                    <span class="gb-badge__dot" aria-hidden="true"></span>审核中
                  </span>
                </div>

                <!-- Content -->
                <p class="gb-bubble__text">{{ msg.content }}</p>
              </div>
            </article>
          </template>
        </template>

        <!-- Empty state -->
        <div v-else class="gb-empty">
          <div class="gb-empty__stamp" aria-hidden="true">
            <svg viewBox="0 0 96 96" fill="none">
              <path d="M16 28C16 23.582 19.582 20 24 20H72C76.418 20 80 23.582 80 28V64C80 68.418 76.418 72 72 72H24C19.582 72 16 68.418 16 64V28Z" stroke="#1f4d6d" stroke-width="1.8" stroke-dasharray="5 3" opacity="0.3"/>
              <path d="M32 40H64M32 50H52" stroke="#c96b34" stroke-width="2" stroke-linecap="round" opacity="0.45"/>
              <path d="M64 58L68 62L76 54" stroke="#2f7c6e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.4"/>
            </svg>
          </div>
          <p class="gb-empty__heading">暂无留言</p>
          <p class="gb-empty__body">第一条就留给你。</p>
        </div>
      </main>

      <!-- ── FORM PANEL (left / sticky) ─────────────────── -->
      <aside class="gb-panel">
        <div class="gb-panel__inner">

          <!-- Panel heading -->
          <div class="gb-panel__head">
            <div class="gb-panel__pen" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125"/>
              </svg>
            </div>
            <div>
              <h2 class="gb-panel__title">写下留言</h2>
              <p class="gb-panel__sub">留言审核后公开</p>
            </div>
          </div>

          <!-- Form -->
          <form
            class="gb-form"
            :class="{ 'gb-form--active': formFocused }"
            @submit.prevent="submitMessage"
            @focusin="formFocused = true"
            @focusout="formFocused = false"
          >
            <!-- Paper lines decoration -->
            <div class="gb-form__lines" aria-hidden="true">
              <span v-for="n in 8" :key="n"></span>
            </div>

            <div class="gb-form__fields">
              <label class="gb-fl" for="gb-nickname">
                <span class="gb-fl__label">昵称</span>
                <input id="gb-nickname" v-model="form.nickname" class="gb-fl__input"
                  type="text" maxlength="60" placeholder="你的名字" autocomplete="nickname"/>
              </label>

              <label class="gb-fl" for="gb-email">
                <span class="gb-fl__label">邮箱</span>
                <input id="gb-email" v-model="form.email" class="gb-fl__input"
                  type="email" maxlength="120" placeholder="your@email.com" autocomplete="email"/>
              </label>

              <label class="gb-fl gb-fl--full" for="gb-content">
                <div class="gb-fl__label-row">
                  <span class="gb-fl__label">留言内容</span>
                  <span :class="['gb-fl__count', charCount > MAX_CONTENT * 0.85 && 'gb-fl__count--warn']">
                    {{ charCount }}&thinsp;/&thinsp;{{ MAX_CONTENT }}
                  </span>
                </div>
                <textarea id="gb-content" v-model="form.content" class="gb-fl__input gb-fl__textarea"
                  :maxlength="MAX_CONTENT" placeholder="想说些什么…"></textarea>
                <!-- Progress bar -->
                <div class="gb-progress">
                  <div class="gb-progress__bar"
                    :class="{ 'gb-progress__bar--warn': charPct > 0.85 }"
                    :style="{ width: `${charPct * 100}%` }"
                  ></div>
                </div>
              </label>
            </div>

            <!-- Alerts -->
            <Transition name="gb-msg">
              <div v-if="communityStore.notice" class="gb-notice gb-notice--ok" role="status">
                <svg class="gb-notice__ico" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clip-rule="evenodd"/>
                </svg>
                <span>{{ communityStore.notice }}</span>
              </div>
            </Transition>
            <Transition name="gb-msg">
              <div v-if="communityStore.errorMessage" class="gb-notice gb-notice--err" role="alert">
                <svg class="gb-notice__ico" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clip-rule="evenodd"/>
                </svg>
                <span>{{ communityStore.errorMessage }}</span>
              </div>
            </Transition>

            <!-- Footer row -->
            <div class="gb-form__foot">
              <p class="gb-form__hint">
                <svg viewBox="0 0 16 16" fill="currentColor" class="gb-form__hint-ico">
                  <path fill-rule="evenodd" d="M8 1a3.5 3.5 0 0 0-3.5 3.5V7H4a1 1 0 0 0-1 1v5a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V8a1 1 0 0 0-1-1h-.5V4.5A3.5 3.5 0 0 0 8 1Zm2.5 6V4.5a2.5 2.5 0 0 0-5 0V7h5Z" clip-rule="evenodd"/>
                </svg>
                邮箱不公开
              </p>
              <button
                class="gb-send"
                :disabled="communityStore.saving"
                type="submit"
              >
                <svg v-if="communityStore.saving" class="gb-send__spin" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2.5"
                    stroke-dasharray="56" stroke-dashoffset="18" stroke-linecap="round"/>
                </svg>
                <svg v-else class="gb-send__ico" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M3.105 2.289a.75.75 0 0 0-.826.95l1.414 4.925A1.5 1.5 0 0 0 5.135 9.25h6.115a.75.75 0 0 1 0 1.5H5.135a1.5 1.5 0 0 0-1.442 1.086l-1.414 4.926a.75.75 0 0 0 .826.95 28.896 28.896 0 0 0 15.293-7.154.75.75 0 0 0 0-1.115A28.897 28.897 0 0 0 3.105 2.289Z"/>
                </svg>
                {{ communityStore.saving ? "发送中…" : "发送" }}
              </button>
            </div>
          </form>

        </div>
      </aside>

    </div>
  </div>
</template>

<style scoped>
/* ── Page shell ─────────────────────────────────────────────── */
.gb-page {
  min-height: 100vh;
}

/* ═══ MASTHEAD ═══════════════════════════════════════════════ */
.gb-mast {
  position: relative;
  overflow: hidden;
  background:
    radial-gradient(ellipse 70% 80% at 8% 50%, rgba(31, 77, 109, 0.18) 0%, transparent 60%),
    radial-gradient(ellipse 50% 60% at 92% 30%, rgba(201, 107, 52, 0.15) 0%, transparent 55%),
    linear-gradient(160deg, #0e2d45 0%, #1a4361 45%, #1f4d6d 100%);
  padding: clamp(3.5rem, 8vw, 6.5rem) clamp(1.5rem, 5vw, 4rem) clamp(3rem, 7vw, 5.5rem);
  color: #fff;
}

/* Noise grain overlay */
.gb-mast__noise {
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: 0.045;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  background-size: 200px 200px;
}

/* Floating orbs */
.gb-mast__orb {
  position: absolute;
  border-radius: 50%;
  pointer-events: none;
}
.gb-mast__orb--a {
  width: 380px; height: 380px;
  top: -120px; right: -80px;
  background: radial-gradient(circle, rgba(201,107,52,0.22) 0%, transparent 70%);
  animation: gb-float 9s ease-in-out infinite;
}
.gb-mast__orb--b {
  width: 240px; height: 240px;
  bottom: -60px; left: 12%;
  background: radial-gradient(circle, rgba(255,255,255,0.06) 0%, transparent 70%);
  animation: gb-float 12s ease-in-out infinite reverse;
}
@keyframes gb-float {
  0%, 100% { transform: translateY(0) scale(1); }
  50%       { transform: translateY(-22px) scale(1.04); }
}

.gb-mast__inner {
  position: relative;
  z-index: 1;
  max-width: 1120px;
  margin: 0 auto;
}

/* Eyebrow row */
.gb-mast__eyebrow-row {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  margin-bottom: 2rem;
}
.gb-mast__tag {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.6875rem;
  font-weight: 800;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: #c96b34;
  background: rgba(201,107,52,0.14);
  border: 1px solid rgba(201,107,52,0.28);
  padding: 0.2rem 0.625rem 0.2rem 0.5rem;
  border-radius: 99px;
}
.gb-mast__tag svg { width: 8px; height: 8px; }
.gb-mast__sep { color: rgba(255,255,255,0.22); font-size: 0.875rem; }
.gb-mast__count { font-size: 0.8125rem; color: rgba(255,255,255,0.45); }

/* Stacked title */
.gb-mast__title {
  display: flex;
  align-items: baseline;
  gap: clamp(0.3rem, 1.5vw, 0.75rem);
  margin: 0 0 1.5rem;
}
.gb-mast__title-line {
  font-family: "Cormorant Garamond", serif;
  font-size: clamp(5rem, 14vw, 11rem);
  font-weight: 700;
  line-height: 0.92;
  color: #fff;
  letter-spacing: -0.02em;
  display: block;
}
.gb-mast__title-line--offset {
  color: transparent;
  -webkit-text-stroke: 1.5px rgba(255,255,255,0.55);
  margin-top: 0.15em;
  transform: translateY(0.08em);
  display: inline-block;
}

.gb-mast__tagline {
  font-size: clamp(0.9rem, 1.8vw, 1.0625rem);
  line-height: 1.75;
  color: rgba(255,255,255,0.62);
  max-width: 46ch;
  margin: 0 0 2.5rem;
}

/* Scroll hint */
.gb-mast__scroll-hint {
  display: inline-flex;
  align-items: center;
  gap: 0.625rem;
  font-size: 0.75rem;
  letter-spacing: 0.10em;
  text-transform: uppercase;
  color: rgba(255,255,255,0.35);
}
.gb-mast__scroll-hint svg { width: 18px; height: 25px; }
.gb-scroll-nub { animation: gb-scroll-nub 2s ease-in-out infinite; }
@keyframes gb-scroll-nub {
  0%   { transform: translateY(0); opacity: 1; }
  60%  { transform: translateY(6px); opacity: 0.2; }
  100% { transform: translateY(0); opacity: 1; }
}

/* ═══ BODY ═══════════════════════════════════════════════════ */
.gb-body {
  display: grid;
  max-width: 1120px;
  margin: 0 auto;
  padding: 3rem clamp(1rem, 3vw, 2rem) 5rem;
  gap: 2.5rem;
}
@media (min-width: 860px) {
  .gb-body {
    grid-template-columns: 340px 1fr;
    grid-template-areas: "panel timeline";
    align-items: start;
  }
  .gb-timeline { grid-area: timeline; }
  .gb-panel    { grid-area: panel; }
}
@media (min-width: 1024px) {
  .gb-body { grid-template-columns: 360px 1fr; }
}

/* ═══ FORM PANEL ══════════════════════════════════════════════ */
.gb-panel {
  position: sticky;
  top: calc(4rem + 1rem); /* below nav */
}
.gb-panel__inner {
  background: rgba(255,255,255,0.94);
  border: 1px solid rgba(16,20,26,0.09);
  border-radius: 20px;
  box-shadow:
    0 32px 64px rgba(16,20,26,0.10),
    inset 0 1px 0 rgba(255,255,255,0.95);
  overflow: hidden;
}

.gb-panel__head {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1.125rem 1.375rem;
  background: linear-gradient(135deg, rgba(31,77,109,0.05) 0%, rgba(201,107,52,0.04) 100%);
  border-bottom: 1px solid rgba(16,20,26,0.07);
}
.gb-panel__pen {
  display: flex; align-items: center; justify-content: center;
  width: 36px; height: 36px;
  border-radius: 10px;
  background: #1f4d6d;
  color: #fff;
  flex-shrink: 0;
}
.gb-panel__pen svg { width: 17px; height: 17px; }
.gb-panel__title {
  font-size: 0.9375rem; font-weight: 700; color: #10141a;
  margin: 0 0 0.1rem; line-height: 1.25;
}
.gb-panel__sub {
  font-size: 0.725rem; color: rgba(16,20,26,0.40); margin: 0;
}

/* Form itself */
.gb-form {
  position: relative;
  padding: 1.25rem 1.375rem 1.375rem;
  transition: background 300ms;
}
.gb-form--active {
  background: rgba(31,77,109,0.015);
}

/* Ruled lines decoration */
.gb-form__lines {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
  opacity: 0;
  transition: opacity 400ms;
}
.gb-form--active .gb-form__lines { opacity: 1; }
.gb-form__lines span {
  display: block;
  height: 1px;
  background: rgba(31,77,109,0.05);
  margin-top: 28px;
}

.gb-form__fields { display: grid; gap: 0.875rem; position: relative; z-index: 1; }

/* Field label */
.gb-fl { display: flex; flex-direction: column; gap: 0.35rem; }
.gb-fl--full { /* full width — default */ }
.gb-fl__label-row {
  display: flex; align-items: center; justify-content: space-between;
}
.gb-fl__label {
  font-size: 0.78125rem; font-weight: 700;
  letter-spacing: 0.03em;
  color: rgba(16,20,26,0.50);
  text-transform: uppercase;
}
.gb-fl__count {
  font-size: 0.6875rem;
  color: rgba(16,20,26,0.32);
  font-variant-numeric: tabular-nums;
  transition: color 200ms;
}
.gb-fl__count--warn { color: #c96b34; }

.gb-fl__input {
  width: 100%;
  border: 1.5px solid rgba(16,20,26,0.12);
  border-radius: 10px;
  background: rgba(255,255,255,0.80);
  padding: 0.625rem 0.8125rem;
  font-size: 0.9375rem;
  color: #10141a;
  outline: none;
  transition: border-color 200ms, box-shadow 200ms, background 200ms;
  min-height: 0;
}
.gb-fl__input::placeholder { color: rgba(16,20,26,0.25); }
.gb-fl__input:hover { border-color: rgba(31,77,109,0.32); }
.gb-fl__input:focus {
  border-color: #1f4d6d;
  box-shadow: 0 0 0 3px rgba(31,77,109,0.10);
  background: #fff;
}
.gb-fl__textarea {
  min-height: 110px; resize: vertical; line-height: 1.7;
  border-radius: 10px 10px 4px 10px;
}

/* Progress bar */
.gb-progress {
  height: 2px;
  background: rgba(16,20,26,0.07);
  border-radius: 0 0 10px 10px;
  overflow: hidden;
  margin-top: 2px;
}
.gb-progress__bar {
  height: 100%;
  background: #1f4d6d;
  border-radius: inherit;
  transition: width 200ms ease, background 200ms;
}
.gb-progress__bar--warn { background: #c96b34; }

/* Alerts */
.gb-notice {
  display: flex; align-items: flex-start; gap: 0.5rem;
  padding: 0.6875rem 0.875rem;
  border-radius: 10px;
  font-size: 0.8125rem; line-height: 1.5;
  margin-top: 0.625rem;
}
.gb-notice__ico { width: 15px; height: 15px; flex-shrink: 0; margin-top: 1px; }
.gb-notice--ok {
  background: rgba(47,124,110,0.08);
  border: 1px solid rgba(47,124,110,0.22);
  color: #2f7c6e;
}
.gb-notice--err {
  background: rgba(201,107,52,0.08);
  border: 1px solid rgba(201,107,52,0.22);
  color: #c96b34;
}
.gb-msg-enter-active { transition: opacity 220ms ease, transform 220ms ease; }
.gb-msg-leave-active { transition: opacity 150ms ease; }
.gb-msg-enter-from   { opacity: 0; transform: translateY(-8px); }
.gb-msg-leave-to     { opacity: 0; }

/* Form footer */
.gb-form__foot {
  display: flex; align-items: center;
  justify-content: space-between; gap: 0.75rem;
  margin-top: 1rem;
}
.gb-form__hint {
  display: flex; align-items: center; gap: 0.3rem;
  font-size: 0.71875rem; color: rgba(16,20,26,0.36); margin: 0;
}
.gb-form__hint-ico { width: 11px; height: 11px; flex-shrink: 0; }

.gb-send {
  display: inline-flex; align-items: center; gap: 0.4rem;
  padding: 0.5625rem 1.125rem;
  border-radius: 9px;
  background: #1f4d6d; color: #fff;
  font-size: 0.9rem; font-weight: 700;
  box-shadow: 0 4px 16px rgba(31,77,109,0.30);
  transition: background 180ms, transform 140ms, box-shadow 180ms, opacity 200ms;
  white-space: nowrap;
}
.gb-send:hover:not(:disabled) {
  background: #11364f;
  transform: translateY(-1px);
  box-shadow: 0 6px 22px rgba(31,77,109,0.38);
}
.gb-send:active:not(:disabled) { transform: none; }
.gb-send:disabled { opacity: 0.55; cursor: not-allowed; }
.gb-send__ico { width: 15px; height: 15px; transition: transform 200ms; }
.gb-send:hover:not(:disabled) .gb-send__ico { transform: translateX(3px) rotate(-10deg); }
.gb-send__spin { width: 15px; height: 15px; animation: gb-spin 0.75s linear infinite; }
@keyframes gb-spin { to { transform: rotate(360deg); } }

/* ═══ TIMELINE ════════════════════════════════════════════════ */
.gb-timeline {
  display: flex;
  flex-direction: column;
  gap: 0;
  position: relative;
}
/* Continuous vertical line */
.gb-timeline::before {
  content: '';
  position: absolute;
  left: 11px;
  top: 0; bottom: 0;
  width: 1.5px;
  background: linear-gradient(180deg, rgba(31,77,109,0.18) 0%, rgba(31,77,109,0.06) 100%);
  pointer-events: none;
}
@media (max-width: 859px) {
  .gb-timeline::before { display: none; }
}

/* Date separator */
.gb-date-sep {
  display: flex; align-items: center; gap: 0.75rem;
  padding: 0.25rem 0 1rem 2.5rem;
  position: relative;
}
.gb-date-sep::before {
  content: '';
  position: absolute;
  left: 7px;
  top: 50%;
  transform: translateY(-50%);
  width: 9px; height: 9px;
  border-radius: 50%;
  background: #fff;
  border: 2px solid rgba(31,77,109,0.35);
}
.gb-date-sep span {
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.10em;
  text-transform: uppercase;
  color: rgba(16,20,26,0.38);
  white-space: nowrap;
}
/* Line after date */
.gb-date-sep::after {
  content: '';
  flex: 1;
  height: 1px;
  background: rgba(16,20,26,0.08);
}

/* Single timeline entry */
.gb-entry {
  display: grid;
  grid-template-columns: 24px 1fr;
  gap: 0.75rem;
  padding-bottom: 1.125rem;
  animation: gb-entry-in 340ms ease-out both;
}
@keyframes gb-entry-in {
  from { opacity: 0; transform: translateX(-12px); }
  to   { opacity: 1; transform: translateX(0); }
}

/* Timeline dot */
.gb-entry__dot {
  width: 14px; height: 14px;
  border-radius: 50%;
  margin-top: 1rem;
  flex-shrink: 0;
  box-shadow: 0 0 0 3px #fff, 0 0 0 4.5px rgba(31,77,109,0.15);
  justify-self: center;
}

/* Bubble */
.gb-bubble {
  background: rgba(255,255,255,0.90);
  border: 1px solid rgba(16,20,26,0.08);
  border-radius: 0 16px 16px 16px;
  padding: 1rem 1.125rem;
  box-shadow: 0 2px 14px rgba(16,20,26,0.06);
  transition: box-shadow 220ms, transform 220ms;
  position: relative;
}
/* Bubble pointer */
.gb-bubble::before {
  content: '';
  position: absolute;
  left: -6px; top: 14px;
  width: 12px; height: 12px;
  background: rgba(255,255,255,0.90);
  border-left: 1px solid rgba(16,20,26,0.08);
  border-top: 1px solid rgba(16,20,26,0.08);
  transform: rotate(-45deg);
  border-radius: 2px 0 0 0;
}
.gb-bubble:hover {
  box-shadow: 0 8px 32px rgba(16,20,26,0.11);
  transform: translateY(-2px);
}

.gb-bubble__head {
  display: flex; align-items: center; gap: 0.625rem;
  margin-bottom: 0.75rem;
}
.gb-avatar {
  width: 32px; height: 32px;
  border-radius: 9px;
  display: flex; align-items: center; justify-content: center;
  font-family: "Cormorant Garamond", serif;
  font-size: 0.9375rem; font-weight: 700;
  flex-shrink: 0;
  user-select: none;
}
.gb-bubble__meta {
  flex: 1; min-width: 0;
}
.gb-bubble__name {
  display: block;
  font-size: 0.875rem; font-weight: 700; color: #10141a;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.gb-bubble__time {
  display: block;
  font-size: 0.6875rem; color: rgba(16,20,26,0.38);
  margin-top: 1px;
}
.gb-bubble__text {
  font-size: 0.9375rem; line-height: 1.78;
  color: rgba(16,20,26,0.72);
  margin: 0;
  white-space: pre-wrap; word-break: break-word;
}

/* Badge */
.gb-badge {
  display: inline-flex; align-items: center; gap: 0.28rem;
  font-size: 0.6875rem; font-weight: 600;
  padding: 0.15rem 0.55rem;
  border-radius: 99px;
  background: rgba(201,107,52,0.09);
  border: 1px solid rgba(201,107,52,0.22);
  color: #c96b34;
  flex-shrink: 0;
}
.gb-badge__dot {
  width: 5px; height: 5px; border-radius: 50%;
  background: currentColor;
  animation: gb-blink 1.8s ease-in-out infinite;
}
@keyframes gb-blink {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.22; }
}

/* ── Skeleton ─────────────────────────────────────────────── */
.gb-skel {
  display: grid;
  grid-template-columns: 24px 1fr;
  gap: 0.75rem;
  padding-bottom: 1.125rem;
  animation: gb-entry-in 300ms ease-out both;
}
.gb-skel__dot {
  width: 14px; height: 14px;
  border-radius: 50%;
  background: #dde5ed;
  margin-top: 1rem;
  justify-self: center;
}
.gb-skel__card {
  background: rgba(255,255,255,0.75);
  border: 1px solid rgba(16,20,26,0.07);
  border-radius: 0 16px 16px 16px;
  padding: 1rem 1.125rem;
  display: flex; flex-direction: column; gap: 0.5rem;
}
.gb-skel__head,
.gb-skel__line {
  border-radius: 6px;
  background: linear-gradient(90deg, #e8eef4 25%, #f3f6f9 50%, #e8eef4 75%);
  background-size: 200% 100%;
  animation: gb-shimmer 1.5s ease-in-out infinite;
}
.gb-skel__head   { width: 40%; height: 12px; }
.gb-skel__line   { height: 11px; }
.gb-skel__line--a { width: 92%; }
.gb-skel__line--b { width: 68%; }
@keyframes gb-shimmer {
  0%   { background-position:  200% 0; }
  100% { background-position: -200% 0; }
}

/* ── Empty state ─────────────────────────────────────────── */
.gb-empty {
  display: flex; flex-direction: column; align-items: center;
  gap: 0.5rem; text-align: center;
  padding: 4rem 2rem;
  border: 1.5px dashed rgba(16,20,26,0.11);
  border-radius: 20px;
  background: rgba(255,255,255,0.45);
}
.gb-empty__stamp { width: 96px; height: 96px; margin-bottom: 0.75rem; }
.gb-empty__heading {
  font-size: 1rem; font-weight: 700;
  color: rgba(16,20,26,0.46); margin: 0;
}
.gb-empty__body {
  font-size: 0.875rem; color: rgba(16,20,26,0.32); margin: 0;
}

/* ── Mobile stacking ─────────────────────────────────────── */
@media (max-width: 859px) {
  .gb-body { grid-template-columns: 1fr; }
  .gb-panel { position: static; }
  .gb-timeline::before { display: none; }
  .gb-entry { grid-template-columns: 1fr; }
  .gb-entry__dot { display: none; }
  .gb-bubble { border-radius: 16px; }
  .gb-bubble::before { display: none; }
  .gb-date-sep { padding-left: 0; }
  .gb-date-sep::before { display: none; }
}
</style>
