# Vue 组件开发

## 组件基础

组件是 Vue 应用的基础构建块，它们允许我们将界面拆分为独立的、可重用的部分，并且可以对每个部分进行单独的思考。

### 组件的定义

在 Vue 中，组件可以通过多种方式定义：

#### 单文件组件 (SFC)

```vue
<!-- MyComponent.vue -->
<template>
  <div class="my-component">
    <h2>{{ title }}</h2>
    <p>{{ message }}</p>
  </div>
</template>

<script>
export default {
  name: 'MyComponent',
  props: {
    title: String,
    message: {
      type: String,
      default: 'Default message'
    }
  }
}
</script>

<style scoped>
.my-component {
  border: 1px solid #ccc;
  padding: 10px;
  margin: 10px 0;
}
</style>
```

#### 使用 `defineComponent` (Vue 3)

::: code-group

```vue [选项式 API]
<template>
  <div>
    <h2>{{ title }}</h2>
    <p>{{ message }}</p>
    <p>Count: {{ count }}</p>
    <button @click="increment">Increment</button>
  </div>
</template>

<script>
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'MyComponent',
  props: {
    title: String,
    message: String
  },
  data() {
    return {
      count: 0
    }
  },
  methods: {
    increment() {
      this.count++
    }
  }
})
</script>
```

```vue [组合式 API]
<template>
  <div>
    <h2>{{ title }}</h2>
    <p>{{ message }}</p>
    <p>Count: {{ count }}</p>
    <button @click="increment">Increment</button>
  </div>
</template>

<script setup>
import { ref } from 'vue'

defineProps({
  title: String,
  message: String
})

const count = ref(0)

const increment = () => {
  count.value++
}
</script>
```

:::

### 组件注册

#### 全局注册

```vue [main.js]
import { createApp } from 'vue'
import App from './App.vue'
import MyComponent from './components/MyComponent.vue'

const app = createApp(App)

// 全局注册组件
app.component('MyComponent', MyComponent)

app.mount('#app')
```

#### 局部注册

::: code-group

```vue [选项式 API]
<template>
  <div>
    <MyComponent />
  </div>
</template>

<script>
import MyComponent from './components/MyComponent.vue'

export default {
  components: {
    MyComponent
  }
}
</script>
```

```vue [组合式 API]
<template>
  <div>
    <MyComponent />
  </div>
</template>

<script setup>
import MyComponent from './components/MyComponent.vue'
</script>
```

:::

## 组件通信

### Props 向下传递数据

Props 是你可以在组件上注册的自定义属性，用于从父组件向子组件传递数据。

```vue
<!-- 子组件: ChildComponent.vue -->
<template>
  <div>
    <h3>{{ title }}</h3>
    <p>{{ content }}</p>
  </div>
</template>

<script>
export default {
  props: {
    title: {
      type: String,
      required: true
    },
    content: {
      type: String,
      default: 'Default content'
    },
    count: {
      type: Number,
      validator: value => value >= 0
    }
  }
}
</script>
```

```vue
<!-- 父组件 -->
<template>
  <div>
    <child-component 
      title="Hello from parent" 
      content="This is some content" 
      :count="42"
    />
  </div>
</template>

<script>
import ChildComponent from './ChildComponent.vue'

export default {
  components: {
    ChildComponent
  }
}
</script>
```

### 事件向上传递数据

子组件可以通过触发事件向父组件传递数据。

```vue
<!-- 子组件: ChildComponent.vue -->
<template>
  <div>
    <button @click="sendMessage">Send Message to Parent</button>
  </div>
</template>

<script>
export default {
  methods: {
    sendMessage() {
      this.$emit('message-sent', 'Hello from child component')
    }
  }
}
</script>
```

```vue
<!-- 父组件 -->
<template>
  <div>
    <p>{{ messageFromChild }}</p>
    <child-component @message-sent="receiveMessage" />
  </div>
</template>

<script>
import ChildComponent from './ChildComponent.vue'

export default {
  components: {
    ChildComponent
  },
  data() {
    return {
      messageFromChild: ''
    }
  },
  methods: {
    receiveMessage(message) {
      this.messageFromChild = message
    }
  }
}
</script>
```

