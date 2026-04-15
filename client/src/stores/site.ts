import { defineStore } from "pinia";
import { getSiteSettings, getSiteStats } from "@/services/blog";

export const useSiteStore = defineStore("site", {
  state: () => ({
    settings: getSiteSettings(),
    stats: getSiteStats(),
  }),
});
