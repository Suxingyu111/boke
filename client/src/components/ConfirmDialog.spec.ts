import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import ConfirmDialog from "@/components/ConfirmDialog.vue";

describe("ConfirmDialog", () => {
  it("renders content and emits confirm/cancel actions", async () => {
    const wrapper = mount(ConfirmDialog, {
      props: {
        open: true,
        title: "删除文章",
        message: "确认永久删除？",
        confirmLabel: "删除",
      },
      global: {
        stubs: {
          teleport: true,
        },
      },
    });

    expect(wrapper.text()).toContain("删除文章");
    expect(wrapper.text()).toContain("确认永久删除？");

    const buttons = wrapper.findAll("button");
    await buttons[1].trigger("click");
    await buttons[0].trigger("click");

    expect(wrapper.emitted("confirm")).toHaveLength(1);
    expect(wrapper.emitted("cancel")).toHaveLength(1);
  });
});