### v-model 双向绑定

`v-model` 可以用于在组件上创建双向绑定。

```vue
<!-- 子组件: CustomInput.vue -->
<template>
  <input 
    :value="modelValue" 
    @input="$emit('update:modelValue', $event.target.value)" 
  />
</template>

<script>
export default {
  props: {
    modelValue: String
  },
  emits: ['update:modelValue']
}
</script>
```

```vue
<!-- 父组件 -->
<template>
  <div>
    <p>Input value: {{ inputValue }}</p>
    <custom-input v-model="inputValue" />
  </div>
</template>

<script>
import CustomInput from './CustomInput.vue'

export default {
  components: {
    CustomInput
  },
  data() {
    return {
      inputValue: ''
    }
  }
}
</script>
```

### 多个 v-model 绑定 (Vue 3)

```vue
<!-- 子组件: UserForm.vue -->
<template>
  <div>
    <input 
      :value="firstName" 
      @input="$emit('update:firstName', $event.target.value)" 
    />
    <input 
      :value="lastName" 
      @input="$emit('update:lastName', $event.target.value)" 
    />
  </div>
</template>

<script>
export default {
  props: {
    firstName: String,
    lastName: String
  },
  emits: ['update:firstName', 'update:lastName']
}
</script>
```

```vue
<!-- 父组件 -->
<template>
  <div>
    <p>Full name: {{ firstName }} {{ lastName }}</p>
    <user-form
      v-model:firstName="firstName"
      v-model:lastName="lastName"
    />
  </div>
</template>

<script>
import UserForm from './UserForm.vue'

export default {
  components: {
    UserForm
  },
  data() {
    return {
      firstName: 'John',
      lastName: 'Doe'
    }
  }
}
</script>
```

### Provide / Inject

`provide` 和 `inject` 允许祖先组件向所有子孙组件注入依赖，无论层级有多深。

```vue
<!-- 祖先组件 -->
<template>
  <div>
    <h1>App</h1>
    <child-component />
  </div>
</template>

<script>
import ChildComponent from './ChildComponent.vue'

export default {
  components: {
    ChildComponent
  },
  provide() {
    return {
      theme: 'dark',
      user: this.user
    }
  },
  data() {
    return {
      user: { name: 'John Doe' }
    }
  }
}
</script>
```

```vue
<!-- 子孙组件 -->
<template>
  <div>
    <p>Theme: {{ theme }}</p>
    <p>User: {{ user.name }}</p>
  </div>
</template>

<script>
export default {
  inject: ['theme', 'user']
}
</script>
```

## 插槽

插槽允许你将内容传递给组件，使组件更加灵活。

### 默认插槽

```vue
<!-- 子组件: Card.vue -->
<template>
  <div class="card">
    <div class="card-header">
      <h3>{{ title }}</h3>
    </div>
    <div class="card-body">
      <slot>Default content</slot>
    </div>
  </div>
</template>

<script>
export default {
  props: {
    title: String
  }
}
</script>
```

```vue
<!-- 父组件 -->
<template>
  <div>
    <card title="My Card">
      <p>This is the content of the card.</p>
    </card>
  </div>
</template>

<script>
import Card from './Card.vue'

export default {
  components: {
    Card
  }
}
</script>
```

### 具名插槽

```vue
<!-- 子组件: Layout.vue -->
<template>
  <div class="layout">
    <header>
      <slot name="header">Default header</slot>
    </header>
    <main>
      <slot>Default content</slot>
    </main>
    <footer>
      <slot name="footer">Default footer</slot>
    </footer>
  </div>
</template>
```

```vue
<!-- 父组件 -->
<template>
  <div>
    <layout>
      <template v-slot:header>
        <h1>My Website</h1>
      </template>
      
      <p>Main content goes here.</p>
      
      <template v-slot:footer>
        <p>&copy; 2023 My Website</p>
      </template>
    </layout>
  </div>
</template>

<script>
import Layout from './Layout.vue'

export default {
  components: {
    Layout
  }
}
</script>
```

