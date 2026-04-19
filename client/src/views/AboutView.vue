<script setup lang="ts">
import { computed, onMounted } from "vue";
import { usePagesStore } from "@/stores/pages";
import { useSiteStore } from "@/stores/site";
import { handleMarkdownInteraction, renderMarkdown } from "@/utils/markdown";

const pagesStore = usePagesStore();
const siteStore  = useSiteStore();

const aboutPage       = computed(() => pagesStore.aboutPage);
const renderedContent = computed(() =>
  aboutPage.value ? renderMarkdown(aboutPage.value.content) : "",
);
const techStack    = computed(() => siteStore.aboutSettings.techStack);
const timeline     = computed(() => siteStore.aboutSettings.timeline);
const contactEmail = computed(() => siteStore.aboutSettings.contactEmail);
const githubUrl    = computed(() => siteStore.aboutSettings.githubUrl);

onMounted(async () => {
  await pagesStore.loadAboutPage();
});
</script>

<template>
  <div class="ap">

    <!-- ═══ MASTHEAD ════════════════════════════════════════════ -->
    <header class="ap-masthead">
      <div class="ap-masthead__inner content-shell">
        <div class="ap-masthead__text">
          <p class="ap-label">
            <span class="ap-label__tick" aria-hidden="true"></span>
            About
          </p>
          <h1 class="ap-masthead__title font-display">关于我</h1>
        </div>
        <blockquote class="ap-masthead__pull">
          <p>{{ aboutPage?.summary || "以写作为基，以代码为刃，探索技术与表达的边界。" }}</p>
        </blockquote>
      </div>
      <div class="ap-masthead__rule" aria-hidden="true"></div>
    </header>

    <!-- ═══ PROFILE ═════════════════════════════════════════════ -->
    <section class="ap-profile content-shell" aria-label="个人介绍">

      <!-- Sidebar: photo + meta -->
      <aside class="ap-sidebar">
        <div class="ap-photo">
          <img
            class="ap-photo__img"
            src="https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?auto=format&fit=crop&w=800&q=80"
            alt="书桌与笔记本"
            width="400"
            height="400"
            loading="lazy"
          />
        </div>

        <!-- Meta list -->
        <dl class="ap-meta" v-if="techStack.length || timeline.length">
          <div v-if="techStack.length" class="ap-meta__row">
            <dt class="ap-meta__key">技术栈</dt>
            <dd class="ap-meta__val">{{ techStack.length }} 项</dd>
          </div>
          <div v-if="timeline.length" class="ap-meta__row">
            <dt class="ap-meta__key">里程碑</dt>
            <dd class="ap-meta__val">{{ timeline.length }} 个</dd>
          </div>
          <div v-if="contactEmail" class="ap-meta__row">
            <dt class="ap-meta__key">邮件</dt>
            <dd class="ap-meta__val">
              <a :href="`mailto:${contactEmail}`" class="ap-meta__link">联系我</a>
            </dd>
          </div>
          <div v-if="githubUrl" class="ap-meta__row">
            <dt class="ap-meta__key">GitHub</dt>
            <dd class="ap-meta__val">
              <a :href="githubUrl" target="_blank" rel="noopener" class="ap-meta__link">主页</a>
            </dd>
          </div>
        </dl>
      </aside>

      <!-- Article: bio content -->
      <article class="ap-article">
        <template v-if="aboutPage">
          <h2 class="ap-article__name font-display">{{ aboutPage.title }}</h2>
          <div
            class="ap-bio-body markdown-body"
            @click="handleMarkdownInteraction"
            v-html="renderedContent"
          ></div>
        </template>

        <template v-else-if="pagesStore.loading">
          <div class="ap-skel">
            <div class="ap-skel__title"></div>
            <div class="ap-skel__line" style="width:100%"></div>
            <div class="ap-skel__line" style="width:91%"></div>
            <div class="ap-skel__line" style="width:84%"></div>
            <div class="ap-skel__line" style="width:96%"></div>
            <div class="ap-skel__line" style="width:72%"></div>
          </div>
        </template>

        <template v-else>
          <h2 class="ap-article__name font-display">关于页暂不可用</h2>
          <p class="ap-article__err">{{ pagesStore.errorMessage || "还没有发布关于页，或接口请求失败。" }}</p>
        </template>
      </article>

    </section>

    <!-- ═══ SKILLS ══════════════════════════════════════════════ -->
    <section v-if="techStack.length" class="ap-skills content-shell">
      <div class="ap-divider" aria-hidden="true">
        <span class="ap-divider__label">Tech Stack</span>
      </div>
      <h2 class="ap-sec-title font-display">技术栈</h2>
      <ul class="ap-skill-list" role="list">
        <li
          v-for="(skill, i) in techStack"
          :key="skill"
          class="ap-skill-item"
          :style="{ animationDelay: `${i * 30}ms` }"
        >
          <span class="ap-skill-item__num font-mono">{{ String(i + 1).padStart(2, '0') }}</span>
          <span class="ap-skill-item__name">{{ skill }}</span>
        </li>
      </ul>
    </section>

    <!-- ═══ TIMELINE ════════════════════════════════════════════ -->
    <section v-if="timeline.length" class="ap-tl-section content-shell">
      <div class="ap-divider" aria-hidden="true">
        <span class="ap-divider__label">Journey</span>
      </div>
      <h2 class="ap-sec-title font-display">成长轨迹</h2>
      <ol class="ap-tl-list" role="list">
        <li
          v-for="(item, i) in timeline"
          :key="item.year"
          class="ap-tl-entry"
          :style="{ animationDelay: `${i * 80}ms` }"
        >
          <div class="ap-tl-entry__year font-display">{{ item.year }}</div>
          <div class="ap-tl-entry__body">
            <h3 class="ap-tl-entry__title">{{ item.title }}</h3>
            <p v-if="item.desc" class="ap-tl-entry__desc">{{ item.desc }}</p>
          </div>
        </li>
      </ol>
    </section>

    <!-- ═══ CONTACT ═════════════════════════════════════════════ -->
    <section class="ap-contact content-shell">
      <div class="ap-contact__card">
        <div class="ap-contact__text">
          <p class="ap-label">
            <span class="ap-label__tick" aria-hidden="true"></span>
            Get in touch
          </p>
          <h2 class="ap-contact__title font-display">一起交流</h2>
          <p class="ap-contact__sub">无论是技术讨论、产品想法，还是只想打个招呼，都欢迎联系。</p>
        </div>
        <div class="ap-contact__actions">
          <a
            :href="contactEmail ? `mailto:${contactEmail}` : '#'"
            class="ap-btn ap-btn--primary"
          >
            <svg class="ap-btn__ico" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path d="M3 4a2 2 0 0 0-2 2v1.161l8.441 4.221a1.25 1.25 0 0 0 1.118 0L19 7.162V6a2 2 0 0 0-2-2H3Z"/>
              <path d="m19 8.839-7.77 3.885a2.75 2.75 0 0 1-2.46 0L1 8.839V14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8.839Z"/>
            </svg>
            发送邮件
          </a>
          <a
            :href="githubUrl || 'https://github.com'"
            target="_blank"
            rel="noopener"
            class="ap-btn ap-btn--outline"
          >
            <svg class="ap-btn__ico" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path fill-rule="evenodd" clip-rule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0 0 22 12.017C22 6.484 17.522 2 12 2z"/>
            </svg>
            GitHub
          </a>
        </div>
      </div>
    </section>

  </div>
