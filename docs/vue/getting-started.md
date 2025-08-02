# Vue 入门指南

## 什么是 Vue？

Vue (发音为 /vjuː/，类似于 view) 是一个用于构建用户界面的渐进式 JavaScript 框架。与其他前端框架不同，Vue 被设计为可以自底向上逐层应用。Vue 的核心库只关注视图层，易于上手，便于与第三方库或既有项目整合。

## 为什么选择 Vue？

- **易学易用**：Vue 提供了简洁、直观的 API，使得初学者能够快速上手。
- **灵活渐进**：Vue 可以根据需求逐步引入，从简单的页面增强到复杂的单页应用。
- **高性能**：Vue 使用虚拟 DOM 和优化的渲染机制，提供卓越的性能。
- **响应式系统**：Vue 的响应式系统使得状态管理变得简单直观。
- **强大的工具链**：Vue 提供了完善的开发工具和生态系统。

## 安装 Vue

### 使用 CDN

最简单的方式是通过 CDN 引入 Vue：

```html
<script src="https://unpkg.com/vue@3/dist/vue.global.js"></script>
```

### 使用 npm

对于大型应用，推荐使用 npm 安装：

```bash
npm install vue
```

### 使用 Vue CLI

Vue CLI 是一个官方提供的脚手架工具，用于快速搭建 Vue 项目：

```bash
# 安装 Vue CLI
npm install -g @vue/cli

# 创建一个新项目
vue create my-project

# 进入项目目录
cd my-project

# 启动开发服务器
npm run serve
```

### 使用 Vite

Vite 是一个更快的构建工具，也是 Vue 官方推荐的开发工具：

```bash
# 使用 npm
npm create vite@latest my-vue-app -- --template vue

# 使用 yarn
yarn create vite my-vue-app --template vue

# 使用 pnpm
pnpm create vite my-vue-app --template vue

# 进入项目目录
cd my-vue-app

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

## Vue 3 基础

### 创建 Vue 应用

```js
// main.js
import { createApp } from 'vue'
import App from './App.vue'

const app = createApp(App)
app.mount('#app')
```

### 模板语法

Vue 使用基于 HTML 的模板语法，允许开发者声明式地将 DOM 绑定到底层组件实例的数据。

#### 文本插值

```html
<span>Message: {{ msg }}</span>
```

#### 原始 HTML

```html
<p>Using v-html directive: <span v-html="rawHtml"></span></p>
```

#### 属性绑定

```html
<div v-bind:id="dynamicId"></div>
<!-- 简写 -->
<div :id="dynamicId"></div>
```

#### 条件渲染

```html
<div v-if="seen">Now you see me</div>
<div v-else-if="condition">Else if condition</div>
<div v-else>Now you don't</div>

<!-- v-show 切换元素的 display CSS 属性 -->
<div v-show="seen">Toggle display</div>
```

#### 列表渲染

```html
<ul>
  <li v-for="item in items" :key="item.id">
    {{ item.text }}
  </li>
</ul>
```

#### 事件处理

```html
<button v-on:click="counter++">Add 1</button>
<!-- 简写 -->
<button @click="counter++">Add 1</button>

<!-- 方法处理器 -->
<button @click="greet">Greet</button>

<!-- 内联处理器 -->
<button @click="say('hello')">Say hello</button>

<!-- 事件修饰符 -->
<form @submit.prevent="onSubmit">...</form>
```

#### 表单输入绑定

```html
<!-- 文本 -->
<input v-model="message">

<!-- 复选框 -->
<input type="checkbox" v-model="checked">

<!-- 单选按钮 -->
<input type="radio" v-model="picked" value="A">
<input type="radio" v-model="picked" value="B">

<!-- 选择框 -->
<select v-model="selected">
  <option disabled value="">Please select one</option>
  <option>A</option>
  <option>B</option>
  <option>C</option>
</select>
```

### 计算属性

```js
const app = createApp({
  data() {
    return {
      message: 'Hello'
    }
  },
  computed: {
    // 计算属性的 getter
    reversedMessage() {
      // `this` 指向组件实例
      return this.message.split('').reverse().join('')
    }
  }
})
```

### 侦听器

```js
const app = createApp({
  data() {
    return {
      question: '',
      answer: 'Questions usually contain a question mark. ;-)'
    }
  },
  watch: {
    // 每当 question 改变时，这个函数就会运行
    question(newQuestion, oldQuestion) {
      if (newQuestion.includes('?')) {
        this.getAnswer()
      }
    }
  },
  methods: {
    getAnswer() {
      this.answer = 'Thinking...'
      // 模拟 API 调用
      setTimeout(() => {
        this.answer = 'I don\'t know!'
      }, 1000)
    }
  }
})
```

## 组件基础

### 定义组件

```js
// 单文件组件 (SFC) - HelloWorld.vue
<script>
export default {
  data() {
    return {
      greeting: 'Hello World!'
    }
  }
}
</script>

<template>
  <p class="greeting">{{ greeting }}</p>
</template>

<style>
.greeting {
  color: red;
  font-weight: bold;
}
</style>
```

### 注册组件

```js
// 全局注册
import { createApp } from 'vue'
import App from './App.vue'
import HelloWorld from './components/HelloWorld.vue'

const app = createApp(App)
app.component('HelloWorld', HelloWorld)
app.mount('#app')

// 局部注册
import HelloWorld from './components/HelloWorld.vue'

export default {
  components: {
    HelloWorld
  }
}
```

### 使用组件

```html
<template>
  <div>
    <HelloWorld />
  </div>
