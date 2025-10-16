# Vue Vine - 函数式组件的新探索

Vue Vine 是一个实验性项目，旨在为 Vue 3 带来更加函数式的组件书写方式。它允许你在一个文件中定义多个组件，使用更简洁的语法，同时保持完整的 TypeScript 支持。

::: tip
Vue Vine 是社区实验项目，不是 Vue 官方特性。它提供了一种新的组件组织方式，适合喜欢函数式编程风格的开发者。
:::

## 什么是 Vue Vine

### 传统 SFC vs Vue Vine

```vue
<!-- 传统 SFC: Counter.vue -->
<script setup lang="ts">
import { ref } from 'vue'

const count = ref(0)
const increment = () => count.value++
</script>

<template>
  <button @click="increment">
    Count: {{ count }}
  </button>
</template>

<style scoped>
button {
  padding: 8px 16px;
  background: #42b983;
}
</style>
```

```ts
// Vue Vine: components.vine.ts
export function Counter() {
  const count = ref(0)
  const increment = () => count.value++
  
  return vine`
    <button @click="increment">
      Count: {{ count }}
    </button>
  `
}

// 可以在同一个文件定义多个组件
export function Message() {
  return vine`<div>Hello Vue Vine!</div>`
}

// 样式
Counter.styles = vine.css`
  button {
    padding: 8px 16px;
    background: #42b983;
  }
`
```

## 核心特性

### 1. 函数式组件定义

```typescript
import { ref, computed } from 'vue'

export function TodoItem(props: { todo: Todo }) {
  const done = ref(props.todo.done)
  
  const toggleDone = () => {
    done.value = !done.value
  }
  
  return vine`
    <li :class="{ done }">
      <input type="checkbox" v-model="done" />
      <span>{{ props.todo.text }}</span>
      <button @click="toggleDone">Toggle</button>
    </li>
  `
}
```

### 2. 多组件单文件

```typescript
// components.vine.ts
export function Parent() {
  const items = ref([1, 2, 3])
  
  return vine`
    <div>
      <Child v-for="item in items" :key="item" :value="item" />
    </div>
  `
}

export function Child(props: { value: number }) {
  return vine`
    <span>{{ props.value }}</span>
  `
}

// 这两个组件在同一个文件中
```

### 3. TypeScript 原生支持

```typescript
interface UserProps {
  name: string
  age: number
  email?: string
}

export function UserCard(props: UserProps) {
  // 完整的类型推导
  const displayName = computed(() => props.name.toUpperCase())
  
  return vine`
    <div class="user-card">
      <h3>{{ displayName }}</h3>
      <p>Age: {{ props.age }}</p>
      <p v-if="props.email">Email: {{ props.email }}</p>
    </div>
  `
}
```

### 4. 作用域样式

```typescript
export function StyledButton() {
  return vine`
    <button class="btn">Click me</button>
  `
}

StyledButton.styles = vine.css`
  .btn {
    padding: 10px 20px;
    background: linear-gradient(45deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }
  
  .btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }
`
```

## 实现原理

### 编译流程

```
.vine.ts 文件
    ↓
Vine Compiler
    ↓
解析函数和模板
    ↓
转换为 Vue 组件
    ↓
生成标准 .vue SFC
    ↓
Vue 编译器处理
```

### 编译器转换

```typescript
// 输入: components.vine.ts
export function Counter() {
  const count = ref(0)
  return vine`
    <button @click="count++">{{ count }}</button>
  `
}

// 编译器转换后
import { defineComponent, ref } from 'vue'

export const Counter = defineComponent({
  name: 'Counter',
  setup() {
    const count = ref(0)
    return {
      count
    }
  },
  render(_ctx) {
    return (
      <button onClick={() => _ctx.count++}>
        {_ctx.count}
      </button>
    )
  }
})
```

### vine 模板字符串处理

```typescript
// Vine 使用标签模板字符串
const template = vine`<div>{{ message }}</div>`

// 编译器识别 vine 标记，解析为 AST
function vine(strings: TemplateStringsArray, ...values: any[]) {
  // 这个函数在编译时被处理，运行时不存在
  return /* 编译后的渲染函数 */
}

// 编译时转换
vine`<div>{{ message }}</div>`
// ↓
createVNode("div", null, [
  createTextVNode(toDisplayString(message))
])
```

