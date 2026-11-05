export default defineNuxtConfig({
  ssr: false,
  modules: ["@nuxt/ui", "@pinia/nuxt", "@nuxtjs/i18n", "@nuxtjs/color-mode"],
  css: ["~/assets/css/main.css", "~/assets/css/motion.css"],
  i18n: {
    defaultLocale: "en",
    lazy: true,
    langDir: "../locales",
    strategy: "no_prefix",
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: "i18n_redirected",
      redirectOn: "root",
    },
    locales: [
      { code: "en", name: "English", language: "en-US", file: "en.json" },
      { code: "km", name: "ខ្មែរ", language: "km-KH", file: "km.json" },
    ],
  },
  colorMode: {
    classSuffix: "",
    preference: "light",
  },
  runtimeConfig: {
    public: {
      apiBase: "",
    },
  },
  app: {
    pageTransition: { name: "page", mode: "out-in" },
    layoutTransition: { name: "layout", mode: "out-in" },
    head: {
      title: "Phkar HR",
      htmlAttrs: {
        lang: "en",
      },
      meta: [
        { name: "viewport", content: "width=device-width, initial-scale=1" },
        { name: "theme-color", content: "#f8fafc" },
      ],
    },
  },
  typescript: {
    strict: true,
    typeCheck: true,
  },
  vite: {
    server: {
      allowedHosts: ["kennel-impeach-boundless.ngrok-free.dev"],
    },
  },
  compatibilityDate: "2025-01-01",
});
