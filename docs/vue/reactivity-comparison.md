# Vue 2 vs Vue 3 响应式系统对比

Vue 2 和 Vue 3 在响应式系统上有着本质的区别。Vue 3 使用 Proxy 替代了 Vue 2 的 Object.defineProperty，带来了性能和功能上的巨大提升。本文将深入对比两者的实现差异。

## 核心 API 对比

### Vue 2: Object.defineProperty

```javascript
// Vue 2 响应式实现
function defineReactive(obj, key, val) {
  // 创建依赖收集器
  const dep = new Dep()
  
  Object.defineProperty(obj, key, {
    enumerable: true,
    configurable: true,
    get() {
      // 依赖收集
      if (Dep.target) {
        dep.depend()
      }
      return val
    },
    set(newVal) {
      if (newVal === val) return
      val = newVal
      // 触发更新
      dep.notify()
    }
  })
}

// 使用
const data = { count: 0 }
defineReactive(data, 'count', data.count)

data.count // 触发 get
data.count = 1 // 触发 set
```

### Vue 3: Proxy

```typescript
// Vue 3 响应式实现
function reactive(target) {
  return new Proxy(target, {
    get(target, key, receiver) {
      // 依赖收集
      track(target, key)
      return Reflect.get(target, key, receiver)
    },
    set(target, key, value, receiver) {
      const result = Reflect.set(target, key, value, receiver)
      // 触发更新
      trigger(target, key)
      return result
    }
  })
}

// 使用
const data = reactive({ count: 0 })

data.count // 触发 get
data.count = 1 // 触发 set
```

## 功能对比

### 1. 动态添加/删除属性

#### Vue 2 的限制

```javascript
// Vue 2
const vm = new Vue({
  data: {
    user: {
      name: 'Alice'
    }
  }
})

// ❌ 不会触发响应
vm.user.age = 25

// ✅ 需要使用 Vue.set
Vue.set(vm.user, 'age', 25)
// 或
vm.$set(vm.user, 'age', 25)

// ❌ 不会触发响应
delete vm.user.name

// ✅ 需要使用 Vue.delete
Vue.delete(vm.user, 'name')
// 或
vm.$delete(vm.user, 'name')
```

#### Vue 3 的改进

```typescript
// Vue 3
const state = reactive({
  user: {
    name: 'Alice'
  }
})

// ✅ 自动响应
state.user.age = 25

// ✅ 自动响应
delete state.user.name
```

### 2. 数组操作

#### Vue 2 的限制

```javascript
// Vue 2
const vm = new Vue({
  data: {
    items: ['a', 'b', 'c']
  }
})

// ❌ 不会触发响应
vm.items[0] = 'x'
vm.items.length = 1

// ✅ 需要使用特殊方法
vm.$set(vm.items, 0, 'x')
vm.items.splice(1)

// ✅ 重写的数组方法可以触发响应
vm.items.push('d')
vm.items.pop()
vm.items.shift()
vm.items.unshift('z')
vm.items.splice(1, 1, 'y')
vm.items.sort()
vm.items.reverse()
```

#### Vue 3 的改进

```typescript
// Vue 3
const state = reactive({
  items: ['a', 'b', 'c']
})

// ✅ 全部自动响应
state.items[0] = 'x'
state.items.length = 1

// 数组方法也都正常工作
state.items.push('d')
```

### 3. 支持的数据类型

#### Vue 2

```javascript
// ✅ 支持
const obj = {}
const arr = []

// ❌ 不支持
const map = new Map()
const set = new Set()
const weakMap = new WeakMap()
const weakSet = new WeakSet()
```

#### Vue 3

```typescript
// ✅ 全部支持
const obj = reactive({})
const arr = reactive([])
const map = reactive(new Map())
const set = reactive(new Set())
// WeakMap 和 WeakSet 无法被代理
```

## 实现原理对比

### Vue 2 实现

