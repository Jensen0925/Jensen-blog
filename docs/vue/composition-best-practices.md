# Composition API 最佳实践

## 什么是 Composition API

Composition API 是 Vue 3 引入的新特性，提供了一种更灵活的方式来组织组件逻辑。

```vue
<script setup>
import { ref, computed, onMounted } from 'vue'

const count = ref(0)
const doubled = computed(() => count.value * 2)

onMounted(() => {
  console.log('组件挂载了')
})
</script>

<template>
  <div>
    <p>Count: {{ count }}</p>
    <p>Doubled: {{ doubled }}</p>
  </div>
</template>
```

## Composition API vs Options API

### Options API（Vue 2 风格）

```vue
<script>
export default {
  data() {
    return {
      count: 0
    }
  },
  computed: {
    doubled() {
      return this.count * 2
    }
  },
  methods: {
    increment() {
      this.count++
    }
  },
  mounted() {
    console.log('组件挂载了')
  }
}
</script>
```

### Composition API（Vue 3 推荐）

```vue
<script setup>
import { ref, computed, onMounted } from 'vue'

const count = ref(0)
const doubled = computed(() => count.value * 2)
const increment = () => count.value++

onMounted(() => {
  console.log('组件挂载了')
})
</script>
```

### 为什么选择 Composition API？

**优势**：
1. **更好的逻辑复用** - 通过组合函数（Composables）
2. **更好的类型推导** - TypeScript 支持更好
3. **更灵活的代码组织** - 按功能组织而非选项
4. **更小的打包体积** - Tree-shaking 友好
5. **更好的性能** - 无需 this 绑定

## 响应式 API

### ref

```typescript
import { ref } from 'vue'

// 基本用法
const count = ref(0)
console.log(count.value) // 0
count.value++ // 1

// 对象
const user = ref({ name: 'Alice', age: 25 })
user.value.age++

// 数组
const list = ref([1, 2, 3])
list.value.push(4)

// 在模板中自动解包
```

```vue
<template>
  <!-- 无需 .value -->
  <div>{{ count }}</div>
</template>
```

### reactive

```typescript
import { reactive } from 'vue'

// 创建响应式对象
const state = reactive({
  count: 0,
  user: {
    name: 'Alice'
  }
})

// 直接访问属性
console.log(state.count)
state.count++

// ⚠️ 注意：reactive 对基本类型无效
const num = reactive(0) // ❌ 错误
const num = ref(0) // ✅ 正确
```

### ref vs reactive

```typescript
// ✅ ref：适合基本类型和需要重新赋值的情况
const count = ref(0)
const user = ref({ name: 'Alice' })

// 可以重新赋值
user.value = { name: 'Bob' }

// ✅ reactive：适合对象
const state = reactive({
  count: 0,
  user: { name: 'Alice' }
})

// ❌ 不能重新赋值整个对象
state = reactive({ count: 1 }) // 失去响应性

// ✅ 可以修改属性
state.count = 1
state.user.name = 'Bob'
```

### computed

```typescript
import { ref, computed } from 'vue'

const count = ref(0)

// 只读计算属性
const doubled = computed(() => count.value * 2)

// 可写计算属性
const doubled = computed({
  get() {
    return count.value * 2
  },
  set(newValue) {
    count.value = newValue / 2
  }
})

doubled.value = 10 // count.value = 5
```

### watch 和 watchEffect

```typescript
import { ref, watch, watchEffect } from 'vue'

const count = ref(0)
const user = ref({ name: 'Alice', age: 25 })

// watch - 监听特定数据源
watch(count, (newVal, oldVal) => {
  console.log(`count: ${oldVal} -> ${newVal}`)
})

// 监听多个数据源
watch([count, () => user.value.age], ([newCount, newAge]) => {
  console.log(newCount, newAge)
})

// 深度监听
watch(user, (newVal) => {
  console.log('user changed')
}, { deep: true })

// watchEffect - 自动追踪依赖
watchEffect(() => {
  console.log(`count: ${count.value}`)
  console.log(`age: ${user.value.age}`)
  // 自动追踪 count 和 user.age
})

// 立即执行
watch(count, (val) => {
  console.log(val)
}, { immediate: true })
```

