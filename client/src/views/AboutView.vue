<script setup lang="ts">
import { computed, onMounted } from "vue";
import { usePagesStore } from "@/stores/pages";
import { useSiteStore } from "@/stores/site";
import { renderMarkdown } from "@/utils/markdown";

const pagesStore = usePagesStore();
const siteStore = useSiteStore();
const aboutPage = computed(() => pagesStore.aboutPage);
const renderedContent = computed(() =>
  aboutPage.value ? renderMarkdown(aboutPage.value.content) : "",
);
const techStack = computed(() => siteStore.aboutSettings.techStack);
const timeline = computed(() => siteStore.aboutSettings.timeline);
const contactEmail = computed(() => siteStore.aboutSettings.contactEmail);
const githubUrl = computed(() => siteStore.aboutSettings.githubUrl);

onMounted(async () => {
  await pagesStore.loadAboutPage();
});
</script>

<template>
  <div class="about-page">

    <!-- ① Profile Grid -->
    <section class="content-shell profile-section">
      <div class="profile-grid">
        <!-- Photo column -->
        <figure class="profile-photo-wrap">
          <div class="photo-inner">
            <img
              alt="书桌与笔记本"
              src="https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?auto=format&fit=crop&w=1200&q=80"
              width="780"
              height="1040"
              loading="lazy"
            />
            <div class="photo-chip font-mono">📍 以写作为基</div>
          </div>
          <div class="photo-ornament" aria-hidden="true"></div>
        </figure>

        <!-- Content column -->
        <div class="profile-content">
          <template v-if="aboutPage">
            <h2 class="profile-name font-display">{{ aboutPage.title }}</h2>
            <p v-if="aboutPage.summary" class="profile-summary">
              {{ aboutPage.summary }}
            </p>
            <div class="markdown-body profile-md mt-6" v-html="renderedContent"></div>
          <!-- Tech Stack: only render when data exists -->
            <div v-if="techStack.length" class="skills-section">
              <p class="skills-label eyebrow">技术栈</p>
              <div class="skill-tags">
                <span
                  v-for="(skill, i) in techStack"
                  :key="skill"
                  class="skill-tag"
                  :style="`animation-delay:${i * 45}ms`"
                >{{ skill }}</span>
              </div>
            </div>
          </template>

          <template v-else-if="pagesStore.loading">
            <div class="skeleton-block">
              <div class="skel skel-title"></div>
              <div class="skel skel-line" style="width:80%"></div>
              <div class="skel skel-line" style="width:65%"></div>
              <div class="skel skel-body"></div>
            </div>
          </template>

          <template v-else>
            <h2 class="profile-name font-display">关于页暂不可用</h2>
            <p class="mt-4 leading-7 text-ink/65">
              {{ pagesStore.errorMessage || "还没有发布关于页，或接口请求失败。" }}
            </p>
          </template>
        </div>
      </div>
    </section>

    <!-- ② Timeline -->
    <section v-if="timeline.length" class="content-shell timeline-section">
      <div class="section-head">
        <p class="eyebrow section-eyebrow">Journey · 轨迹</p>
        <h2 class="section-title font-display">成长轨迹</h2>
      </div>
      <div class="timeline">
        <div
          v-for="(item, i) in timeline"
          :key="item.year"
          class="tl-item"
          :style="`animation-delay:${i * 90}ms`"
        >
          <div class="tl-year font-display">{{ item.year }}</div>
          <div class="tl-spine" aria-hidden="true">
            <div class="tl-dot"></div>
            <div class="tl-bar"></div>
          </div>
          <div class="tl-body">
            <h3 class="tl-title">{{ item.title }}</h3>
            <p class="tl-desc">{{ item.desc }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- ③ Contact CTA -->
    <section class="content-shell cta-section">
      <div class="cta-inner">
        <span class="cta-ornament font-display" aria-hidden="true">✦</span>
        <h2 class="cta-title font-display">一起交流</h2>
        <p class="cta-sub">无论是技术讨论、产品想法，还是想打个招呼，都欢迎联系。</p>
        <div class="cta-actions">
          <a :href="contactEmail ? `mailto:${contactEmail}` : '#'" class="cta-btn cta-btn--primary">
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            发送邮件
          </a>
          <a :href="githubUrl || 'https://github.com'" target="_blank" rel="noopener" class="cta-btn cta-btn--secondary">
            <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
              <path fill-rule="evenodd" clip-rule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
            </svg>
            GitHub
          </a>
        </div>
      </div>
    </section>

  </div>
</template>

<style scoped>
/* ── Page ── */
.about-page {
  padding-bottom: 5rem;
}

/* ── ① Profile ── */
.profile-section {
  padding-top: 4rem;
  padding-bottom: 3rem;
}

.profile-grid {
  display: grid;
  gap: 2.5rem;
  align-items: start;
}

@media (min-width: 768px) {
  .profile-grid {
    grid-template-columns: 320px minmax(0, 1fr);
    gap: 3.5rem;
  }
}

.profile-photo-wrap {
  position: relative;
  margin: 0;
}

.photo-inner {
  position: relative;
  border-radius: 14px;
  overflow: hidden;
  box-shadow: 0 22px 56px rgba(16, 20, 26, 0.14);
  transition: transform 350ms ease, box-shadow 350ms ease;
}

.photo-inner:hover {
  transform: translateY(-5px);
  box-shadow: 0 32px 72px rgba(16, 20, 26, 0.2);
}

.photo-inner img {
  width: 100%;
  height: auto;
  min-height: 360px;
  object-fit: cover;
  display: block;
  transition: transform 500ms ease;
}

.photo-inner:hover img {
  transform: scale(1.04);
}

.photo-chip {
  position: absolute;
  bottom: 1rem;
  left: 1rem;
  padding: 0.35rem 0.8rem;
  background: rgba(255, 255, 255, 0.93);
  backdrop-filter: blur(8px);
  border-radius: 20px;
  font-size: 0.68rem;
  letter-spacing: 0.05em;
  color: var(--brand);
  font-weight: 600;
  box-shadow: 0 2px 12px rgba(16, 20, 26, 0.12);
}

.photo-ornament {
  position: absolute;
  bottom: -10px;
  right: -10px;
  width: 72px;
  height: 72px;
  border: 2px solid var(--accent);
  border-radius: 10px;
  opacity: 0.22;
  pointer-events: none;
  z-index: -1;
}

.profile-content {
  animation: rise 480ms 110ms ease-out both;
}

.profile-name {
  font-size: clamp(2rem, 5vw, 3rem);
  line-height: 1.1;
  color: var(--brand);
  margin: 0 0 1.1rem;
}

.profile-summary {
  font-size: 1.035rem;
  line-height: 1.82;
  color: rgba(16, 20, 26, 0.7);
  border-left: 3px solid var(--accent);
  padding-left: 1rem;
  margin: 0;
  max-width: 54ch;
}

.skills-section {
  margin-top: 2rem;
  padding-top: 1.5rem;
  border-top: 1px solid rgba(16, 20, 26, 0.08);
}

.skills-label {
  font-size: 0.65rem;
  letter-spacing: 0.2em;
  margin-bottom: 0.8rem;
}

.skill-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
}