```javascript
class Observer {
  constructor(value) {
    this.value = value
    this.dep = new Dep()
    
    // 为对象添加 __ob__ 标记
    def(value, '__ob__', this)
    
    if (Array.isArray(value)) {
      // 处理数组
      this.observeArray(value)
    } else {
      // 处理对象
      this.walk(value)
    }
  }
  
  walk(obj) {
    const keys = Object.keys(obj)
    for (let i = 0; i < keys.length; i++) {
      defineReactive(obj, keys[i])
    }
  }
  
  observeArray(items) {
    for (let i = 0, l = items.length; i < l; i++) {
      observe(items[i])
    }
  }
}

function defineReactive(obj, key, val) {
  const dep = new Dep()
  
  // 递归观察子对象
  let childOb = observe(val)
  
  Object.defineProperty(obj, key, {
    enumerable: true,
    configurable: true,
    get() {
      if (Dep.target) {
        dep.depend()
        if (childOb) {
          childOb.dep.depend()
          if (Array.isArray(val)) {
            dependArray(val)
          }
        }
      }
      return val
    },
    set(newVal) {
      if (newVal === val || (newVal !== newVal && val !== val)) {
        return
      }
      val = newVal
      childOb = observe(newVal)
      dep.notify()
    }
  })
}

// 依赖收集器
class Dep {
  static target = null
  
  constructor() {
    this.subs = []
  }
  
  addSub(sub) {
    this.subs.push(sub)
  }
  
  depend() {
    if (Dep.target) {
      Dep.target.addDep(this)
    }
  }
  
  notify() {
    const subs = this.subs.slice()
    for (let i = 0, l = subs.length; i < l; i++) {
      subs[i].update()
    }
  }
}

// Watcher
class Watcher {
  constructor(vm, expOrFn, cb) {
    this.vm = vm
    this.getter = expOrFn
    this.cb = cb
    this.deps = []
    this.depIds = new Set()
    this.value = this.get()
  }
  
  get() {
    Dep.target = this
    const value = this.getter.call(this.vm, this.vm)
    Dep.target = null
    return value
  }
  
  addDep(dep) {
    if (!this.depIds.has(dep.id)) {
      this.depIds.add(dep.id)
      this.deps.push(dep)
      dep.addSub(this)
    }
  }
  
  update() {
    const value = this.get()
    const oldValue = this.value
    this.value = value
    this.cb.call(this.vm, value, oldValue)
  }
}
```

### Vue 3 实现

```typescript
// 全局依赖图
const targetMap = new WeakMap<any, KeyToDepMap>()
let activeEffect: ReactiveEffect | undefined

function reactive(target) {
  return createReactiveObject(
    target,
    mutableHandlers,
    mutableCollectionHandlers,
    reactiveMap
  )
}

function createReactiveObject(target, baseHandlers, collectionHandlers, proxyMap) {
  // 检查是否已经是代理
  if (target[ReactiveFlags.RAW]) {
    return target
  }
  
  // 检查缓存
  const existingProxy = proxyMap.get(target)
  if (existingProxy) {
    return existingProxy
  }
  
  // 创建代理
  const proxy = new Proxy(
    target,
    targetType === TargetType.COLLECTION ? collectionHandlers : baseHandlers
  )
  
  proxyMap.set(target, proxy)
  return proxy
}

// Handlers
const mutableHandlers = {
  get(target, key, receiver) {
    track(target, TrackOpTypes.GET, key)
    const res = Reflect.get(target, key, receiver)
    return isObject(res) ? reactive(res) : res
  },
  set(target, key, value, receiver) {
    const oldValue = target[key]
    const result = Reflect.set(target, key, value, receiver)
    if (hasChanged(value, oldValue)) {
      trigger(target, TriggerOpTypes.SET, key, value, oldValue)
    }
    return result
  },
  deleteProperty(target, key) {
    const hadKey = hasOwn(target, key)
    const result = Reflect.deleteProperty(target, key)
    if (result && hadKey) {
      trigger(target, TriggerOpTypes.DELETE, key)
    }
    return result
  }
}

// 依赖追踪
function track(target, type, key) {
  if (!activeEffect || !shouldTrack) return
  
  let depsMap = targetMap.get(target)
  if (!depsMap) {
    targetMap.set(target, (depsMap = new Map()))
  }
  
  let dep = depsMap.get(key)
  if (!dep) {
    depsMap.set(key, (dep = new Set()))
  }
  
  if (!dep.has(activeEffect)) {
    dep.add(activeEffect)
    activeEffect.deps.push(dep)
  }
}

// 触发更新
function trigger(target, type, key, newValue?, oldValue?) {
  const depsMap = targetMap.get(target)
  if (!depsMap) return
  
  const effects = new Set<ReactiveEffect>()
  const add = (effectsToAdd) => {
    if (effectsToAdd) {
      effectsToAdd.forEach(effect => effects.add(effect))
    }
  }
  
  add(depsMap.get(key))
  
  effects.forEach(effect => {
    if (effect.scheduler) {
      effect.scheduler(effect)
    } else {
      effect.run()
    }
  })
}
```

## 性能对比

### 初始化性能

```typescript
// Vue 2: 递归遍历所有属性
function observe(data) {
  if (!isObject(data)) return
  return new Observer(data) // 递归处理所有嵌套对象
}

// 大对象初始化慢
const largeData = {
  level1: {
    level2: {
      level3: {
        // 深层嵌套
      }
    }
  }
}

// Vue 3: 延迟转换
function reactive(target) {
  return new Proxy(target, {
    get(target, key) {
      const res = Reflect.get(target, key)
      // 只在访问时才转换
      return isObject(res) ? reactive(res) : res
    }
  })
}

// 初始化快，按需转换
const largeData = reactive({
  level1: {
    level2: {
      level3: {}
    }
  }
})
```

