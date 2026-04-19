<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { useContentStore } from "@/stores/content";

const contentStore = useContentStore();
const allArticles = computed(() => contentStore.publishedArticles);

// Top 5 most-viewed for carousel
const carouselArticles = computed(() =>
  [...allArticles.value].sort((a, b) => b.viewCount - a.viewCount).slice(0, 5),
);

// 10 most recently published — sorted by publishedAt descending
const recentArticles = computed(() =>
  [...allArticles.value]
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    .slice(0, 10),
);

// Carousel state
const currentIndex = ref(0);
const isHovered = ref(false);
let autoPlayTimer: ReturnType<typeof setInterval> | null = null;

function nextSlide() {
  if (!carouselArticles.value.length) return;
  currentIndex.value = (currentIndex.value + 1) % carouselArticles.value.length;
}

function prevSlide() {
  if (!carouselArticles.value.length) return;
  currentIndex.value =
    (currentIndex.value - 1 + carouselArticles.value.length) %
    carouselArticles.value.length;
}

function goToSlide(index: number) {
  currentIndex.value = index;
}

function startAutoPlay() {
  autoPlayTimer = setInterval(() => {
    if (!isHovered.value) nextSlide();
  }, 5000);
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("zh-CN", { month: "long", day: "numeric" });
}

onMounted(async () => {
  await contentStore.loadPublicContent();
  startAutoPlay();
});

onUnmounted(() => {
  if (autoPlayTimer) clearInterval(autoPlayTimer);
});
</script>

<template>
  <!-- Carousel – top 5 most-viewed -->
  <section v-if="carouselArticles.length" aria-label="热门文章轮播" class="carousel-section">
    <div class="content-shell">
    <div
      class="carousel-wrapper"
      @mouseenter="isHovered = true"
      @mouseleave="isHovered = false"
    >
      <article
        v-for="(article, index) in carouselArticles"
        :key="article.id"
        class="carousel-slide"
        :class="{ 'carousel-slide--active': index === currentIndex }"
        :aria-hidden="index !== currentIndex"
      >
        <img class="carousel-slide__bg" :src="article.coverImage" :alt="article.title" :loading="index === 0 ? 'eager' : 'lazy'" />
        <div class="carousel-slide__shade"></div>
        <div class="carousel-slide__body">
          <p class="carousel-kicker">热门推荐</p>
          <div class="carousel-meta">
            <span class="carousel-cat">{{ article.category.name }}</span>
            <span>{{ formatDate(article.publishedAt) }}</span>
            <span>{{ article.viewCount.toLocaleString() }} 阅读</span>
          </div>
          <RouterLink class="focus-ring rounded-md" :to="`/articles/${article.slug}`">
            <h2 class="carousel-slide__title">{{ article.title }}</h2>
          </RouterLink>
          <p class="carousel-slide__excerpt">{{ article.excerpt }}</p>
          <div class="carousel-actions">
            <RouterLink class="focus-ring home-button home-button--light" :to="`/articles/${article.slug}`">
              阅读文章
            </RouterLink>
            <a class="focus-ring home-button home-button--ghost" href="#home-feed">继续向下</a>
          </div>
        </div>
      </article>

      <button class="carousel-arrow carousel-arrow--prev" type="button" aria-label="上一篇" @click="prevSlide">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" class="h-5 w-5">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <button class="carousel-arrow carousel-arrow--next" type="button" aria-label="下一篇" @click="nextSlide">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" class="h-5 w-5">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7" />
        </svg>
      </button>

      <div class="carousel-dots" role="tablist" aria-label="选择幻灯片">
        <button
          v-for="(article, index) in carouselArticles"
          :key="article.id"
          class="carousel-dot"
          :class="{ 'carousel-dot--active': index === currentIndex }"
          type="button"
          role="tab"
          :aria-label="`第 ${index + 1} 篇`"
          :aria-selected="index === currentIndex"
          @click="goToSlide(index)"
        ></button>
      </div>

      <div class="carousel-counter" aria-hidden="true">
        <span class="carousel-counter__cur">{{ String(currentIndex + 1).padStart(2, "0") }}</span>
        <span>&nbsp;/&nbsp;</span>
        <span>{{ String(carouselArticles.length).padStart(2, "0") }}</span>
      </div>
      <!-- Auto-play progress bar — :key restarts animation on slide change -->
      <div class="carousel-progress">
        <div :key="currentIndex" class="carousel-progress__bar"></div>
      </div>
    </div><!-- /carousel-wrapper -->
    </div><!-- /content-shell -->
  </section>

  <!-- Loading skeleton -->
  <section v-else-if="contentStore.loading" class="home-loading">
    <div class="content-shell home-loading__grid">
      <div class="home-loading__block animate-pulse"></div>
      <div class="home-loading__line animate-pulse"></div>
      <div class="home-loading__line home-loading__line--short animate-pulse"></div>
    </div>
  </section>

  <!-- Empty state -->
  <section v-else class="home-empty">
    <div class="content-shell">
      <div class="ui-surface p-6 md:p-8">
        <p class="eyebrow">Content</p>
        <h1 class="mt-2 font-display text-5xl">还没有公开文章</h1>
        <p class="mt-4 max-w-2xl text-ink/66">文章发布后会出现在这里。</p>
      </div>
    </div>
  </section>

  <!-- Error -->
  <section v-if="contentStore.errorMessage" class="content-shell pt-3 pb-2">
    <p class="rounded-md border border-coral/30 bg-coral/10 px-4 py-3 text-sm text-coral">
      {{ contentStore.errorMessage }}
    </p>
  </section>

  <!-- Recent articles -->
  <section id="home-feed" class="recent-section">
    <div class="content-shell">
      <div class="recent-header">
        <p class="eyebrow">Latest</p>
        <h2 class="recent-title">最近更新</h2>
      </div>

      <div v-if="recentArticles.length" class="recent-grid">
        <RouterLink
          v-for="article in recentArticles"
          :key="article.id"
          class="focus-ring recent-card"
          :to="`/articles/${article.slug}`"
        >
          <img
            class="recent-card__thumb"
            :src="article.coverImage"
            :alt="article.title"
            loading="lazy"
          />
          <div class="recent-card__body">
            <div class="recent-card__meta">
              <span
                class="recent-card__cat"
                :style="article.category.color ? { background: article.category.color + '22', color: article.category.color } : {}"
              >
                {{ article.category.name }}
              </span>
              <span>{{ formatDate(article.publishedAt) }}</span>
              <span>{{ article.viewCount.toLocaleString() }} 阅读</span>
            </div>
            <h3 class="recent-card__title">{{ article.title }}</h3>
            <p class="recent-card__excerpt">{{ article.excerpt }}</p>
          </div>
        </RouterLink>
      </div>

      <!-- View all articles -->
      <div v-if="recentArticles.length" class="recent-more">
        <RouterLink class="focus-ring recent-more-link" to="/archives">
          查看全部文章
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </RouterLink>
      </div>

      <div v-else-if="!contentStore.loading" class="ui-surface p-5 mt-5">
        <p class="font-display text-2xl">暂无文章</p>
      </div>
    </div>
  </section>
