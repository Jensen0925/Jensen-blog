import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "Jensen's Blog",
  description: "📝个人学习记录",
  markdown: {
    // 代码块风格
    // theme: 'material-theme-palenight',
    theme: 'github-light',
    // 代码块显示行数
    lineNumbers: true,
  },
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: '首页', link: '/' },
      { text: 'JavaScript', link: '/javascript/' },
      { text: 'React', link: '/react/' },
      { text: 'Vue', link: '/vue/' },
      { text: '工程化', link: '/engineering/' },
    ],
    // search: {
    //   provider: 'algolia',
    //   options: {
    //     appId: '<Application ID>',
    //     apiKey: '<Search-Only API Key>',
    //     indexName: '<INDEX_NAME>',
    //     locales: {
    //       root: {
    //         placeholder: '搜索文档',
    //         translations: {
    //           button: {
    //             buttonText: '搜索文档',
    //             buttonAriaLabel: '搜索文档'
    //           },
    //           modal: {
    //             searchBox: {
    //               resetButtonTitle: '清除查询条件',
    //               resetButtonAriaLabel: '清除查询条件',
    //               cancelButtonText: '取消',
    //               cancelButtonAriaLabel: '取消'
    //             },
    //             startScreen: {
    //               recentSearchesTitle: '搜索历史',
    //               noRecentSearchesText: '没有搜索历史',
    //               saveRecentSearchButtonTitle: '保存至搜索历史',
    //               removeRecentSearchButtonTitle: '从搜索历史中移除',
    //               favoriteSearchesTitle: '收藏',
    //               removeFavoriteSearchButtonTitle: '从收藏中移除'
    //             },
    //             errorScreen: {
    //               titleText: '无法获取结果',
    //               helpText: '你可能需要检查你的网络连接'
    //             },
    //             footer: {
    //               selectText: '选择',
    //               navigateText: '切换',
    //               closeText: '关闭',
    //               searchByText: '搜索提供者'
    //             },
    //             noResultsScreen: {
    //               noResultsText: '无法找到相关结果',
    //               suggestedQueryText: '你可以尝试查询',
    //               reportMissingResultsText: '你认为该查询应该有结果？',
    //               reportMissingResultsLinkText: '点击反馈'
    //             },
    //           },
    //         },
    //       },
    //     },
    //   },
    // },

    sidebar: {
      '/javascript/': [
        {
          text: 'JavaScript',
          collapsed: false,
          items: [
            { text: '基础知识', link: '/javascript/basics' },
            { text: '进阶概念', link: '/javascript/advanced' },
            { text: 'ES6+特性', link: '/javascript/es6' }
          ]
        }
      ],
      '/react/': [
        {
          text: 'React',
          collapsed: false,
          items: [
            { text: '入门指南', link: '/react/getting-started' },
            { text: '组件开发', link: '/react/components' },
            { text: 'Hooks使用', link: '/react/hooks' }
          ]
        }
      ],
      '/vue/': [
        {
          text: 'Vue',
          collapsed: false,
          items: [
            { text: '入门指南', link: '/vue/getting-started' },
            { text: '组件开发', link: '/vue/components' },
            { text: '组合式API', link: '/vue/composition-api' }
          ]
        }
      ],
      '/engineering/': [
        {
          text: '工程化',
          collapsed: false,
          items: [
            { text: '基础知识', link: '/engineering/basics' },
            { text: '构建工具', link: '/engineering/build-tools' },
            { text: '性能优化', link: '/engineering/performance' },
            { text: '测试与部署', link: '/engineering/testing-and-deployment' }
          ]
        }
      ]
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/vuejs/vitepress' }
    ],
    // 底部版权部分
    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2025-present Jensen',
    },

  }
})
