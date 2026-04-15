<template>
  <section
    class="content-shell grid gap-8 py-12 lg:grid-cols-[360px_minmax(0,1fr)]"
  >
    <div class="overflow-hidden rounded-md">
      <img
        alt="书桌与笔记本"
        class="h-full min-h-80 w-full object-cover"
        src="https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?auto=format&fit=crop&w=1200&q=80"
      />
    </div>

    <div class="border border-line bg-white p-6 md:p-8">
      <p class="text-sm text-coral">About</p>
      <h1 class="mt-2 font-display text-5xl">关于我</h1>
      <p class="mt-6 max-w-2xl text-lg leading-8 text-ink/75">
        这里用于放置个人简介、联系方式、长期项目和写作主题。后台系统设置完成后，可将这些内容改为接口驱动。
      </p>
      <div class="mt-8 grid gap-3 text-sm text-ink/65">
        <p>邮箱：hello@example.com</p>
        <p>GitHub：github.com/example</p>
        <p>城市：深圳</p>
      </div>
    </div>
  </section>
</template>