</template>

<style scoped>
/* ─── Carousel ─── */
.carousel-section {
  padding-top: 1.25rem;
}

.carousel-wrapper {
  position: relative;
  height: min(52svh, 480px);
  min-height: 340px;
  overflow: hidden;
  background: #10141a;
  border-radius: 12px;
}

.carousel-slide {
  position: absolute;
  inset: 0;
  opacity: 0;
  pointer-events: none;
  transition: opacity 700ms ease;
}
.carousel-slide--active {
  opacity: 1;
  pointer-events: auto;
}

.carousel-slide__bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
}

.carousel-slide__shade {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(90deg, rgba(8,10,12,0.88), rgba(8,10,12,0.36) 55%, rgba(8,10,12,0.1)),
    linear-gradient(0deg, rgba(8,10,12,0.78), rgba(8,10,12,0.06) 52%);
}

.carousel-slide__body {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  padding: clamp(20px, 4vw, 56px) clamp(20px, 5vw, 80px);
  color: #fffaf4;
}

.carousel-kicker {
  color: rgba(255,250,244,0.68);
  font-size: 0.76rem;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.carousel-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.6rem;
  color: rgba(255,250,244,0.7);
  font-size: 0.85rem;
  font-weight: 600;
}
.carousel-cat {
  border: 1px solid rgba(255,250,244,0.35);
  border-radius: 4px;
  padding: 0.1rem 0.45rem;
  font-size: 0.74rem;
}

.carousel-slide__title {
  max-width: 50rem;
  margin-top: 0.8rem;
  font-family: "Cormorant Garamond", "STSong", "Songti SC", serif;
  font-size: clamp(1.9rem, 4.8vw, 4.4rem);
  line-height: 1.02;
  overflow-wrap: anywhere;
  color: #fffaf4;
}
.carousel-slide__title:hover { opacity: 0.84; }

.carousel-slide__excerpt {
  max-width: 42rem;
  margin-top: 0.7rem;
  color: rgba(255,250,244,0.76);
  font-size: 1rem;
  line-height: 1.74;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.carousel-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.7rem;
  margin-top: 1.3rem;
}

.carousel-arrow {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  border-radius: 50%;
  background: rgba(255,255,255,0.14);
  border: 1px solid rgba(255,255,255,0.22);
  color: #fffaf4;
  backdrop-filter: blur(8px);
  cursor: pointer;
  transition: background 180ms, transform 180ms;
}
.carousel-arrow:hover { background: rgba(255,255,255,0.28); transform: translateY(-50%) scale(1.08); }
.carousel-arrow--prev { left: clamp(12px, 2vw, 28px); }
.carousel-arrow--next { right: clamp(12px, 2vw, 28px); }

