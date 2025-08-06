# Vue 组合式 API

组合式 API (Composition API) 是 Vue 3 中引入的一组 API，它们允许我们使用函数而不是声明选项的方式书写 Vue 组件，是 Vue 3 最重要的特性之一。

## 为什么需要组合式 API

在 Vue 2 中，我们使用选项式 API (Options API) 来组织组件代码，将代码分散到 `data`、`computed`、`methods` 等不同选项中。这种方式在处理简单组件时非常直观，但在处理复杂组件时，相关逻辑被分散到不同选项中，导致代码难以理解和维护。

组合式 API 的主要优势：

1. **更好的逻辑复用**：可以将相关逻辑提取到可复用的函数中
2. **更灵活的代码组织**：可以按照逻辑关注点组织代码
3. **更好的类型推导**：对 TypeScript 的支持更加友好
4. **更小的打包体积**：可以通过摇树优化 (tree-shaking) 减小打包体积

## setup 函数

`setup` 函数是组合式 API 的入口点，它在组件被创建之前执行，一旦 `props` 被解析完成，它就会被调用。

```vue
<template>
  <div>
    <p>Count: {{ count }}</p>
    <button @click="increment">Increment</button>
  </div>
</template>

<script>
import { ref } from 'vue'

export default {
  setup() {
    // 声明响应式状态
    const count = ref(0)
    
    // 定义方法
    function increment() {
      count.value++
    }
    
    // 返回需要暴露给模板的内容
    return {
      count,
      increment
    }
  }
}
</script>
```

### setup 的参数

`setup` 函数接收两个参数：

1. `props`：组件的 props
2. `context`：一个包含组件上下文的对象，包含 `attrs`、`slots`、`emit` 和 `expose`


```vue
<script>
export default {
  props: {
    title: String
  },
  setup(props, { attrs, slots, emit, expose }) {
    console.log(props.title) // 访问 props
    
    function handleClick() {
      emit('custom-event', 'some value') // 触发事件
    }
    
    // 暴露方法给父组件
    expose({
      someMethod() {
        // ...
      }
    })
    
    return {
      handleClick
    }
  }
}
</script>
```

## 响应式核心

### ref

`ref` 用于创建一个响应式的数据引用，它可以持有任何类型的值。

```vue
<script setup>
import { ref } from 'vue'

const count = ref(0)

// 访问或修改值需要使用 .value
console.log(count.value) // 0
count.value++
console.log(count.value) // 1
</script>
```

在模板中使用 `ref` 时，不需要使用 `.value`：

```vue
<template>
  <div>{{ count }}</div>
</template>

<script setup>
import { ref } from 'vue'

const count = ref(0)
</script>
```

### reactive

`reactive` 用于创建一个响应式对象，类似于 Vue 2 中的 `data` 选项。

```vue
<script setup>
import { reactive } from 'vue'

const state = reactive({
  count: 0,
  message: 'Hello'
})

// 直接访问或修改属性
console.log(state.count) // 0
state.count++
console.log(state.count) // 1
</script>
```

### readonly

`readonly` 用于创建一个只读的响应式对象，防止对象被修改。

```vue
<script setup>
import { reactive, readonly } from 'vue'

const original = reactive({ count: 0 })
const copy = readonly(original)

original.count++ // 可以修改
copy.count++ // 警告: Set operation on key "count" failed: target is readonly.
</script>
```

### computed

`computed` 用于创建计算属性，它接收一个 getter 函数，返回一个只读的响应式 `ref` 对象。

```js
import { ref, computed } from 'vue'

const count = ref(0)
const doubleCount = computed(() => count.value * 2)

console.log(doubleCount.value) // 0
count.value++
console.log(doubleCount.value) // 2
```

也可以创建可写的计算属性：

```js
import { ref, computed } from 'vue'

const count = ref(0)
const doubleCount = computed({
  get: () => count.value * 2,
  set: (val) => {
    count.value = val / 2
  }
})

doubleCount.value = 10
console.log(count.value) // 5
```

### watchEffect

`watchEffect` 用于自动跟踪响应式依赖并在依赖变化时重新执行回调函数。

```js
import { ref, watchEffect } from 'vue'

const count = ref(0)

watchEffect(() => {
  console.log(`Count is: ${count.value}`)
})
// 立即输出: "Count is: 0"

count.value++
// 输出: "Count is: 1"
```

### watch

`watch` 用于监听一个或多个响应式数据源，并在数据源变化时调用回调函数。

```js
import { ref, watch } from 'vue'

const count = ref(0)

watch(count, (newValue, oldValue) => {
  console.log(`Count changed from ${oldValue} to ${newValue}`)
})

count.value++
// 输出: "Count changed from 0 to 1"
```

监听多个数据源：

```js
import { ref, watch } from 'vue'

const count = ref(0)
const message = ref('Hello')

watch([count, message], ([newCount, newMessage], [oldCount, oldMessage]) => {
  console.log(`Count: ${oldCount} -> ${newCount}, Message: ${oldMessage} -> ${newMessage}`)
})

count.value++
// 输出: "Count: 0 -> 1, Message: Hello -> Hello"
```