</template>

<style scoped>
/* ══ Reset / shell ═══════════════════════════════════════════ */
.ap {
  padding-bottom: 6rem;
}

/* ══ Shared label / eyebrow ═════════════════════════════════ */
.ap-label {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-family: "JetBrains Mono", "Fira Code", monospace;
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--accent, #c96b34);
  margin: 0;
}
.ap-label__tick {
  display: inline-block;
  width: 18px;
  height: 1.5px;
  background: currentColor;
  flex-shrink: 0;
}

/* ══ MASTHEAD ════════════════════════════════════════════════ */
.ap-masthead {
  padding-top: clamp(2.5rem, 5vw, 4.5rem);
  padding-bottom: 0;
  position: relative;
  background:
    radial-gradient(ellipse 60% 50% at 10% 0%, rgba(31,77,109,0.08), transparent),
    radial-gradient(ellipse 40% 40% at 90% 20%, rgba(201,107,52,0.06), transparent);
}
.ap-masthead::before {
  content: "01";
  position: absolute;
  right: var(--space-page-x, 24px);
  top: -0.15em;
  font-family: "Cormorant Garamond", serif;
  font-size: clamp(8rem, 18vw, 16rem);
  font-weight: 700;
  line-height: 1;
  color: rgba(31, 77, 109, 0.05);
  pointer-events: none;
  user-select: none;
  z-index: 0;
}

