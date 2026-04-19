<script setup lang="ts">
import { computed } from "vue";
import type { PublicComment } from "@/types/blog";

defineOptions({
  name: "CommentThreadItem",
});

const props = withDefaults(
  defineProps<{
    comment: PublicComment;
    depth?: number;
    activeReplyId?: string | null;
  }>(),
  {
    depth: 0,
    activeReplyId: null,
  },
);

const emit = defineEmits<{
  (event: "reply", comment: PublicComment): void;
}>();

const indentStyle = computed(() => ({
  marginLeft: `${Math.min(props.depth, 3) * 18}px`,
}));

function formatDate(value: string) {
  return new Date(value).toLocaleString("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}
</script>

<template>
  <article
    class="border-l border-line/80 pl-4"
    :style="indentStyle"
  >
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div class="min-w-0">
        <div class="flex flex-wrap items-center gap-2">
          <a
            v-if="comment.authorWebsite"
            class="focus-ring font-semibold text-brand hover:text-coral"
            :href="comment.authorWebsite"
            rel="noreferrer"
            target="_blank"
          >
            {{ comment.authorName }}
          </a>
          <span v-else class="font-semibold text-brand">
            {{ comment.authorName }}
          </span>
          <span
            v-if="comment.parentId"
            class="rounded-md border border-line bg-paper px-2 py-1 text-xs text-ink/55"
          >
            回复
          </span>
        </div>
        <p class="mt-1 text-xs text-ink/48">
          {{ formatDate(comment.createdAt) }}
        </p>
      </div>

      <button
        class="focus-ring rounded-md border border-line px-3 py-2 text-sm text-ink/68 hover:border-brand hover:text-brand"
        type="button"
        @click="emit('reply', comment)"
      >
        {{ activeReplyId === comment.id ? "正在回复" : "回复" }}
      </button>
    </div>

    <p class="mt-3 whitespace-pre-wrap leading-7 text-ink/78">
      {{ comment.content }}
    </p>

    <div v-if="comment.replies.length" class="mt-4 grid gap-4">
      <CommentThreadItem
        v-for="reply in comment.replies"
        :key="reply.id"
        :active-reply-id="activeReplyId"
        :comment="reply"
        :depth="depth + 1"
        @reply="emit('reply', $event)"
      />
    </div>
  </article>
</template>