## 生命周期钩子

组合式 API 提供了一组生命周期钩子函数，它们与选项式 API 中的生命周期钩子一一对应。

```js
import {
  onBeforeMount,
  onMounted,
  onBeforeUpdate,
  onUpdated,
  onBeforeUnmount,
  onUnmounted,
  onActivated,
  onDeactivated,
  onErrorCaptured
} from 'vue'

export default {
  setup() {
    onBeforeMount(() => {
      console.log('Before mount')
    })
    
    onMounted(() => {
      console.log('Mounted')
    })
    
    onBeforeUpdate(() => {
      console.log('Before update')
    })
    
    onUpdated(() => {
      console.log('Updated')
    })
    
    onBeforeUnmount(() => {
      console.log('Before unmount')
    })
    
    onUnmounted(() => {
      console.log('Unmounted')
    })
    
    onActivated(() => {
      console.log('Activated')
    })
    
    onDeactivated(() => {
      console.log('Deactivated')
    })
    
    onErrorCaptured((err, instance, info) => {
      console.log('Error captured:', err, instance, info)
      return false // 阻止错误继续传播
    })
  }
}
```

## 依赖注入

`provide` 和 `inject` 用于在组件树中传递数据，类似于 React 的 Context API。

```js
// 祖先组件
import { provide, ref } from 'vue'

export default {
  setup() {
    const theme = ref('dark')
    
    provide('theme', theme)
    
    return {
      theme
    }
  }
}
```

```js
// 后代组件
import { inject } from 'vue'

export default {
  setup() {
    const theme = inject('theme', 'light') // 第二个参数是默认值
    
    return {
      theme
    }
  }
}
```

## 模板引用

在组合式 API 中，可以使用 `ref` 来获取模板中的元素或组件实例。

```vue
<template>
  <div>
    <input ref="inputRef">
    <button @click="focusInput">Focus</button>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const inputRef = ref(null)

function focusInput() {
  inputRef.value.focus()
}

onMounted(() => {
  console.log(inputRef.value) // <input> 元素
})
</script>
```

## script setup

`<script setup>` 是在单文件组件 (SFC) 中使用组合式 API 的编译时语法糖，它使得使用组合式 API 更加简洁。

```vue
<template>
  <div>
    <p>Count: {{ count }}</p>
    <button @click="increment">Increment</button>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const count = ref(0)

function increment() {
  count.value++
}
</script>
```

使用 `<script setup>` 的特点：

1. 顶层的导入和变量声明可以直接在模板中使用
2. 不需要返回一个对象来暴露变量和方法
3. 组件可以直接导入并使用，无需注册

### defineProps 和 defineEmits

在 `<script setup>` 中，可以使用 `defineProps` 和 `defineEmits` 来声明 props 和 emits。

```vue
<template>
  <div>
    <p>{{ title }}</p>
    <button @click="$emit('change', 'new value')">Change</button>
  </div>
</template>

<script setup>
const props = defineProps({
  title: {
    type: String,
    required: true
  }
})

const emit = defineEmits(['change'])

// 也可以这样触发事件
function handleClick() {
  emit('change', 'new value')
}
</script>
```

### defineExpose

在 `<script setup>` 中，组件的所有变量默认都是私有的，不会暴露给父组件。可以使用 `defineExpose` 来显式暴露变量和方法。

```vue
<script setup>
import { ref } from 'vue'

const count = ref(0)

function increment() {
  count.value++
}

// 暴露给父组件
defineExpose({
  count,
  increment
})
</script>
```

## 组合函数 (Composables)

组合函数是一种利用 Vue 的组合式 API 来封装和复用有状态逻辑的函数。

```js
// useCounter.js
import { ref } from 'vue'

export function useCounter(initialValue = 0) {
  const count = ref(initialValue)
  
  function increment() {
    count.value++
  }
  
  function decrement() {
    count.value--
  }
  
  function reset() {
    count.value = initialValue
  }
  
  return {
    count,
    increment,
    decrement,
    reset
  }
}
```

```vue
<template>
  <div>
    <p>Count: {{ count }}</p>
    <button @click="increment">+</button>
    <button @click="decrement">-</button>
    <button @click="reset">Reset</button>
  </div>
</template>

<script setup>
import { useCounter } from './useCounter'

const { count, increment, decrement, reset } = useCounter(10)
</script>
```

### 常用的组合函数示例

#### useFetch

```js
// useFetch.js
import { ref, computed } from 'vue'

export function useFetch(url) {
  const data = ref(null)
  const error = ref(null)
  const loading = ref(true)
  
  fetch(url)
    .then(res => res.json())
    .then(json => {
      data.value = json
      loading.value = false
    })
    .catch(err => {
      error.value = err
      loading.value = false
    })
  
  return { data, error, loading }
}
```