### 内存占用

```typescript
// Vue 2: 为每个属性创建 getter/setter
// 内存占用 = 属性数量 × (getter + setter + dep)

const data = {
  a: 1,
  b: 2,
  c: 3
  // 每个属性都有 getter、setter、dep
}

// Vue 3: 一个 Proxy 代理整个对象
// 内存占用 = 1个 Proxy + WeakMap 中的映射

const data = reactive({
  a: 1,
  b: 2,
  c: 3
  // 只有一个 Proxy 实例
})
```

### 运行时性能

```typescript
// 测试：1000 次属性访问
const data = reactive({ count: 0 })

// Vue 2: ~0.5ms
// Vue 3: ~0.3ms (Proxy 更快)

// 测试：1000 次属性修改
// Vue 2: ~1.2ms
// Vue 3: ~0.8ms (Proxy 更快)
```

## 迁移指南

### 1. 移除 Vue.set / Vue.delete

```javascript
// Vue 2
Vue.set(obj, 'newProp', value)
Vue.delete(obj, 'prop')

// Vue 3
obj.newProp = value
delete obj.prop
```

### 2. 数组索引赋值

```javascript
// Vue 2
this.$set(this.items, index, value)

// Vue 3
this.items[index] = value
```

### 3. 响应式 API 变化

```javascript
// Vue 2
import Vue from 'vue'

export default {
  data() {
    return {
      count: 0
    }
  }
}

// Vue 3
import { reactive, ref } from 'vue'

export default {
  setup() {
    // 使用 reactive
    const state = reactive({
      count: 0
    })
    
    // 或使用 ref
    const count = ref(0)
    
    return { state, count }
  }
}
```

### 4. 数组方法

```javascript
// Vue 2: 只有 7 个方法被重写
const methods = ['push', 'pop', 'shift', 'unshift', 'splice', 'sort', 'reverse']

// Vue 3: 所有数组操作都是响应式的
state.items[0] = 'new value' // ✅ 响应式
state.items.length = 0 // ✅ 响应式
```

## 兼容性处理

### @vue/reactivity

Vue 3 的响应式系统可以独立使用：

```typescript
import { reactive, effect } from '@vue/reactivity'

const state = reactive({ count: 0 })

effect(() => {
  console.log(state.count)
})

state.count++ // 自动触发 effect
```

### 在 Vue 2 中使用 Composition API

```javascript
// 安装 @vue/composition-api
import VueCompositionAPI from '@vue/composition-api'
Vue.use(VueCompositionAPI)

// 使用
import { reactive, ref } from '@vue/composition-api'

export default {
  setup() {
    const state = reactive({ count: 0 })
    return { state }
  }
}
```

## 总结对比

| 特性             | Vue 2                 | Vue 3        |
| ---------------- | --------------------- | ------------ |
| **核心 API**     | Object.defineProperty | Proxy        |
| **动态属性**     | ❌ 需要 $set/$delete   | ✅ 自动支持   |
| **数组索引**     | ❌ 需要 $set           | ✅ 自动支持   |
| **数组 length**  | ❌ 不支持              | ✅ 支持       |
| **Map/Set**      | ❌ 不支持              | ✅ 支持       |
| **初始化性能**   | ⚠️ 递归遍历            | ✅ 延迟转换   |
| **内存占用**     | ⚠️ 每属性一个 dep      | ✅ 一个 Proxy |
| **运行时性能**   | ⚠️ 较慢                | ✅ 更快       |
| **类型推导**     | ⚠️ 有限                | ✅ 完整       |
| **Tree-shaking** | ❌ 不支持              | ✅ 支持       |

## 最佳实践

### Vue 2

```javascript
// 1. 提前声明所有属性
data() {
  return {
    user: {
      name: '',
      age: 0,
      email: '' // 即使暂时为空也要声明
    }
  }
}

// 2. 使用 $set 添加新属性
this.$set(this.user, 'phone', '123456')

// 3. 使用数组变更方法
this.items.splice(index, 1, newItem)
```

### Vue 3

```typescript
// 1. 自由添加属性
const state = reactive({
  user: {
    name: 'Alice'
  }
})
state.user.age = 25 // ✅ 自动响应

// 2. 直接操作数组
state.items[0] = newItem // ✅ 自动响应
state.items.length = 0 // ✅ 自动响应

// 3. 使用 ref 处理基本类型
const count = ref(0)
count.value++
```

Vue 3 的响应式系统相比 Vue 2 有质的飞跃，不仅解决了 Vue 2 的诸多限制，还带来了更好的性能和更小的包体积。理解两者的区别，有助于我们更好地进行 Vue 2 到 Vue 3 的迁移。