</template>
```

### Props

Props 是你可以在组件上注册的自定义属性。

```js
// 在子组件中定义 props
export default {
  props: {
    title: String,
    likes: Number,
    isPublished: Boolean,
    commentIds: Array,
    author: Object,
    callback: Function,
    contactsPromise: Promise
  }
}
```

```html
<!-- 在父组件中传递 props -->
<blog-post
  title="My journey with Vue"
  :likes="42"
  :is-published="true"
  :comment-ids="[234, 266, 273]"
  :author="{ name: 'Veronica', company: 'Veridian Dynamics' }"
></blog-post>
```

### 事件

子组件可以通过调用内建的 `$emit` 方法并传入事件名称来触发一个事件。

```js
// 子组件
export default {
  methods: {
    submit() {
      this.$emit('update', { /* 数据 */ })
    }
  }
}
```

```html
<!-- 父组件 -->
<template>
  <div>
    <child-component @update="handleUpdate"></child-component>
  </div>
</template>

<script>
export default {
  methods: {
    handleUpdate(data) {
      console.log(data)
    }
  }
}
</script>
```

### 插槽

插槽允许你将内容传递给组件。

```html
<!-- 子组件 -->
<template>
  <div>
    <h2>{{ title }}</h2>
    <slot></slot>
  </div>
</template>

<!-- 父组件 -->
<template>
  <div>
    <child-component title="Hello">
      <p>This is some slot content</p>
    </child-component>
  </div>
</template>
```

#### 具名插槽

```html
<!-- 子组件 -->
<template>
  <div class="container">
    <header>
      <slot name="header"></slot>
    </header>
    <main>
      <slot></slot>
    </main>
    <footer>
      <slot name="footer"></slot>
    </footer>
  </div>
</template>

<!-- 父组件 -->
<template>
  <base-layout>
    <template v-slot:header>
      <h1>Here might be a page title</h1>
    </template>

    <template v-slot:default>
      <p>A paragraph for the main content.</p>
      <p>And another one.</p>
    </template>

    <template v-slot:footer>
      <p>Here's some contact info</p>
    </template>
  </base-layout>
</template>
```

## 组合式 API

Vue 3 引入了组合式 API，提供了一种更灵活的方式来组织组件逻辑。

### setup 函数

```js
import { ref, onMounted } from 'vue'

export default {
  setup() {
    // 响应式状态
    const count = ref(0)

    // 生命周期钩子
    onMounted(() => {
      console.log('Component mounted!')
    })

    // 暴露给模板
    return {
      count
    }
  }
}
```

### 响应式基础

```js
import { ref, reactive, computed, watch } from 'vue'

export default {
  setup() {
    // ref 用于基本类型
    const count = ref(0)

    // reactive 用于对象
    const state = reactive({
      name: 'John',
      age: 30
    })

    // 计算属性
    const doubleCount = computed(() => count.value * 2)

    // 侦听器
    watch(count, (newValue, oldValue) => {
      console.log(`Count changed from ${oldValue} to ${newValue}`)
    })

    // 方法
    function increment() {
      count.value++
    }

    return {
      count,
      state,
      doubleCount,
      increment
    }
  }
}
```

### `<script setup>`

`<script setup>` 是在单文件组件 (SFC) 中使用组合式 API 的编译时语法糖。

```html
<script setup>
import { ref, onMounted } from 'vue'

// 响应式状态
const count = ref(0)

// 生命周期钩子
onMounted(() => {
  console.log('Component mounted!')
})

// 方法
function increment() {
  count.value++
}
</script>

<template>
  <button @click="increment">Count is: {{ count }}</button>
</template>
```

## 路由

Vue Router 是 Vue.js 的官方路由。

### 安装

```bash
npm install vue-router@4
```

### 基本用法

```js
// router/index.js
import { createRouter, createWebHistory } from 'vue-router'
import Home from '../views/Home.vue'
import About from '../views/About.vue'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: Home
  },
  {
    path: '/about',
    name: 'About',
    component: About
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
```

```js
// main.js
import { createApp } from 'vue'
import App from './App.vue'
import router from './router'

const app = createApp(App)
app.use(router)
app.mount('#app')
```

```html
<!-- App.vue -->
<template>
  <div>
    <nav>
      <router-link to="/">Home</router-link> |
      <router-link to="/about">About</router-link>
    </nav>
    <router-view/>
  </div>
</template>
```

## 状态管理

Vuex 是一个专为 Vue.js 应用程序开发的状态管理模式。

### 安装

```bash
npm install vuex@next
```

### 基本用法

```js
// store/index.js
import { createStore } from 'vuex'

export default createStore({
  state: {
    count: 0
  },
  mutations: {
    increment(state) {
      state.count++
    }
  },
  actions: {
    incrementAsync({ commit }) {
      setTimeout(() => {
        commit('increment')
      }, 1000)
    }
  },
  getters: {
    doubleCount(state) {
      return state.count * 2
    }
  }
})
```

```js
// main.js
import { createApp } from 'vue'
import App from './App.vue'
import store from './store'

const app = createApp(App)
app.use(store)
app.mount('#app')
```

```html
<!-- Counter.vue -->
<template>
  <div>
    <p>Count: {{ count }}</p>
    <p>Double Count: {{ doubleCount }}</p>
    <button @click="increment">Increment</button>
    <button @click="incrementAsync">Increment Async</button>
  </div>
</template>

<script>
import { mapState, mapGetters, mapMutations, mapActions } from 'vuex'

export default {
  computed: {
    ...mapState(['count']),
    ...mapGetters(['doubleCount'])
  },
  methods: {
    ...mapMutations(['increment']),
    ...mapActions(['incrementAsync'])
  }
}
</script>
```

## 下一步学习

- Vue 组件的高级特性
- Vue 组合式 API 的深入使用
- Vue Router 的高级功能
- Vuex 或 Pinia 进行状态管理
- Vue 测试
- Vue 性能优化
