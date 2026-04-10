export default {
  siteName: "Rootree 文档",
  siteDescription: "Rootreemc是由go开发的高性能Minecraft服务端",
  docsDir: "docs",
  outDir: "dist",
  base: "/",
  header: {
    sticky: true,
    background: "solid",
    logo: {
      text: "Rootree 文档",
      link: "/",
      image: "",
      alt: "Rootree 文档"
    },
    rightButtons: [
      {
        text: "GitHub",
        link: "https://github.com/Xiao-QDev/RootreeMC",
        newTab: true
      }
    ]
  },
  i18n: {
    enabled: true,
    endpoint: "https://deepl.io.hk.cn/translate",
    sourceLang: "zh",
    defaultLang: "zh",
    altCount: 2,
    cache: true,
    autoApplySaved: true,
    languages: [
      { code: "zh", label: "简体中文" },
      { code: "en", label: "English" }
    ]
  },
  nav: [
    { text: "首页", link: "/" },
  ]
};
