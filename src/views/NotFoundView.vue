<template>
  <main class="grid min-h-screen place-items-center px-6 py-16 text-center">
    <section>
      <p
        class="text-sm font-semibold uppercase tracking-widest text-indigo-600"
      >
        404
      </p>
      <h1 class="mt-3 text-3xl font-bold tracking-tight text-slate-950">
        找不到这个页面
      </h1>
      <p class="mt-3 text-slate-600">你访问的地址不存在，或页面已移动。</p>
      <RouterLink
        class="mt-7 inline-flex rounded-lg bg-indigo-600 px-5 py-3 font-semibold text-white transition hover:bg-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
        :to="{ name: 'home' }"
      >
        返回首页
      </RouterLink>
    </section>
  </main>
</template>