.carousel-dots {
  position: absolute;
  bottom: 1.2rem;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 0.4rem;
  z-index: 10;
}
.carousel-dot {
  height: 4px;
  width: 22px;
  border-radius: 2px;
  border: none;
  background: rgba(255,255,255,0.36);
  cursor: pointer;
  transition: background 220ms, width 220ms ease;
}
.carousel-dot--active { width: 38px; background: #fffaf4; }

.carousel-counter {
  position: absolute;
  bottom: 1.1rem;
  right: clamp(12px, 2.5vw, 32px);
  display: flex;
  align-items: baseline;
  color: rgba(255,250,244,0.5);
  font-size: 0.8rem;
  font-weight: 700;
  z-index: 10;
}
.carousel-counter__cur { color: #fffaf4; font-size: 1rem; }

/* Auto-play progress bar */
.carousel-progress {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: rgba(255,255,255,0.15);
  z-index: 10;
}
@keyframes progressFill {
  from { width: 0%; }
  to   { width: 100%; }
}
.carousel-progress__bar {
  height: 100%;
  background: rgba(255,255,255,0.8);
  animation: progressFill 5s linear forwards;
}
.carousel-wrapper:hover .carousel-progress__bar {
  animation-play-state: paused;
}

/* ─── Recent section ─── */
.recent-section {
  padding-block: 1.5rem 2rem;
  scroll-margin-top: 64px;
}

.recent-header {
  display: flex;
  align-items: baseline;
  gap: 1rem;
  margin-bottom: 1rem;
}
.recent-title {
  font-family: "Cormorant Garamond", "STSong", "Songti SC", serif;
  font-size: 1.9rem;
  line-height: 1.1;
  color: var(--ink);
}

/* 2-column grid on md+, 1 col on mobile */
.recent-grid {
  display: grid;
  gap: 0.75rem;
  grid-template-columns: 1fr;
}
@media (min-width: 640px) {
  .recent-grid { grid-template-columns: 1fr 1fr; }
}
@media (min-width: 1024px) {
  .recent-grid { grid-template-columns: 1fr 1fr; gap: 0.85rem; }
}

/* Compact horizontal card */
.recent-card {
  display: grid;
  grid-template-columns: 120px minmax(0, 1fr);
  gap: 0;
  overflow: hidden;
  border: 1px solid rgba(16,20,26,0.09);
  border-radius: 8px;
  background: rgba(255,255,255,0.88);
  box-shadow: 0 2px 8px rgba(16,20,26,0.06);
  transition: border-color 180ms, box-shadow 180ms, transform 180ms;
}
.recent-card:hover {
  border-color: rgba(31,77,109,0.28);
  box-shadow: 0 6px 20px rgba(16,20,26,0.11);
  transform: translateY(-2px);
}

.recent-card__thumb {
  width: 120px;
  height: 100%;
  min-height: 80px;
  object-fit: cover;
  display: block;
  flex-shrink: 0;
}

.recent-card__body {
  padding: 0.6rem 0.75rem;
  display: grid;
  gap: 0.25rem;
  align-content: start;
}

.recent-card__meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.72rem;
  color: rgba(16,20,26,0.48);
  line-height: 1.2;
}
.recent-card__cat {
  font-weight: 700;
  font-size: 0.68rem;
  padding: 0.1rem 0.42rem;
  border-radius: 4px;
  background: rgba(31,77,109,0.1);
  color: var(--brand);
}

.recent-card__title {
  font-family: "Cormorant Garamond", "STSong", "Songti SC", serif;
  font-size: 1.05rem;
  line-height: 1.3;
  color: var(--ink);
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  transition: color 160ms;
}
.recent-card:hover .recent-card__title { color: var(--brand); }

.recent-card__excerpt {
  font-size: 0.78rem;
  line-height: 1.5;
  color: rgba(16,20,26,0.58);
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

/* ─── Mobile tweaks ─── */
@media (max-width: 640px) {
  .carousel-slide__excerpt { display: none; }
  .carousel-arrow { width: 34px; height: 34px; }
  .carousel-dots { bottom: 0.9rem; }
  .carousel-counter { display: none; }
}

/* ─── View all link ─── */
.recent-more {
  display: flex;
  justify-content: center;
  margin-top: 1.25rem;
}
.recent-more-link {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--brand);
  padding: 0.5rem 1.5rem;
  border: 1px solid rgba(31,77,109,0.25);
  border-radius: 999px;
  transition: background 160ms, border-color 160ms, gap 160ms;
}
.recent-more-link:hover {
  background: rgba(31,77,109,0.06);
  border-color: rgba(31,77,109,0.5);
  gap: 0.6rem;
}
</style>
