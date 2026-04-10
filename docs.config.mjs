export default {
  siteName: "Rootree 文档",
  siteDescription: "Rootreemc是由go开发的高性能服务端",
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
        link: "https://github.com/hekuo5310/rootreemc-docs",
        newTab: true
      }
    ]
  },
  nav: [
    { text: "首页", link: "/" },
    { text: "指南", link: "/guide/getting-started/" }
  ]
};