### 作用域插槽

作用域插槽允许子组件向父组件传递数据。

```vue
<!-- 子组件: UserList.vue -->
<template>
  <div>
    <ul>
      <li v-for="user in users" :key="user.id">
        <slot :user="user">
          {{ user.name }}
        </slot>
      </li>
    </ul>
  </div>
</template>

<script>
export default {
  data() {
    return {
      users: [
        { id: 1, name: 'John Doe', email: 'john@example.com' },
        { id: 2, name: 'Jane Smith', email: 'jane@example.com' },
        { id: 3, name: 'Bob Johnson', email: 'bob@example.com' }
      ]
    }
  }
}
</script>
```

```vue
<!-- 父组件 -->
<template>
  <div>
    <user-list>
      <template v-slot:default="slotProps">
        <div class="user-card">
          <h3>{{ slotProps.user.name }}</h3>
          <p>{{ slotProps.user.email }}</p>
        </div>
      </template>
    </user-list>
  </div>
</template>

<script>
import UserList from './UserList.vue'

export default {
  components: {
    UserList
  }
}
</script>
```

## 动态组件

动态组件允许你在同一个挂载点动态切换多个组件。

```vue
<template>
  <div>
    <button 
      v-for="tab in tabs" 
      :key="tab"
      @click="currentTab = tab"
      :class="{ active: currentTab === tab }"
    >
      {{ tab }}
    </button>

    <component :is="currentTabComponent" class="tab"></component>
  </div>
</template>

<script>
import TabHome from './TabHome.vue'
import TabPosts from './TabPosts.vue'
import TabArchive from './TabArchive.vue'

export default {
  components: {
    TabHome,
    TabPosts,
    TabArchive
  },
  data() {
    return {
      currentTab: 'Home',
      tabs: ['Home', 'Posts', 'Archive']
    }
  },
  computed: {
    currentTabComponent() {
      return 'tab-' + this.currentTab.toLowerCase()
    }
  }
}
</script>
```

### keep-alive

`<keep-alive>` 组件可以缓存不活动的组件实例，而不是销毁它们。

```vue
<template>
  <div>
    <button 
      v-for="tab in tabs" 
      :key="tab"
      @click="currentTab = tab"
    >
      {{ tab }}
    </button>

    <keep-alive>
      <component :is="currentTabComponent" class="tab"></component>
    </keep-alive>
  </div>
</template>
```

## 异步组件

异步组件允许你将应用分割成小块，并且只在需要的时候才从服务器加载组件。

### Vue 2 语法

```js
Vue.component('async-example', function (resolve, reject) {
  setTimeout(function () {
    // 向 `resolve` 回调传递组件定义
    resolve({
      template: '<div>I am async!</div>'
    })
  }, 1000)
})
```

### Vue 3 语法

```js
import { defineAsyncComponent } from 'vue'

const AsyncComponent = defineAsyncComponent(() =>
  import('./components/AsyncComponent.vue')
)

export default {
  components: {
    AsyncComponent
  }
}
```

### 带加载状态的异步组件

```js
const AsyncComponent = defineAsyncComponent({
  // 加载函数
  loader: () => import('./components/AsyncComponent.vue'),
  // 加载异步组件时使用的组件
  loadingComponent: LoadingComponent,
  // 展示加载组件前的延迟时间，默认为 200ms
  delay: 200,
  // 如果提供了超时时间且组件加载也超时了，
  // 则使用加载失败时使用的组件
  errorComponent: ErrorComponent,
  // 超时时间，默认是：Infinity
  timeout: 3000
})
```

## 组件生命周期

### Vue 2 生命周期钩子

- **beforeCreate**: 在实例初始化之后，数据观测和事件配置之前被调用
- **created**: 在实例创建完成后被立即调用
- **beforeMount**: 在挂载开始之前被调用
- **mounted**: 在实例挂载完成后被调用
- **beforeUpdate**: 在数据更新之前被调用
- **updated**: 在数据更改导致的虚拟 DOM 重新渲染和更新完毕之后被调用
- **beforeDestroy**: 在实例销毁之前调用
- **destroyed**: 在实例销毁之后调用
- **activated**: 被 keep-alive 缓存的组件激活时调用
- **deactivated**: 被 keep-alive 缓存的组件停用时调用
- **errorCaptured**: 当捕获一个来自子孙组件的错误时被调用