.skill-tag {
  padding: 0.28rem 0.75rem;
  border-radius: 6px;
  font-size: 0.76rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  color: var(--brand);
  background: rgba(31, 77, 109, 0.07);
  border: 1px solid rgba(31, 77, 109, 0.14);
  transition: background 150ms ease, color 150ms ease, transform 150ms ease;
  animation: rise 280ms ease-out both;
}

.skill-tag:hover {
  background: var(--brand);
  color: #fff;
  transform: translateY(-2px);
}

/* Skeleton */
.skeleton-block {
  display: grid;
  gap: 0.8rem;
}

.skel {
  border-radius: 6px;
  background: rgba(16, 20, 26, 0.07);
  animation: skel-pulse 1.5s ease infinite;
}

.skel-title { height: 2.8rem; width: 52%; }
.skel-line { height: 1rem; }
.skel-body { height: 11rem; margin-top: 0.25rem; }

@keyframes skel-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.45; }
}

/* ── ③ Timeline ── */
.timeline-section {
  padding-top: 3rem;
  padding-bottom: 3rem;
  border-top: 1px solid rgba(16, 20, 26, 0.07);
}

.section-head {
  margin-bottom: 2.5rem;
  animation: rise 380ms ease-out both;
}

.section-eyebrow {
  font-size: 0.68rem;
  letter-spacing: 0.22em;
  margin-bottom: 0.4rem;
}

