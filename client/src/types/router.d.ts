import "vue-router";
import type { UserRole } from "@/types/blog";

declare module "vue-router" {
  interface RouteMeta {
    title?: string;
    requiresAuth?: boolean;
    minRole?: UserRole;
  }
}

export {};
