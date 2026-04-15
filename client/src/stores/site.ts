import { defineStore } from "pinia";
import { getSiteSettings } from "@/services/blog";
import { useContentStore } from "@/stores/content";

export const useSiteStore = defineStore("site", {
  state: () => ({
    settings: getSiteSettings(),
  }),
  getters: {
    stats: () => useContentStore().stats,
  },
});