## 高级用法

### 1. 组合式函数

```typescript
// composables.vine.ts
export function useCounter(initial = 0) {
  const count = ref(initial)
  const increment = () => count.value++
  const decrement = () => count.value--
  const reset = () => count.value = initial
  
  return {
    count,
    increment,
    decrement,
    reset
  }
}

// 在组件中使用
export function CounterWithReset() {
  const { count, increment, reset } = useCounter(10)
  
  return vine`
    <div>
      <p>Count: {{ count }}</p>
      <button @click="increment">+1</button>
      <button @click="reset">Reset</button>
    </div>
  `
}
```

### 2. Props 和 Emits

```typescript
interface FormProps {
  initialValue: string
}

interface FormEmits {
  submit: (value: string) => void
  cancel: () => void
}

export function Form(props: FormProps, { emit }: { emit: FormEmits }) {
  const value = ref(props.initialValue)
  
  const handleSubmit = () => {
    emit('submit', value.value)
  }
  
  const handleCancel = () => {
    emit('cancel')
  }
  
  return vine`
    <form @submit.prevent="handleSubmit">
      <input v-model="value" />
      <button type="submit">Submit</button>
      <button type="button" @click="handleCancel">Cancel</button>
    </form>
  `
}
```

### 3. Slots

```typescript
export function Card(props: {}, { slots }: { slots: any }) {
  return vine`
    <div class="card">
      <div class="card-header">
        <slot name="header">Default Header</slot>
      </div>
      <div class="card-body">
        <slot>Default Content</slot>
      </div>
      <div class="card-footer">
        <slot name="footer" />
      </div>
    </div>
  `
}

// 使用
export function App() {
  return vine`
    <Card>
      <template #header>
        <h1>Custom Header</h1>
      </template>
      <p>Custom body content</p>
      <template #footer>
        <button>Action</button>
      </template>
    </Card>
  `
}
```

### 4. 生命周期钩子

```typescript
import { onMounted, onUnmounted } from 'vue'

export function Timer() {
  const seconds = ref(0)
  let timer: number
  
  onMounted(() => {
    timer = setInterval(() => {
      seconds.value++
    }, 1000)
  })
  
  onUnmounted(() => {
    clearInterval(timer)
  })
  
  return vine`
    <div>Seconds: {{ seconds }}</div>
  `
}
```

## Vine 与函数式编程

### 1. 组件即函数

```typescript
// 纯函数组件
export const Greeting = (props: { name: string }) => vine`
  <h1>Hello, {{ props.name }}!</h1>
`

// 带状态的函数组件
export function Counter() {
  const count = ref(0)
  return vine`
    <button @click="count++">{{ count }}</button>
  `
}
```

### 2. 组件组合

```typescript
// 高阶组件
export function withLoading<P>(Component: (props: P) => VineComponent) {
  return (props: P & { loading: boolean }) => {
    if (props.loading) {
      return vine`<div>Loading...</div>`
    }
    return Component(props)
  }
}

// 使用
const UserCardWithLoading = withLoading(UserCard)

export function App() {
  const loading = ref(true)
  
  return vine`
    <UserCardWithLoading 
      :loading="loading"
      name="Alice"
      age="25"
    />
  `
}
```

### 3. 函数式工具

```typescript
// 组件映射
export function renderList<T>(
  items: T[],
  renderItem: (item: T, index: number) => VineComponent
) {
  return items.map((item, index) => renderItem(item, index))
}

// 使用
export function TodoList() {
  const todos = ref([
    { id: 1, text: 'Learn Vue' },
    { id: 2, text: 'Learn Vine' }
  ])
  
  return vine`
    <ul>
      ${renderList(todos.value, (todo, index) => vine`
        <li key="${todo.id}">
          ${index + 1}. ${todo.text}
        </li>
      `)}
    </ul>
  `
}
```

## Vine 的优势

### 1. 更好的代码组织