.section-title {
  font-size: clamp(1.8rem, 4vw, 2.75rem);
  line-height: 1.1;
  color: var(--brand);
  margin: 0;
}

.timeline {
  display: grid;
  gap: 1.5rem 2rem;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
}

@media (min-width: 768px) {
  .timeline {
    grid-template-columns: repeat(4, 1fr);
  }
}

.tl-item {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  animation: rise 340ms ease-out both;
}

.tl-year {
  font-size: 2.5rem;
  line-height: 1;
  color: var(--brand);
  opacity: 0.22;
  letter-spacing: -0.04em;
}

.tl-spine {
  display: flex;
  align-items: center;
}

.tl-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: var(--accent);
  flex-shrink: 0;
}

.tl-bar {
  flex: 1;
  height: 1px;
  background: linear-gradient(to right, rgba(201, 107, 52, 0.38), transparent);
  margin-left: 0;
}

.tl-title {
  font-size: 0.975rem;
  font-weight: 700;
  color: var(--brand);
  margin: 0 0 0.3rem;
}

.tl-desc {
  font-size: 0.845rem;
  line-height: 1.68;
  color: rgba(16, 20, 26, 0.58);
  margin: 0;
}

/* ── ④ CTA ── */
.cta-section {
  padding-top: 3rem;
  padding-bottom: 2rem;
  border-top: 1px solid rgba(16, 20, 26, 0.07);
}

.cta-inner {
  text-align: center;
  max-width: 540px;
  margin: 0 auto;
  animation: rise 420ms ease-out both;
}

.cta-ornament {
  display: block;
  font-size: 2rem;
  color: var(--accent);
  opacity: 0.45;
  margin-bottom: 1rem;
}

.cta-title {
  font-size: clamp(2.2rem, 6vw, 3.5rem);
  line-height: 1.1;
  color: var(--brand);
  margin: 0 0 1rem;
}

.cta-sub {
  font-size: 0.975rem;
  line-height: 1.78;
  color: rgba(16, 20, 26, 0.58);
  margin: 0 0 2rem;
}

.cta-actions {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.cta-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.65rem 1.5rem;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 600;
  letter-spacing: 0.015em;
  cursor: pointer;
  text-decoration: none;
  transition: transform 160ms ease, box-shadow 160ms ease, background 160ms ease;
}

.cta-btn--primary {
  background: var(--brand);
  color: #fff;
  box-shadow: 0 4px 18px rgba(31, 77, 109, 0.3);
}

.cta-btn--primary:hover {
  background: #11364f;
  transform: translateY(-2px);
  box-shadow: 0 8px 26px rgba(31, 77, 109, 0.38);
}

.cta-btn--secondary {
  background: rgba(255, 255, 255, 0.92);
  color: var(--brand);
  border: 1px solid rgba(31, 77, 109, 0.18);
  box-shadow: 0 2px 8px rgba(16, 20, 26, 0.06);
}

.cta-btn--secondary:hover {
  background: rgba(31, 77, 109, 0.05);
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(16, 20, 26, 0.1);
}
</style>