### Vue 3 生命周期钩子

- **beforeCreate** -> 使用 `setup()`
- **created** -> 使用 `setup()`
- **beforeMount** -> `onBeforeMount`
- **mounted** -> `onMounted`
- **beforeUpdate** -> `onBeforeUpdate`
- **updated** -> `onUpdated`
- **beforeUnmount** -> `onBeforeUnmount` (替代 beforeDestroy)
- **unmounted** -> `onUnmounted` (替代 destroyed)
- **activated** -> `onActivated`
- **deactivated** -> `onDeactivated`
- **errorCaptured** -> `onErrorCaptured`
- **renderTracked** -> `onRenderTracked` (新增)
- **renderTriggered** -> `onRenderTriggered` (新增)

```vue
<script>
export default {
  beforeCreate() {
    console.log('beforeCreate')
  },
  created() {
    console.log('created')
  },
  beforeMount() {
    console.log('beforeMount')
  },
  mounted() {
    console.log('mounted')
  },
  beforeUpdate() {
    console.log('beforeUpdate')
  },
  updated() {
    console.log('updated')
  },
  beforeUnmount() {
    console.log('beforeUnmount')
  },
  unmounted() {
    console.log('unmounted')
  }
}
</script>
```

```vue
<script setup>
import { onBeforeMount, onMounted, onBeforeUpdate, onUpdated, onBeforeUnmount, onUnmounted } from 'vue'

onBeforeMount(() => {
  console.log('onBeforeMount')
})

onMounted(() => {
  console.log('onMounted')
})

onBeforeUpdate(() => {
  console.log('onBeforeUpdate')
})

onUpdated(() => {
  console.log('onUpdated')
})

onBeforeUnmount(() => {
  console.log('onBeforeUnmount')
})

onUnmounted(() => {
  console.log('onUnmounted')
})
</script>
```

## 组件复用

### 混入 (Mixins)

混入是一种分发 Vue 组件中可复用功能的方式。

```js
// mixin.js
export const myMixin = {
  data() {
    return {
      message: 'Hello from mixin!'
    }
  },
  created() {
    console.log('Mixin created')
  },
  methods: {
    sayHello() {
      console.log(this.message)
    }
  }
}
```

```vue
<template>
  <div>
    <p>{{ message }}</p>
    <button @click="sayHello">Say Hello</button>
  </div>
</template>

<script>
import { myMixin } from './mixin'

export default {
  mixins: [myMixin],
  created() {
    console.log('Component created')
  }
}
</script>
```

### 自定义指令

自定义指令允许你对普通 DOM 元素进行底层操作。

```js
// 全局注册
app.directive('focus', {
  mounted(el) {
    el.focus()
  }
})
```

```vue
<template>
  <div>
    <input v-focus>
  </div>
</template>

<script>
export default {
  // 局部注册
  directives: {
    focus: {
      mounted(el) {
        el.focus()
      }
    }
  }
}
</script>
```

### 插件

插件通常用来为 Vue 添加全局功能。

```js
// plugins/myPlugin.js
export default {
  install: (app, options) => {
    // 添加全局方法
    app.config.globalProperties.$myMethod = function (msg) {
      console.log(msg)
    }
    
    // 添加全局指令
    app.directive('my-directive', {
      mounted(el, binding) {
        el.innerHTML = binding.value
      }
    })
    
    // 添加全局混入
    app.mixin({
      created() {
        console.log('Plugin mixin created')
      }
    })
  }
}
```

```js
// main.js
import { createApp } from 'vue'
import App from './App.vue'
import myPlugin from './plugins/myPlugin'

const app = createApp(App)
app.use(myPlugin, { someOption: true })
app.mount('#app')
```

## 组件样式

### Scoped CSS

