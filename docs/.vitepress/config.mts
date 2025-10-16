import { defineConfig } from 'vitepress'
import { groupIconMdPlugin, groupIconVitePlugin, localIconLoader } from 'vitepress-plugin-group-icons'
import markdownItTaskCheckbox from 'markdown-it-task-checkbox'
import { MermaidMarkdown, MermaidPlugin } from 'vitepress-plugin-mermaid';

import { usePosts } from './theme/utils/permalink';
const { rewrites } = await usePosts();
// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "Jensen's Blog",
  description: "📝在线笔记本",
  rewrites,
  ignoreDeadLinks: true,
  // 新增：基础 head 元信息（最小变更，不影响现有功能）
  head: [
    ['meta', { name: 'author', content: 'Jensen' }],
    ['meta', { name: 'keywords', content: 'JavaScript, React, Vue, Node, 工程化, 前端, 博客, 笔记' }],
    ['meta', { name: 'theme-color', content: '#646cff' }],
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
  ],
  // 根据页面信息动态注入 OG 元信息（放宽类型约束以兼容 VitePress 运行时）
  transformHead: (ctx: any) => {
    const page = ctx?.page;
    const siteTitle = "Jensen's Blog";
    const pageTitle = page?.title ? `${page.title} | ${siteTitle}` : siteTitle;
    const pageDescription = page?.description || '📝在线笔记本';
    const ogImage = '/Vlog_b.gif';
    return [
      ['meta', { property: 'og:title', content: pageTitle }],
      ['meta', { property: 'og:description', content: pageDescription }],
      ['meta', { property: 'og:type', content: 'website' }],
      ['meta', { property: 'og:image', content: ogImage }],
    ]
  },
  //markdown配置
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
  vite: {
    plugins: [
      groupIconVitePlugin({
        customIcon: {
          ts: localIconLoader(import.meta.url, '../public/svg/typescript.svg'), //本地ts图标导入
          md: localIconLoader(import.meta.url, '../public/svg/md.svg'), //markdown图标
          css: localIconLoader(import.meta.url, '../public/svg/css.svg'), //css图标
          js: 'logos:javascript', //js图标
        },
      }),
      [MermaidPlugin()]
    ] as any,
    optimizeDeps: {
      include: ['mermaid'],
    },
    ssr: {
      noExternal: ['mermaid'],
    },
  },
  lastUpdated: true,
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: '首页', link: '/' },
      {
        text: '在线笔记', items: [
          {
            text: 'Front End', items: [
              { text: 'JavaScript', link: '/javascript/' },
              { text: 'TypeScript', link: '/typescript/' },
              { text: 'React', link: '/react/' },
              { text: 'Vue', link: '/vue/' },
              { text: '工程化', link: '/engineering/' },
            ]
          },
          {
            text: 'Back End', items: [
              { text: 'Node', link: '/node/' },
            ]
          },
        ]
      },
    ],
    search: {
      provider: 'algolia',
      options: {
        appId: 'O3WJPPQMIY',
        apiKey: '5faa14e6bf1463835ceb9c9d06bb89a2',
        indexName: 'docs',
        locales: {
          root: {
            placeholder: '搜索文档',
            translations: {
              button: {
                buttonText: '搜索文档',
                buttonAriaLabel: '搜索文档'
              },
              modal: {
                searchBox: {
                  resetButtonTitle: '清除查询条件',
                  resetButtonAriaLabel: '清除查询条件',
                  cancelButtonText: '取消',
                  cancelButtonAriaLabel: '取消'
                },
                startScreen: {
                  recentSearchesTitle: '搜索历史',
                  noRecentSearchesText: '没有搜索历史',
                  saveRecentSearchButtonTitle: '保存至搜索历史',
                  removeRecentSearchButtonTitle: '从搜索历史中移除',
                  favoriteSearchesTitle: '收藏',
                  removeFavoriteSearchButtonTitle: '从收藏中移除'
                },
                errorScreen: {
                  titleText: '无法获取结果',
                  helpText: '你可能需要检查你的网络连接'
                },
                footer: {
                  selectText: '选择',
                  navigateText: '切换',
                  closeText: '关闭',
                  searchByText: '搜索提供者'
                },
                noResultsScreen: {
                  noResultsText: '无法找到相关结果',
                  suggestedQueryText: '你可以尝试查询',
                  reportMissingResultsText: '你认为该查询应该有结果？',
                  reportMissingResultsLinkText: '点击反馈'
                },
              },
            },
          },
        },
      },
    },

    sidebar: {
      '/javascript/': [
        {
          text: 'JavaScript 基础',
          collapsed: false,
          items: [
            { text: 'JavaScript 基础', link: '/javascript/basics' },
            { text: 'ES6+ 特性', link: '/javascript/es6' }
          ]
        },
        {
          text: 'JavaScript 核心',
          collapsed: false,
          items: [
            { text: '异步编程', link: '/javascript/async-programming' },
            { text: '原型与继承', link: '/javascript/prototype' },
            { text: '进阶概念', link: '/javascript/advanced' }
          ]
        }
      ],
      '/react/': [
        {
          text: 'React 基础',
          collapsed: false,
          items: [
            { text: '入门指南', link: '/react/getting-started' },
            { text: '组件开发', link: '/react/components' },
            { text: 'Hooks使用', link: '/react/hooks' },
            { text: 'React 18 新特性', link: '/react/react-18' },
            { text: 'React 19 新特性', link: '/react/react-19' }
          ]
        },
        {
          text: 'React 源码与原理',
          collapsed: false,
          items: [
            { text: 'Fiber 原理', link: '/react/fiber' },
            { text: 'Diff 算法', link: '/react/diff-algorithm' },
            { text: 'Reconciler 协调器', link: '/react/reconciler' },
            { text: 'Scheduler 调度器', link: '/react/scheduler' },
            { text: '状态管理原理', link: '/react/state-management' },
            { text: '事件系统原理', link: '/react/events' }
          ]
        },
        {
          text: '性能与优化',
          collapsed: false,
          items: [
            { text: '性能优化完全指南', link: '/react/performance' }
          ]
        },
        {
          text: '进阶特性',
          collapsed: false,
          items: [
            { text: 'Context 深入解析', link: '/react/context' },
            { text: 'React 设计模式', link: '/react/patterns' },
            { text: 'Suspense 和异步渲染', link: '/react/suspense' },
            { text: '自定义 Hooks 最佳实践', link: '/react/custom-hooks' },
            { text: '错误处理与边界', link: '/react/error-boundaries' },
            { text: '服务端渲染（SSR）', link: '/react/ssr' }
          ]
        }
      ],
      '/vue/': [
        {
          text: 'Vue 核心实践',
          collapsed: false,
          items: [
            { text: '学习指南', link: '/vue/' },
            { text: 'Composition API 最佳实践', link: '/vue/composition-best-practices' }
          ]
        },
        {
          text: 'Vue 源码原理',
          collapsed: false,
          items: [
            { text: 'Vue 3 响应式系统', link: '/vue/reactivity-system' },
            { text: 'ref 底层原理', link: '/vue/ref-internals' },
            { text: 'Vue 2 vs Vue 3 响应式', link: '/vue/reactivity-comparison' },
            { text: 'Diff 算法原理', link: '/vue/diff-algorithm' },
            { text: 'Vue 3 编译器', link: '/vue/compiler' }
          ]
        },
        {
          text: 'Vue 新特性',
          collapsed: false,
          items: [
            { text: 'Vue 3.6 新特性', link: '/vue/vue-3-6' },
            { text: 'Vue Vine', link: '/vue/vue-vine' }
          ]
        }
      ],
      '/engineering/': [
        {
          text: '基础与架构',
          collapsed: false,
          items: [
            { text: '基础知识', link: '/engineering/basics' },
            { text: 'Monorepo 架构', link: '/engineering/monorepo' }
          ]
        },
        {
          text: '开发规范',
          collapsed: false,
          items: [
            { text: 'Git 工作流与代码规范', link: '/engineering/git-workflow' }
          ]
        },
        {
          text: '构建与优化',
          collapsed: false,
          items: [
            { text: '构建工具', link: '/engineering/build-tools' },
            { text: '插件机制', link: '/engineering/plugins' },
            { text: '性能优化', link: '/engineering/performance' }
          ]
        },
        {
          text: '质量保障',
          collapsed: false,
          items: [
            { text: 'ESLint 工程实践', link: '/engineering/eslint' },
            { text: '测试与部署', link: '/engineering/testing-and-deployment' }
          ]
        }
      ],
      '/typescript/': [
        {
          text: 'TypeScript',
          collapsed: false,
          items: [
            { text: '学习指南', link: '/typescript/' },
            { text: '安装与配置', link: '/typescript/setup' },
            { text: '基础类型', link: '/typescript/basic-types' },
            { text: '接口', link: '/typescript/interface' },
            { text: '高级类型', link: '/typescript/advanced-types' },
            { text: '泛型', link: '/typescript/generic' },
            { text: '类型守护', link: '/typescript/type-guards' },
            { text: '类型操控与校验', link: '/typescript/type-manipulation' },
            { text: '装饰器', link: '/typescript/decorators' },
          ]
        }
      ],
      '/node/': [
        {
          text: '基础入门',
          collapsed: false,
          items: [
            { text: '学习指南', link: '/node/' },
            { text: 'Node.js 基础', link: '/node/basics' },
            { text: '核心模块', link: '/node/core-modules' },
            { text: '包管理', link: '/node/package-management' },
            { text: '异步编程', link: '/node/async-programming' }
          ]
        },
        {
          text: '核心原理',
          collapsed: false,
          items: [
            { text: '事件循环', link: '/node/event-loop' },
            { text: 'Stream 流', link: '/node/stream' },
            { text: 'Buffer 和二进制', link: '/node/buffer' },
            { text: 'Process 和线程', link: '/node/process' }
          ]
        },
        {
          text: 'Web 开发',
          collapsed: false,
          items: [
            { text: 'Express 框架', link: '/node/express' },
            { text: 'NestJS 框架', link: '/node/nestjs' },
            { text: '数据库操作', link: '/node/database' },
            { text: 'WebSocket', link: '/node/websocket' },
            { text: 'GraphQL', link: '/node/graphql' }
          ]
        },
        {
          text: '架构设计',
          collapsed: false,
          items: [
            { text: '微服务架构', link: '/node/microservices' },
            { text: '错误处理', link: '/node/error-handling' },
            { text: '安全最佳实践', link: '/node/security' }
          ]
        },
        {
          text: '性能与运维',
          collapsed: false,
          items: [
            { text: '性能优化', link: '/node/performance' },
            { text: '测试', link: '/node/testing' },
            { text: '监控与日志', link: '/node/monitoring' },
            { text: '部署', link: '/node/deployment' },
            { text: '故障排查', link: '/node/troubleshooting' }
          ]
        }
      ],
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/Jensen0925' },
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
