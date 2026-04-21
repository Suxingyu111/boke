import { describe, expect, it } from "vitest";
import {
  canAccessAdminFeatures,
  canAccessManagement,
  getDefaultAuthorizedRoute,
  hasMinimumRole,
  resolveMinimumRole,
} from "@/utils/permissions";

describe("permissions", () => {
  it("根据角色判断后台访问范围", () => {
    expect(canAccessManagement({ role: "author" })).toBe(true);
    expect(canAccessAdminFeatures({ role: "author" })).toBe(false);
    expect(canAccessAdminFeatures({ role: "admin" })).toBe(true);
    expect(canAccessAdminFeatures({ role: "super_admin" })).toBe(true);
    expect(canAccessManagement({ role: "user" })).toBe(false);
  });

  it("根据角色返回默认登录落点", () => {
    expect(getDefaultAuthorizedRoute({ role: "user" })).toBe("/");
    expect(getDefaultAuthorizedRoute({ role: "author" })).toBe(
      "/admin/articles",
    );
    expect(getDefaultAuthorizedRoute({ role: "admin" })).toBe("/admin");
    expect(getDefaultAuthorizedRoute({ role: "super_admin" })).toBe("/admin");
  });

  it("可解析嵌套路由所需的最高权限", () => {
    expect(resolveMinimumRole(["author", "admin"])).toBe("admin");
    expect(hasMinimumRole("super_admin", "admin")).toBe(true);
    expect(hasMinimumRole("user", "author")).toBe(false);
  });
});