.ap-masthead__inner {
  display: flex;
  flex-direction: column;
  gap: 1.75rem;
  padding-bottom: 2.5rem;
  max-width: 860px;
  position: relative;
  z-index: 1;
}

.ap-masthead__text {
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
}

.ap-masthead__title {
  font-size: clamp(3.25rem, 8vw, 6rem);
  line-height: 0.92;
  letter-spacing: -0.03em;
  color: var(--brand, #1f4d6d);
  margin: 0;
  font-weight: 700;
}

.ap-masthead__pull {
  margin: 0;
  border: none;
  padding: 1rem 1.5rem;
  border-left: 2px solid var(--accent, #c96b34);
  max-width: 52ch;
  background: rgba(201, 107, 52, 0.05);
  border-radius: 0 8px 8px 0;
}
.ap-masthead__pull p {
  font-family: "Cormorant Garamond", serif;
  font-size: clamp(1.0625rem, 2vw, 1.25rem);
  font-style: italic;
  font-weight: 500;
  line-height: 1.65;
  color: var(--ink-muted, rgba(16,20,26,0.64));
  margin: 0;
}

/* Thin rule with gradient fade */
.ap-masthead__rule {
  height: 1px;
  background: linear-gradient(
    90deg,
    transparent 0%,
    var(--line, rgba(16,20,26,0.13)) 10%,
    var(--line, rgba(16,20,26,0.13)) 60%,
    transparent 100%
  );
  margin: 0 var(--space-page-x, 24px);
}

/* ══ PROFILE ═════════════════════════════════════════════════ */
.ap-profile {
  display: grid;
  grid-template-columns: 1fr;
  gap: 2.5rem;
  padding-top: 3rem;
  padding-bottom: 3rem;
}

@media (min-width: 640px) {
  .ap-profile {
    grid-template-columns: 220px 1fr;
    gap: 3.5rem;
  }
}

@media (min-width: 1024px) {
  .ap-profile {
    grid-template-columns: 260px 1fr;
    gap: 4.5rem;
  }
}

/* Sidebar */
.ap-sidebar {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  position: relative;
}

@media (min-width: 640px) {
  .ap-sidebar {
    position: sticky;
    top: 5.5rem;
    align-self: start;
  }
}

.ap-photo {
  aspect-ratio: 1;
  overflow: hidden;
  border-radius: 16px;
  background: var(--line, #cfd8e3);
  box-shadow:
    6px 6px 0 0 rgba(201, 107, 52, 0.18),
    0 0 0 1px rgba(16,20,26,0.08),
    0 12px 32px rgba(16,20,26,0.11);
}
.ap-photo__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  filter: saturate(0.97) contrast(1.01);
  transition: filter 300ms;
}
.ap-photo__img:hover { filter: saturate(1); }

.ap-meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin: 0;
}
.ap-meta__row {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0 1rem;
  align-items: center;
  padding: 0.6rem 0.75rem;
  border-radius: 6px;
  transition: background 160ms;
}
.ap-meta__row:hover {
  background: rgba(31, 77, 109, 0.05);
}
.ap-meta__key {
  font-family: "JetBrains Mono", monospace;
  font-size: 0.6875rem;
  font-weight: 500;
  letter-spacing: 0.08em;
  color: var(--ink-muted, rgba(16,20,26,0.5));
  text-transform: uppercase;
}
.ap-meta__val {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--ink, #10141a);
  margin: 0;
}
.ap-meta__link {
  color: var(--accent, #c96b34);
  text-decoration: none;
  font-weight: 600;
  font-size: 0.875rem;
  position: relative;
}
.ap-meta__link::after {
  content: '';
  position: absolute;
  left: 0; bottom: -1px; right: 0;
  height: 1px;
  background: var(--accent, #c96b34);
  transform: scaleX(0);
  transform-origin: left;
  transition: transform 220ms ease;
}
.ap-meta__link:hover::after { transform: scaleX(1); }

/* Article */
.ap-article {
  min-width: 0;
}

.ap-article__name {
  font-size: clamp(1.75rem, 4vw, 2.625rem);
  line-height: 1.1;
  letter-spacing: -0.02em;
  color: var(--brand, #1f4d6d);
  margin: 0 0 1.75rem;
  font-weight: 700;
}

/* Drop cap on first prose paragraph */
.ap-bio-body :deep(p:first-of-type::first-letter) {
  font-family: "Cormorant Garamond", serif;
  font-size: 4.25em;
  font-weight: 700;
  line-height: 0.78;
  float: left;
  margin: 0.08em 0.1em 0 0;
  color: var(--brand, #1f4d6d);
}

/* Body text typography */
.ap-bio-body :deep(p) {
  font-size: 1.0625rem;
  line-height: 1.82;
  color: var(--ink, #10141a);
  margin: 0 0 1.375em;
  max-width: 65ch;
  letter-spacing: 0.005em;
}

.ap-bio-body :deep(h2),
.ap-bio-body :deep(h3) {
  font-family: "Cormorant Garamond", serif;
  font-weight: 700;
  letter-spacing: -0.015em;
  color: var(--brand, #1f4d6d);
  margin: 2.25em 0 0.75em;
}
.ap-bio-body :deep(h2) {
  font-size: clamp(1.375rem, 2.5vw, 1.75rem);
  line-height: 1.2;
}
.ap-bio-body :deep(h3) {
  font-size: clamp(1.125rem, 2vw, 1.375rem);
  line-height: 1.3;
}

.ap-bio-body :deep(blockquote) {
  margin: 2rem 0;
  padding: 1.25rem 1.5rem;
  border-left: 3px solid var(--accent, #c96b34);
  background: rgba(201, 107, 52, 0.04);
  border-radius: 0 8px 8px 0;
}
.ap-bio-body :deep(blockquote p) {
  font-family: "Cormorant Garamond", serif;
  font-size: 1.25rem;
  font-style: italic;
  font-weight: 500;
  color: var(--brand, #1f4d6d);
  margin: 0;
}

.ap-bio-body :deep(a) {
  color: var(--accent, #c96b34);
  text-decoration: underline;
  text-underline-offset: 3px;
  text-decoration-thickness: 1px;
}

.ap-bio-body :deep(code) {
  font-family: "JetBrains Mono", monospace;
  font-size: 0.875em;
  background: rgba(31,77,109,0.07);
  color: var(--brand, #1f4d6d);
  padding: 0.15em 0.4em;
  border-radius: 4px;
}

.ap-bio-body :deep(strong) {
  font-weight: 700;
  color: var(--ink, #10141a);
}

.ap-bio-body :deep(hr) {
  border: none;
  border-top: 1px solid var(--line, rgba(16,20,26,0.13));
  margin: 2.5rem 0;
}

/* Error + skeleton */
.ap-article__err {
  font-size: 0.9375rem;
  color: var(--ink-muted, rgba(16,20,26,0.55));
  line-height: 1.7;
  max-width: 55ch;
}

.ap-skel { display: flex; flex-direction: column; gap: 0.75rem; max-width: 500px; }
.ap-skel__title,
.ap-skel__line {
  border-radius: 5px;
  background: linear-gradient(90deg, #e4ecf3 25%, #eef3f8 50%, #e4ecf3 75%);
  background-size: 200% 100%;
  animation: ap-shimmer 1.4s ease-in-out infinite;
}
.ap-skel__title { height: 2.25rem; width: 38%; margin-bottom: 0.5rem; }
.ap-skel__line  { height: 13px; }
@keyframes ap-shimmer {
  0%   { background-position:  200% 0; }
  100% { background-position: -200% 0; }
}

/* ══ DIVIDER ═════════════════════════════════════════════════ */
.ap-divider {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.25rem;
}
.ap-divider::before,
.ap-divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--line, rgba(16,20,26,0.13));
}
.ap-divider__label {
  font-family: "JetBrains Mono", monospace;
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--ink-muted, rgba(16,20,26,0.45));
  white-space: nowrap;
  flex-shrink: 0;
}

/* Shared section title */
.ap-sec-title {
  font-size: clamp(1.75rem, 4vw, 2.75rem);
  line-height: 1.05;
  letter-spacing: -0.02em;
  color: var(--brand, #1f4d6d);
  font-weight: 700;
  margin: 0 0 2.25rem;
}

/* ══ SKILLS ══════════════════════════════════════════════════ */
.ap-skills {
  padding-top: clamp(3rem, 6vw, 5rem);
  padding-bottom: clamp(3rem, 6vw, 5rem);
}

.ap-skill-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 0;
  border-top: 1px solid var(--line, rgba(16,20,26,0.13));
  border-left: 1px solid var(--line, rgba(16,20,26,0.13));
}

.ap-skill-item {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0.9rem 1rem;
  min-height: 48px;
  border-right: 1px solid var(--line, rgba(16,20,26,0.13));
  border-bottom: 1px solid var(--line, rgba(16,20,26,0.13));
  background: var(--surface, rgba(255,255,255,0.92));
  transition: background 180ms, color 180ms, border-color 180ms;
  animation: ap-fade-up 280ms ease-out both;
  cursor: default;
}
.ap-skill-item:hover {
  background: rgba(31, 77, 109, 0.07);
  border-right-color: var(--brand, #1f4d6d);
  border-bottom-color: var(--brand, #1f4d6d);
}
.ap-skill-item:hover .ap-skill-item__num {
  color: var(--accent, #c96b34);
}
.ap-skill-item:hover .ap-skill-item__name {
  color: var(--brand, #1f4d6d);
}

.ap-skill-item__num {
  font-family: "JetBrains Mono", monospace;
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: var(--ink-muted, rgba(16,20,26,0.4));
  flex-shrink: 0;
  transition: color 180ms;
  line-height: 1;
  padding-top: 0.1em;
}

.ap-skill-item__name {
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--ink, #10141a);
  transition: color 180ms;
  line-height: 1.3;
}

@keyframes ap-fade-up {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* ══ TIMELINE ════════════════════════════════════════════════ */
.ap-tl-section {
  padding-top: clamp(3rem, 6vw, 5rem);
  padding-bottom: clamp(3rem, 6vw, 5rem);
}

.ap-tl-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0;
  position: relative;
}
.ap-tl-list::before {
  content: '';
  position: absolute;
  left: calc(6rem + 1rem);
  top: 1.875rem;
  bottom: 1.875rem;
  width: 1px;
  background: linear-gradient(
    180deg,
    transparent,
    var(--line, rgba(16,20,26,0.13)) 8%,
    var(--line, rgba(16,20,26,0.13)) 92%,
    transparent
  );
  pointer-events: none;
}

.ap-tl-entry {
  display: grid;
  grid-template-columns: 6rem 1fr;
  gap: 0 2rem;
  padding: 1.75rem 0.5rem 1.75rem 0;
  border-top: 1px solid var(--line-soft, rgba(16,20,26,0.08));
  align-items: start;
  animation: ap-fade-up 320ms ease-out both;
  position: relative;
  border-radius: 0 8px 8px 0;
  margin-left: -0.5rem;
  transition: background 180ms;
}
.ap-tl-entry:last-child {
  border-bottom: 1px solid var(--line-soft, rgba(16,20,26,0.08));
}
.ap-tl-entry:hover {
  background: rgba(201, 107, 52, 0.04);
}
.ap-tl-entry:hover::after {
  background: var(--brand, #1f4d6d);
  box-shadow: 0 0 0 2px var(--bg-elevated, #f7f9fb), 0 0 0 4px var(--brand, #1f4d6d);
}

.ap-tl-entry::after {
  content: '';
  position: absolute;
  left: calc(6rem + 1rem);
  top: 1.875rem;
  transform: translateX(-50%);
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--accent, #c96b34);
  box-shadow: 0 0 0 2px var(--bg-elevated, #f7f9fb), 0 0 0 3px var(--accent, #c96b34);
  transition: background 180ms, box-shadow 180ms;
}

.ap-tl-entry__year {
  font-family: "Cormorant Garamond", serif;
  font-size: 1.5rem;
  font-weight: 700;
  font-style: italic;
  line-height: 1.25;
  color: var(--brand, #1f4d6d);
  letter-spacing: -0.02em;
  padding-top: 0.1em;
  text-align: right;
  padding-right: 0.5rem;
}

.ap-tl-entry__body {
  padding-left: 1.25rem;
}

.ap-tl-entry__title {
  font-size: 1rem;
  font-weight: 700;
  color: var(--ink, #10141a);
  margin: 0 0 0.3125rem;
  line-height: 1.4;
  letter-spacing: 0.005em;
}

.ap-tl-entry__desc {
  font-size: 0.9rem;
  line-height: 1.75;
  color: var(--ink-muted, rgba(16,20,26,0.6));
  margin: 0;
  max-width: 58ch;
}

.ap-contact {
  padding-top: clamp(3rem, 6vw, 4.5rem);
  padding-bottom: clamp(3rem, 6vw, 5rem);
}

.ap-contact__card {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 2rem;
  padding: 2.5rem 3rem;
  background: linear-gradient(
    135deg,
    rgba(31, 77, 109, 0.05) 0%,
    rgba(255,255,255,0.97) 60%,
    rgba(201, 107, 52, 0.04) 100%
  );
  border: 1px solid rgba(31, 77, 109, 0.15);
  border-radius: 16px;
  box-shadow:
    inset 0 2px 0 0 var(--brand, #1f4d6d),
    0 8px 40px rgba(16,20,26,0.08);
}

.ap-contact__text {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-width: 400px;
}

.ap-contact__title {
  font-size: clamp(1.625rem, 3.5vw, 2.375rem);
  line-height: 1.08;
  letter-spacing: -0.02em;
  color: var(--brand, #1f4d6d);
  margin: 0;
  font-weight: 700;
}

.ap-contact__sub {
  font-size: 0.9375rem;
  line-height: 1.7;
  color: var(--ink-muted, rgba(16,20,26,0.6));
  margin: 0.25rem 0 0;
  max-width: 44ch;
}

.ap-contact__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.625rem;
  flex-shrink: 0;
}

/* Buttons */
.ap-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.4375rem;
  padding: 0 1.5rem;
  min-height: 44px;
  border-radius: 9px;
  font-size: 0.9375rem;
  font-weight: 700;
  letter-spacing: 0.01em;
  text-decoration: none;
  transition: transform 150ms ease, box-shadow 160ms ease, background 150ms;
  cursor: pointer;
  white-space: nowrap;
}
.ap-btn__ico {
  width: 15px; height: 15px;
  flex-shrink: 0;
}

.ap-btn--primary {
  background: var(--brand, #1f4d6d);
  color: #fff;
  box-shadow: 0 3px 12px rgba(31,77,109,0.22);
}
.ap-btn--primary:hover {
  background: #163852;
  transform: translateY(-2px);
  box-shadow: 0 7px 22px rgba(31,77,109,0.28);
}

.ap-btn--outline {
  background: transparent;
  color: var(--ink, #10141a);
  border: 1.5px solid var(--line, rgba(16,20,26,0.22));
}
.ap-btn--outline:hover {
  border-color: var(--brand, #1f4d6d);
  color: var(--brand, #1f4d6d);
  transform: translateY(-2px);
}

/* Mobile adjustments */
@media (max-width: 639px) {
  .ap-tl-entry {
    grid-template-columns: 4.5rem 1fr;
    gap: 0 1.25rem;
  }
  .ap-tl-entry::after {
    left: calc(4.5rem + 0.625rem);
  }
  .ap-tl-list::before {
    left: calc(4.5rem + 0.625rem);
  }
  .ap-tl-entry__year { font-size: 1.25rem; }
  .ap-contact__card { padding: 1.75rem 2rem; }
}
</style>
