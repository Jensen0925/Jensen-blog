import DefaultTheme from 'vitepress/theme'
import { h, onMounted, watch, nextTick } from 'vue';
import { useData, useRoute } from 'vitepress'
// giscusTalk
import giscusTalk from 'vitepress-plugin-comment-with-giscus';
// 进度条
import { NProgress } from 'nprogress-v2/dist/index.js'
// 样式
import 'nprogress-v2/dist/index.css'
// import 'virtual:group-icons.css' //代码组样式
import './style/index.css' //自定义样式


// mediumZoom
import mediumZoom from 'medium-zoom';


// 组件
import MNavLinks from './components/MNavLinks.vue' //导航
import HomeUnderline from "./components/HomeUnderline.vue" // 首页下划线
import confetti from "./components/confetti.vue" // 五彩纸屑
import update from "./components/update.vue" // 更新时间
// import xgplayer from "./components/xgplayer.vue" //西瓜播放器
import ArticleMetadata from "./components/ArticleMetadata.vue" //字数阅读时间
import Linkcard from "./components/Linkcard.vue" //链接卡片
import MyLayout from "./components/MyLayout.vue" //视图过渡
import fluidborder from "./components/fluidborder.vue" //流体边框仅用于演示
import backtotop from "./components/backtotop.vue" //返回顶部
// import notice from "./components/notice.vue" //公告
import MouseClick from "./components/MouseClick.vue"
import MouseFollower from "./components/MouseFollower.vue"


// 彩虹背景动画样式
let homePageStyle: HTMLStyleElement | undefined

export default {
  extends: DefaultTheme,

  enhanceApp({ app, router }) {
    // 注册全局组件
    app.component('MNavLinks', MNavLinks) //导航
    app.component('HomeUnderline', HomeUnderline) // 首页下划线
    app.component('confetti', confetti) // 五彩纸屑
    app.component('update', update) // 更新
    // app.component('xgplayer', xgplayer) //西瓜播放器
    app.component('ArticleMetadata', ArticleMetadata) //字数阅读时间
    app.component('Linkcard', Linkcard) //链接卡片
    app.component('fluidborder', fluidborder) //流体边框仅用于演示



    // 彩虹背景动画样式
    if (typeof window !== 'undefined') {
      watch(
        () => router.route.data.relativePath,
        () => updateHomePageStyle(location.pathname === '/'),
        { immediate: true },
      )
    }

  },

  //导航
  Layout: () => {
    const props: Record<string, any> = {}
    // 获取 frontmatter
    const { frontmatter } = useData()

    /* 添加自定义 class */
    if (frontmatter.value?.layoutClass) {
      props.class = frontmatter.value.layoutClass
    }

    // return h(DefaultTheme.Layout, props, {
    //   'layout-bottom': () => h(bsz), //不蒜子layout-bottom插槽
    //   'doc-footer-before': () => h(backtotop), // 返回顶部doc-footer-before插槽
    //   'layout-top': () => h(notice), // 公告layout-top插槽
    // })

    return h(MyLayout, props)
  },

  // medium-zoom
  setup() {
    const route = useRoute();
    const initZoom = () => {
      // mediumZoom('[data-zoomable]', { background: 'var(--vp-c-bg)' }); // 默认
      mediumZoom('.main img', { background: 'var(--vp-c-bg)' }); // 不显式添加{data-zoomable}的情况下为所有图像启用此功能
    };
    onMounted(() => {
      initZoom();
    });
    watch(
      () => route.path,
      () => nextTick(() => initZoom())
    );

    // giscus
    const { frontmatter } = useData();

    // giscus配置
    giscusTalk({
      repo: 'Jensen0925/Jensen-blog',
      repoId: 'R_kgDOPW-Lvw',
      category: 'General', // 默认: `General`
      categoryId: 'DIC_kwDOPW-Lv84CtscO',
      mapping: 'pathname', // 默认: `pathname`
      inputPosition: 'bottom', // 默认: `top`
      lang: 'zh-CN', // 默认: `zh-CN`
      lightTheme: 'light', // 默认: `light`
      darkTheme: 'dark', // 默认: `transparent_dark`
      loading: 'eager',
    },
      {
        frontmatter, route
      },
      true
    );

  },

}


// 彩虹背景动画样式
function updateHomePageStyle(value: boolean) {
  if (value) {
    if (homePageStyle) return

    homePageStyle = document.createElement('style')
    homePageStyle.innerHTML = `
    :root {
      animation: rainbow 12s linear infinite;
    }`
    document.body.appendChild(homePageStyle)
  } else {
    if (!homePageStyle) return

    homePageStyle.remove()
    homePageStyle = undefined
  }
}
