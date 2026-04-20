import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import Pagination from "@/components/Pagination.vue";

describe("Pagination", () => {
  it("renders summary and emits page changes", async () => {
    const wrapper = mount(Pagination, {
      props: {
        currentPage: 2,
        totalPages: 4,
        total: 28,
      },
    });

    expect(wrapper.text()).toContain("共 28 项，第 2 / 4 页");

    await wrapper.get("button:last-child").trigger("click");

    expect(wrapper.emitted("change")).toEqual([[3]]);
  });

  it("shows page number buttons when requested", () => {
    const wrapper = mount(Pagination, {
      props: {
        currentPage: 4,
        totalPages: 8,
        showPageNumbers: true,
      },
    });

    expect(wrapper.text()).toContain("1");
    expect(wrapper.text()).toContain("4");
    expect(wrapper.text()).toContain("8");
  });
});
