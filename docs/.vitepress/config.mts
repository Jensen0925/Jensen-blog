import { defineConfig } from 'vitepress'
import { groupIconMdPlugin, groupIconVitePlugin, localIconLoader } from 'vitepress-plugin-group-icons'
import markdownItTaskCheckbox from 'markdown-it-task-checkbox'
import { MermaidMarkdown, MermaidPlugin } from 'vitepress-plugin-mermaid';

import { usePosts } from './theme/utils/permalink';
const { rewrites } = await usePosts();
// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "Jensen's Blog",
  description: "📝个人学习记录",
  rewrites,
  markdown: {
    //行号显示
    lineNumbers: true,

    // toc显示一级标题
    toc: { level: [1, 2, 3] },

    // 使用 `!!code` 防止转换
    codeTransformers: [
      {
        postprocess(code) {
          return code.replace(/\[\!\!code/g, '[!code')
        }
      }
    ],

    // 开启图片懒加载
    image: {
      lazyLoading: true
    },

    config: (md) => {
      // 组件插入h1标题下
      md.renderer.rules.heading_close = (tokens, idx, options, env, slf) => {
        let htmlResult = slf.renderToken(tokens, idx, options)
        if (tokens[idx].tag === 'h1') htmlResult += `<ArticleMetadata />`
        return htmlResult
      },

        // 代码组中添加图片
        md.use((md) => {
          const defaultRender = md.render
          md.render = (...args) => {
            const [content, env] = args
            const currentLang = env?.localeIndex || 'root'
            const isHomePage = env?.path === '/' || env?.relativePath === 'index.md'  // 判断是否是首页

            if (isHomePage) {
              return defaultRender.apply(md, args) // 如果是首页，直接渲染内容
            }
            // 调用原始渲染
            let defaultContent = defaultRender.apply(md, args)
            // 替换内容
            if (currentLang === 'root') {
              defaultContent = defaultContent.replace(/NOTE/g, '提醒')
                .replace(/TIP/g, '建议')
                .replace(/IMPORTANT/g, '重要')
                .replace(/WARNING/g, '警告')
                .replace(/CAUTION/g, '注意')
            }
            // 返回渲染的内容
            return defaultContent
          }

          // 获取原始的 fence 渲染规则
          const defaultFence = md.renderer.rules.fence?.bind(md.renderer.rules) ?? ((...args) => args[0][args[1]].content);

          // 重写 fence 渲染规则
          md.renderer.rules.fence = (tokens, idx, options, env, self) => {
            const token = tokens[idx];
            const info = token.info.trim();

            // 判断是否为 md:img 类型的代码块
            if (info.includes('md:img')) {
              // 只渲染图片，不再渲染为代码块
              return `<div class="rendered-md">${md.render(token.content)}</div>`;
            }

            // 其他代码块按默认规则渲染（如 java, js 等）
            return defaultFence(tokens, idx, options, env, self);
          };
        })

      md.use(groupIconMdPlugin) //代码组图标
      md.use(markdownItTaskCheckbox) //todo
      md.use(MermaidMarkdown);

    }

  },
  // vite: {

  // },
  lastUpdated: true,
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
            { text: 'Hooks使用', link: '/react/hooks' },
            { text: 'React 18 新特性', link: '/react/react-18' },
            { text: 'React 19 新特性', link: '/react/react-19' }
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
            { text: '组合式API', link: '/vue/composition-api' },
            { text: 'Vue 3.6 新特性', link: '/vue/vue-3-6' }
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
      { icon: 'github', link: 'https://github.com/vuejs/vitepress' },
      {
        icon: {
          svg: '<svg t="1703483542872" class="icon" viewBox="0 0 1309 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="6274" width="200" height="200"><path d="M1147.26896 912.681417l34.90165 111.318583-127.165111-66.823891a604.787313 604.787313 0 0 1-139.082747 22.263717c-220.607239 0-394.296969-144.615936-394.296969-322.758409s173.526026-322.889372 394.296969-322.889372C1124.219465 333.661082 1309.630388 478.669907 1309.630388 656.550454c0 100.284947-69.344929 189.143369-162.361428 256.130963zM788.070086 511.869037a49.11114 49.11114 0 0 0-46.360916 44.494692 48.783732 48.783732 0 0 0 46.360916 44.494693 52.090549 52.090549 0 0 0 57.983885-44.494693 52.385216 52.385216 0 0 0-57.983885-44.494692z m254.985036 0a48.881954 48.881954 0 0 0-46.09899 44.494692 48.620028 48.620028 0 0 0 46.09899 44.494693 52.385216 52.385216 0 0 0 57.983886-44.494693 52.58166 52.58166 0 0 0-57.951145-44.494692z m-550.568615 150.018161a318.567592 318.567592 0 0 0 14.307712 93.212943c-14.307712 1.080445-28.746387 1.768001-43.283284 1.768001a827.293516 827.293516 0 0 1-162.394168-22.296458l-162.001279 77.955749 46.328175-133.811485C69.410411 600.858422 0 500.507993 0 378.38496 0 166.683208 208.689602 0 463.510935 0c227.908428 0 427.594322 133.18941 467.701752 312.379588a427.463358 427.463358 0 0 0-44.625655-2.619261c-220.24709 0-394.100524 157.74498-394.100525 352.126871zM312.90344 189.143369a64.270111 64.270111 0 0 0-69.803299 55.659291 64.532037 64.532037 0 0 0 69.803299 55.659292 53.694846 53.694846 0 0 0 57.852923-55.659292 53.465661 53.465661 0 0 0-57.852923-55.659291z m324.428188 0a64.040926 64.040926 0 0 0-69.574114 55.659291 64.302852 64.302852 0 0 0 69.574114 55.659292 53.694846 53.694846 0 0 0 57.951145-55.659292 53.465661 53.465661 0 0 0-57.951145-55.659291z" p-id="6275"></path></svg>'
        },
        link: 'https://cdn.jsdelivr.net/gh/Jensen0925/image-repo/20250804155123765.jpg',
        // You can include a custom label for accessibility too (optional but recommended):
        ariaLabel: 'wechat'
      }
    ],
    // 底部版权部分
    footer: {
      // message: 'Released under the MIT License.',
      copyright: `Copyright © 2019-${new Date().getFullYear()} present Jensen`,
    },
    //编辑本页
    editLink: {
      pattern: 'https://github.com/Jensen0925/Jensen-blog/fork',
      text: '为此页提供修改建议'
    },
    //上次更新时间
    lastUpdated: {
      text: '最后更新于',
      formatOptions: {
        dateStyle: 'short', // 可选值full、long、medium、short
        timeStyle: 'medium' // 可选值full、long、medium、short
      },
    },
    //自定义上下页名
    docFooter: {
      prev: '上一页',
      next: '下一页',
    },
  }
})