## 生命周期钩子

```typescript
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
    // 创建阶段
    console.log('setup()')
    
    // 挂载前
    onBeforeMount(() => {
      console.log('onBeforeMount')
    })
    
    // 挂载后
    onMounted(() => {
      console.log('onMounted')
    })
    
    // 更新前
    onBeforeUpdate(() => {
      console.log('onBeforeUpdate')
    })
    
    // 更新后
    onUpdated(() => {
      console.log('onUpdated')
    })
    
    // 卸载前
    onBeforeUnmount(() => {
      console.log('onBeforeUnmount')
    })
    
    // 卸载后
    onUnmounted(() => {
      console.log('onUnmounted')
    })
    
    // Keep-alive 激活
    onActivated(() => {
      console.log('onActivated')
    })
    
    // Keep-alive 停用
    onDeactivated(() => {
      console.log('onDeactivated')
    })
    
    // 错误捕获
    onErrorCaptured((err, instance, info) => {
      console.log('Error:', err)
      return false // 阻止错误向上传播
    })
  }
}
```

## Composables（组合函数）

### 什么是 Composables

Composables 是利用 Composition API 实现的可复用逻辑函数。

### 1. 鼠标位置追踪

```typescript
// composables/useMouse.ts
import { ref, onMounted, onUnmounted } from 'vue'

export function useMouse() {
  const x = ref(0)
  const y = ref(0)
  
  function update(event: MouseEvent) {
    x.value = event.pageX
    y.value = event.pageY
  }
  
  onMounted(() => {
    window.addEventListener('mousemove', update)
  })
  
  onUnmounted(() => {
    window.removeEventListener('mousemove', update)
  })
  
  return { x, y }
}

// 使用
<script setup>
import { useMouse } from './composables/useMouse'

const { x, y } = useMouse()
</script>

<template>
  <div>鼠标位置：{{ x }}, {{ y }}</div>
</template>
```

### 2. 数据获取

```typescript
// composables/useFetch.ts
import { ref } from 'vue'

export function useFetch<T>(url: string) {
  const data = ref<T | null>(null)
  const error = ref<Error | null>(null)
  const loading = ref(false)
  
  async function fetchData() {
    loading.value = true
    error.value = null
    
    try {
      const response = await fetch(url)
      data.value = await response.json()
    } catch (e) {
      error.value = e as Error
    } finally {
      loading.value = false
    }
  }
  
  fetchData()
  
  return { data, error, loading, refetch: fetchData }
}

// 使用
<script setup>
const { data, error, loading, refetch } = useFetch('/api/users')
</script>

<template>
  <div v-if="loading">加载中...</div>
  <div v-else-if="error">错误：{{ error.message }}</div>
  <div v-else>
    <ul>
      <li v-for="user in data" :key="user.id">
        {{ user.name }}
      </li>
    </ul>
    <button @click="refetch">刷新</button>
  </div>
</template>
```

### 3. 本地存储

```typescript
// composables/useLocalStorage.ts
import { ref, watch } from 'vue'

export function useLocalStorage<T>(key: string, defaultValue: T) {
  const data = ref<T>(defaultValue)
  
  // 从 localStorage 读取
  const stored = localStorage.getItem(key)
  if (stored) {
    try {
      data.value = JSON.parse(stored)
    } catch (e) {
      console.error(e)
    }
  }
  
  // 监听变化并保存
  watch(
    data,
    (newValue) => {
      localStorage.setItem(key, JSON.stringify(newValue))
    },
    { deep: true }
  )
  
  return data
}

// 使用
<script setup>
const theme = useLocalStorage('theme', 'light')
</script>
```

### 4. 防抖和节流

```typescript
// composables/useDebounce.ts
import { ref, watch } from 'vue'

export function useDebounce<T>(value: Ref<T>, delay: number = 300) {
  const debouncedValue = ref(value.value)
  let timeoutId: number
  
  watch(value, (newValue) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => {
      debouncedValue.value = newValue
    }, delay)
  })
  
  return debouncedValue
}

// 使用
<script setup>
const searchQuery = ref('')
const debouncedQuery = useDebounce(searchQuery, 500)

watch(debouncedQuery, (query) => {
  // 执行搜索
  searchAPI(query)
})
</script>
```