```vue
<style scoped>
.example {
  color: red;
}
</style>
```

### CSS Modules

```vue
<template>
  <div :class="$style.example">Example</div>
</template>

<style module>
.example {
  color: red;
}
</style>
```

### 动态样式

```vue
<template>
  <div>
    <div :style="{ color: activeColor, fontSize: fontSize + 'px' }">Style Object</div>
    <div :style="styleObject">Style Object</div>
    <div :style="[baseStyles, overridingStyles]">Array Syntax</div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      activeColor: 'red',
      fontSize: 16,
      styleObject: {
        color: 'red',
        fontSize: '16px'
      },
      baseStyles: {
        color: 'blue',
        fontSize: '16px'
      },
      overridingStyles: {
        fontWeight: 'bold'
      }
    }
  }
}
</script>
```

## 组件测试

### 单元测试

使用 Jest 和 Vue Test Utils 进行单元测试。

```js
// HelloWorld.spec.js
import { mount } from '@vue/test-utils'
import HelloWorld from '@/components/HelloWorld.vue'

describe('HelloWorld.vue', () => {
  it('renders props.msg when passed', () => {
    const msg = 'new message'
    const wrapper = mount(HelloWorld, {
      props: { msg }
    })
    expect(wrapper.text()).toMatch(msg)
  })
})
```

### 端到端测试

使用 Cypress 进行端到端测试。

```js
// cypress/integration/home.spec.js
describe('Home Page', () => {
  it('visits the home page', () => {
    cy.visit('/')
    cy.contains('h1', 'Welcome to Your Vue.js App')
  })

  it('clicks the button', () => {
    cy.visit('/')
    cy.get('button').click()
    cy.get('.count').should('contain', '1')
  })
})
```

## 性能优化

### 懒加载组件

```js
const AsyncComponent = defineAsyncComponent(() =>
  import('./components/AsyncComponent.vue')
)
```

### 使用 v-show 代替 v-if

当需要频繁切换时，使用 `v-show` 比 `v-if` 更高效。

```vue
<template>
  <div>
    <div v-show="isVisible">This is shown/hidden with v-show</div>
  </div>
</template>
```

### 使用 v-once

对于只需要渲染一次的内容，使用 `v-once` 指令。

```vue
<template>
  <div>
    <div v-once>This will never change: {{ message }}</div>
  </div>
</template>
```

### 使用 v-memo

Vue 3 中的 `v-memo` 指令可以记忆部分模板。

```vue
<template>
  <div>
    <div v-for="item in list" :key="item.id" v-memo="[item.id === selected]">
      {{ item.name }}
    </div>
  </div>
</template>
```

### 使用 computed 属性缓存计算结果

```vue
<template>
  <div>
    <p>{{ expensiveComputation }}</p>
  </div>
</template>

<script>
export default {
  data() {
    return {
      items: [1, 2, 3, 4, 5]
    }
  },
  computed: {
    expensiveComputation() {
      console.log('Computing...')
      return this.items.map(item => item * 2).reduce((sum, val) => sum + val, 0)
    }
  }
}
</script>
```

## 最佳实践

1. **组件名称使用多词**：避免与现有的或未来的 HTML 元素冲突。
2. **Prop 定义应该详细**：至少指定类型，最好提供默认值和验证。
3. **避免 v-if 和 v-for 一起使用**：v-if 的优先级高于 v-for，这可能导致性能问题。
4. **使用 key 管理可复用的元素**：Vue 会尽可能高效地渲染元素，这意味着它通常会复用已有元素而不是从头开始渲染。
5. **使用组件名作为样式作用域**：这样可以避免样式冲突。
6. **使用单文件组件**：将模板、脚本和样式封装在同一个文件中。
7. **使用 PascalCase 作为组件名**：这样可以与原生 HTML 元素区分开。
8. **使用 kebab-case 作为事件名**：这样可以与原生 DOM 事件保持一致。
9. **避免使用 this.$parent**：这会使组件与父组件紧密耦合。
10. **使用 Vuex 或 Pinia 进行状态管理**：对于大型应用，集中式状态管理可以使代码更加可维护。