#### useLocalStorage

```js
// useLocalStorage.js
import { ref, watch } from 'vue'

export function useLocalStorage(key, defaultValue) {
  const value = ref(JSON.parse(localStorage.getItem(key)) || defaultValue)
  
  watch(value, val => {
    localStorage.setItem(key, JSON.stringify(val))
  })
  
  return value
}
```

#### useWindowSize

```js
// useWindowSize.js
import { ref, onMounted, onUnmounted } from 'vue'

export function useWindowSize() {
  const width = ref(window.innerWidth)
  const height = ref(window.innerHeight)
  
  function update() {
    width.value = window.innerWidth
    height.value = window.innerHeight
  }
  
  onMounted(() => window.addEventListener('resize', update))
  onUnmounted(() => window.removeEventListener('resize', update))
  
  return { width, height }
}
```

## 与 TypeScript 集成

组合式 API 对 TypeScript 有很好的支持，可以为变量、函数参数和返回值提供类型注解。

```ts
import { ref, Ref } from 'vue'

interface User {
  id: number
  name: string
  email: string
}

function useUser(id: number): { user: Ref<User | null>, loading: Ref<boolean> } {
  const user = ref<User | null>(null)
  const loading = ref(true)
  
  // 获取用户数据
  fetch(`/api/users/${id}`)
    .then(res => res.json())
    .then(data => {
      user.value = data
      loading.value = false
    })
  
  return { user, loading }
}
```

### 为 props 和 emits 提供类型

```vue
<script setup lang="ts">
interface Props {
  title: string
  count?: number
}

const props = defineProps<Props>()

interface Emits {
  (e: 'change', value: string): void
  (e: 'submit'): void
}

const emit = defineEmits<Emits>()
</script>
```

## 最佳实践

### 1. 按逻辑关注点组织代码

```vue
<script setup>
import { ref, computed, onMounted } from 'vue'

// 用户相关逻辑
const user = ref(null)
const userLoading = ref(true)

function fetchUser() {
  // ...
}

onMounted(fetchUser)

// 计数器相关逻辑
const count = ref(0)
const doubleCount = computed(() => count.value * 2)

function increment() {
  count.value++
}
</script>
```

### 2. 提取可复用逻辑到组合函数

```vue
<script setup>
import { useUser } from './composables/useUser'
import { useCounter } from './composables/useCounter'

const { user, loading: userLoading, fetchUser } = useUser()
const { count, doubleCount, increment } = useCounter()

// 组件特定逻辑
// ...
</script>
```

### 3. 使用 ref 而不是 reactive 来声明原始类型

```js
// 推荐
const count = ref(0)

// 不推荐
const state = reactive({ count: 0 })
```

### 4. 使用 toRefs 或 toRef 解构 reactive 对象

```js
import { reactive, toRefs, toRef } from 'vue'

const state = reactive({
  count: 0,
  message: 'Hello'
})

// 解构并保持响应性
const { count, message } = toRefs(state)

// 或者只提取一个属性
const count = toRef(state, 'count')
```

### 5. 使用 readonly 防止状态被修改

```js
import { reactive, readonly } from 'vue'

const state = reactive({ count: 0 })

// 在组件间共享状态时，使用 readonly 防止被修改
function useSharedState() {
  return {
    state: readonly(state),
    increment() {
      state.count++
    }
  }
}
```

## 与选项式 API 对比

### 选项式 API

```vue
<template>
  <div>
    <p>Count: {{ count }}</p>
    <p>Double: {{ double }}</p>
    <button @click="increment">Increment</button>
  </div>
</template>

<script>
export default {
  data() {
    return {
      count: 0
    }
  },
  computed: {
    double() {
      return this.count * 2
    }
  },
  methods: {
    increment() {
      this.count++
    }
  },
  mounted() {
    console.log('Component mounted')
  }
}
</script>
```

### 组合式 API

```vue
<template>
  <div>
    <p>Count: {{ count }}</p>
    <p>Double: {{ double }}</p>
    <button @click="increment">Increment</button>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'

const count = ref(0)
const double = computed(() => count.value * 2)

function increment() {
  count.value++
}

onMounted(() => {
  console.log('Component mounted')
})
</script>
```

## 总结

组合式 API 是 Vue 3 中的一个重要特性，它提供了一种更灵活的方式来组织和复用组件逻辑。通过使用函数而不是选项来组织代码，我们可以更好地按照逻辑关注点来组织代码，提高代码的可读性和可维护性。

组合式 API 的核心包括：

- 响应式系统：`ref`、`reactive`、`computed`、`watch` 等
- 生命周期钩子：`onMounted`、`onUpdated` 等
- 依赖注入：`provide` 和 `inject`
- 组合函数：提取和复用有状态逻辑

虽然组合式 API 提供了更多的灵活性，但选项式 API 仍然是有效的，Vue 3 同时支持这两种风格。选择使用哪种 API 取决于项目的需求和个人偏好。