### 5. 异步状态

```typescript
// composables/useAsync.ts
import { ref } from 'vue'

export function useAsync<T>(fn: () => Promise<T>) {
  const data = ref<T | null>(null)
  const error = ref<Error | null>(null)
  const loading = ref(false)
  
  async function execute() {
    loading.value = true
    error.value = null
    
    try {
      data.value = await fn()
    } catch (e) {
      error.value = e as Error
    } finally {
      loading.value = false
    }
  }
  
  return { data, error, loading, execute }
}

// 使用
<script setup>
const { data, error, loading, execute } = useAsync(async () => {
  const response = await fetch('/api/data')
  return response.json()
})

// 手动触发
execute()
</script>
```

## 组件通信

### 1. Props 和 Emits

```vue
<!-- 父组件 -->
<script setup>
import { ref } from 'vue'
import Child from './Child.vue'

const message = ref('Hello')
const handleUpdate = (newMsg) => {
  message.value = newMsg
}
</script>

<template>
  <Child :message="message" @update="handleUpdate" />
</template>

<!-- 子组件 -->
<script setup>
// 定义 props
const props = defineProps<{
  message: string
}>()

// 定义 emits
const emit = defineEmits<{
  update: [message: string]
}>()

// 触发事件
const handleClick = () => {
  emit('update', 'New message')
}
</script>

<template>
  <div>
    <p>{{ message }}</p>
    <button @click="handleClick">更新</button>
  </div>
</template>
```

### 2. Provide / Inject

```vue
<!-- 祖先组件 -->
<script setup>
import { provide, ref } from 'vue'

const theme = ref('dark')
provide('theme', theme)

// 提供只读值
provide('readonly-theme', readonly(theme))
</script>

<!-- 后代组件 -->
<script setup>
import { inject } from 'vue'

const theme = inject('theme')
// 带默认值
const locale = inject('locale', 'zh-CN')
</script>
```

### 3. Template Refs

```vue
<script setup>
import { ref, onMounted } from 'vue'

const inputRef = ref<HTMLInputElement | null>(null)
const childRef = ref<InstanceType<typeof Child> | null>(null)

onMounted(() => {
  // 访问 DOM 元素
  inputRef.value?.focus()
  
  // 访问子组件实例
  childRef.value?.someMethod()
})
</script>

<template>
  <input ref="inputRef" />
  <Child ref="childRef" />
</template>
```

## 高级技巧

### 1. 响应式转换

```typescript
import { ref, reactive, toRef, toRefs, isRef, unref } from 'vue'

const state = reactive({
  count: 0,
  user: { name: 'Alice' }
})

// toRef - 创建单个属性的 ref
const count = toRef(state, 'count')

// toRefs - 将响应式对象转换为普通对象，每个属性都是 ref
const { count, user } = toRefs(state)

// isRef - 检查是否是 ref
if (isRef(count)) {
  console.log(count.value)
}

// unref - 获取 ref 的值（如果是 ref 就返回 .value，否则返回本身）
const value = unref(count)
```

### 2. 浅层响应式

```typescript
import { shallowRef, shallowReactive, triggerRef } from 'vue'

// shallowRef - 只有 .value 的变化会触发响应
const state = shallowRef({ count: 0 })
state.value.count++ // 不会触发更新
state.value = { count: 1 } // 会触发更新

// 手动触发更新
state.value.count++
triggerRef(state)

// shallowReactive - 只有根级属性是响应式的
const state = shallowReactive({
  count: 0,
  nested: { value: 0 }
})
state.count++ // 会触发更新
state.nested.value++ // 不会触发更新
```

### 3. 自定义 ref

```typescript
import { customRef } from 'vue'

// 防抖 ref
function useDebouncedRef(value: any, delay: number = 200) {
  let timeout: number
  
  return customRef((track, trigger) => {
    return {
      get() {
        track() // 追踪依赖
        return value
      },
      set(newValue) {
        clearTimeout(timeout)
        timeout = setTimeout(() => {
          value = newValue
          trigger() // 触发更新
        }, delay)
      }
    }
  })
}

// 使用
const text = useDebouncedRef('', 500)
```