```typescript
// 相关组件放在一起
export function TodoApp() {
  // ...
}

export function TodoList() {
  // ...
}

export function TodoItem() {
  // ...
}

export function TodoInput() {
  // ...
}

// 所有 Todo 相关组件在一个文件中
```

### 2. 减少文件数量

```
传统方式:
components/
  TodoApp.vue
  TodoList.vue
  TodoItem.vue
  TodoInput.vue

Vine 方式:
components/
  todo.vine.ts  // 包含所有 Todo 组件
```

### 3. 更强的类型支持

```typescript
// Props 类型直接定义，无需额外的类型声明
export function TypedComponent(props: {
  value: number
  onChange: (value: number) => void
}) {
  // 完整的类型推导
  return vine`
    <input 
      type="number"
      :value="props.value"
      @input="props.onChange($event.target.valueAsNumber)"
    />
  `
}
```

### 4. 函数式编程风格

```typescript
// 函数组合
const enhance = compose(
  withLoading,
  withError,
  withAuth
)

export const EnhancedUserCard = enhance(UserCard)
```

## 与其他方案对比

### Vine vs JSX

```typescript
// JSX
export const Counter = defineComponent({
  setup() {
    const count = ref(0)
    return () => (
      <button onClick={() => count.value++}>
        {count.value}
      </button>
    )
  }
})

// Vine
export function Counter() {
  const count = ref(0)
  return vine`
    <button @click="count++">{{ count }}</button>
  `
}
```

### Vine vs SFC

```vue
<!-- SFC -->
<script setup>
const count = ref(0)
</script>

<template>
  <button @click="count++">{{ count }}</button>
</template>
```

```typescript
// Vine
export function Counter() {
  const count = ref(0)
  return vine`
    <button @click="count++">{{ count }}</button>
  `
}
```

## 配置和使用

### 安装

```bash
npm install -D @vue-vine/vite-plugin
```

### Vite 配置

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import VueVine from '@vue-vine/vite-plugin'

export default defineConfig({
  plugins: [
    vue(),
    VueVine()
  ]
})
```

### TypeScript 配置

```json
{
  "compilerOptions": {
    "types": ["@vue-vine/types"]
  }
}
```

## 最佳实践

### 1. 文件命名

```
components/
  common.vine.ts       # 通用组件
  user.vine.ts         # 用户相关组件
  admin.vine.ts        # 管理员相关组件
```

### 2. 组件分组

```typescript
// user.vine.ts
export function UserProfile() {}
export function UserAvatar() {}
export function UserSettings() {}

// 相关组件放在一起
```

### 3. 样式组织

```typescript
export function Component() {
  return vine`<div class="component">...</div>`
}

// 组件样式
Component.styles = vine.css`
  .component {
    /* 组件样式 */
  }
`

// 全局样式
export const globalStyles = vine.css`
  body {
    /* 全局样式 */
  }
`
```

### 4. 类型定义

```typescript
// 导出 Props 类型供其他文件使用
export interface ButtonProps {
  variant: 'primary' | 'secondary'
  size: 'small' | 'medium' | 'large'
  disabled?: boolean
}

export function Button(props: ButtonProps) {
  return vine`
    <button 
      :class="[props.variant, props.size]"
      :disabled="props.disabled"
    >
      <slot />
    </button>
  `
}
```

## 总结

Vue Vine 带来了：

1. **函数式组件定义** - 更简洁的组件语法
2. **多组件单文件** - 更好的代码组织
3. **TypeScript 原生支持** - 完整的类型推导
4. **函数式编程风格** - 组件组合和高阶组件
5. **更少的样板代码** - 减少重复代码

Vue Vine 适合：
- ✅ 喜欢函数式编程的开发者
- ✅ 需要在一个文件中管理多个相关组件
- ✅ 重视 TypeScript 类型支持
- ✅ 追求代码简洁性

Vue Vine 可能不适合：
- ❌ 团队更熟悉传统 SFC 方式
- ❌ 项目需要使用 Scoped CSS 的高级特性
- ❌ 需要在编辑器中获得完整的模板智能提示

Vue Vine 是 Vue 生态的一个有趣探索，它为喜欢函数式编程的开发者提供了另一种选择。