### 4. EffectScope

```typescript
import { effectScope, ref, watchEffect } from 'vue'

const scope = effectScope()

scope.run(() => {
  const count = ref(0)
  
  watchEffect(() => {
    console.log(count.value)
  })
  
  // 在 scope 中创建的所有副作用
})

// 停止 scope 中的所有副作用
scope.stop()
```

## 最佳实践

### 1. 组合函数命名

```typescript
// ✅ 使用 use 前缀
export function useMouse() {}
export function useFetch() {}
export function useLocalStorage() {}

// ❌ 避免
export function getMouse() {}
export function fetchData() {}
```

### 2. 返回值

```typescript
// ✅ 返回对象，方便按需解构
export function useMouse() {
  const x = ref(0)
  const y = ref(0)
  
  return { x, y }
}

const { x } = useMouse() // 只使用 x

// ✅ 使用 readonly 防止外部修改
import { readonly } from 'vue'

export function useStore() {
  const state = reactive({ count: 0 })
  
  return {
    state: readonly(state),
    increment: () => state.count++
  }
}
```

### 3. 副作用清理

```typescript
export function useEventListener(target: EventTarget, event: string, callback: Function) {
  onMounted(() => {
    target.addEventListener(event, callback)
  })
  
  // ✅ 确保清理
  onUnmounted(() => {
    target.removeEventListener(event, callback)
  })
}
```

### 4. TypeScript 类型

```typescript
import { Ref } from 'vue'

// ✅ 为 composable 提供类型
export function useFetch<T>(url: string): {
  data: Ref<T | null>
  error: Ref<Error | null>
  loading: Ref<boolean>
  refetch: () => Promise<void>
} {
  // ...
}

// 使用
interface User {
  id: number
  name: string
}

const { data } = useFetch<User[]>('/api/users')
// data 的类型是 Ref<User[] | null>
```

### 5. 避免过度抽象

```typescript
// ❌ 过度抽象
export function useCounter(initialValue = 0) {
  const count = ref(initialValue)
  const increment = () => count.value++
  const decrement = () => count.value--
  return { count, increment, decrement }
}

// ✅ 简单逻辑直接写在组件中
<script setup>
const count = ref(0)
const increment = () => count.value++
</script>
```

## 性能优化

### 1. 使用 computed 缓存计算结果

```typescript
// ❌ 每次都重新计算
const fullName = () => {
  return user.firstName + ' ' + user.lastName
}

// ✅ 只在依赖变化时重新计算
const fullName = computed(() => {
  return user.firstName + ' ' + user.lastName
})
```

### 2. watchEffect vs watch

```typescript
// 如果需要访问旧值，使用 watch
watch(count, (newVal, oldVal) => {
  console.log('Changed from', oldVal, 'to', newVal)
})

// 如果不需要旧值，使用 watchEffect
watchEffect(() => {
  console.log('Count is', count.value)
})
```

### 3. 使用 shallowRef 处理大型数据

```typescript
// ❌ 深层响应式，性能开销大
const bigData = ref(largeArray)

// ✅ 浅层响应式，只在整体替换时响应
const bigData = shallowRef(largeArray)
```

## 总结

Composition API 的核心要点：

1. **响应式 API**
   - ref - 基本类型和对象
   - reactive - 对象
   - computed - 计算属性
   - watch/watchEffect - 监听器

2. **组合函数（Composables）**
   - 复用逻辑
   - use 前缀命名
   - 返回响应式数据

3. **生命周期**
   - 使用 onXxx 钩子
   - 在 setup 中调用

4. **最佳实践**
   - 合理使用 ref vs reactive
   - 善用 computed 缓存
   - 正确清理副作用
   - TypeScript 类型支持

Composition API 让 Vue 3 更加灵活和强大！

## 相关阅读

- [Vue 3 响应式系统](/vue/reactivity-system)
- [ref 底层原理](/vue/ref-internals)
- [Vue Router 原理](/vue/vue-router)
- [Pinia 状态管理](/vue/pinia)

