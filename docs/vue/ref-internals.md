# ref 底层原理

`ref` 是 Vue 3 响应式系统的核心 API 之一，用于创建响应式的基本类型值。本文将深入解析 ref 的实现原理，包括 ref、shallowRef、triggerRef、customRef 等相关 API。

## ref 的设计思想

### 为什么需要 ref

JavaScript 的基本类型（number、string、boolean 等）是按值传递的，无法被 Proxy 代理：

```typescript
// Proxy 只能代理对象
let count = 0
const proxy = new Proxy(count, handlers) // ❌ 错误

//需要将基本类型包装成对象
let count = { value: 0 }
const proxy = new Proxy(count, handlers) // ✅ 正确
```

**ref 的本质就是将基本类型包装成一个对象，使其可以被 Proxy 代理。**

### ref 与 reactive 的关系

**核心要点：ref 的底层就是 reactive，reactive 是对象代理。**

```typescript
// ref 的实现可以简化理解为：
function ref(value) {
  // 创建一个包装对象
  const wrapper = {
    value: value
  }
  
  // 如果 value 是对象，使用 reactive 转换
  if (isObject(value)) {
    wrapper.value = reactive(value)
  }
  
  // 返回包装对象（实际上会被 RefImpl 类处理）
  return wrapper
}

// 所以 ref 本质上是：
// 1. 将值包装成 { value: xxx } 对象
// 2. 如果值是对象，内部使用 reactive 进行响应式转换
// 3. RefImpl 类负责拦截 .value 的访问和修改
```

### 关系示意图

```
基本类型值
    ↓
ref() 包装
    ↓
RefImpl { value: 基本类型值 }
    ↓
通过 getter/setter 拦截 .value 访问
    ↓
依赖收集和触发更新

对象类型值
    ↓
ref() 包装
    ↓
RefImpl { value: reactive(对象) }
    ↓
内部值使用 reactive 代理
    ↓
.value 访问返回代理对象
```

### ref vs reactive

```typescript
// ref - 适用于基本类型，但底层对象值使用 reactive
const count = ref(0)
console.log(count.value) // 需要 .value 访问

// ref 包装对象
const user = ref({ name: 'Alice', age: 25 })
// 等价于：RefImpl { value: reactive({ name: 'Alice', age: 25 }) }
user.value.name = 'Bob' // 内部的对象是 reactive 代理的，可以响应式更新

// reactive - 直接代理对象
const state = reactive({ count: 0 })
console.log(state.count) // 直接访问属性

// 两者的关系
const refObj = ref({ count: 0 })
const reactiveObj = reactive({ count: 0 })

// refObj.value 实际上就是一个 reactive 对象
console.log(isReactive(refObj.value)) // true
console.log(isReactive(reactiveObj)) // true
```

## ref 的实现

### RefImpl 类

```typescript
// ref 的实现类
class RefImpl<T> {
  private _value: T
  private _rawValue: T

  // 依赖集合
  public dep?: Dep = undefined
  // 标记为 ref
  public readonly __v_isRef = true

  constructor(value: T, public readonly __v_isShallow: boolean) {
    // 保存原始值
    this._rawValue = __v_isShallow ? value : toRaw(value)
    // 如果是对象且不是 shallow，转换为 reactive
    this._value = __v_isShallow ? value : toReactive(value)
  }

  // getter - 依赖收集
  get value() {
    // 收集依赖
    trackRefValue(this)
    return this._value
  }

  // setter - 触发更新
  set value(newVal) {
    // 判断是使用新值还是原始值进行比较
    const useDirectValue =
      this.__v_isShallow || isShallow(newVal) || isReadonly(newVal)
    
    newVal = useDirectValue ? newVal : toRaw(newVal)

    // 值发生变化时才触发更新
    if (hasChanged(newVal, this._rawValue)) {
      this._rawValue = newVal
      this._value = useDirectValue ? newVal : toReactive(newVal)
      // 触发更新
      triggerRefValue(this, newVal)
    }
  }
}

// ⭐ 核心：转换为响应式对象
// 这里体现了 ref 底层使用 reactive 的关键
const toReactive = <T extends unknown>(value: T): T =>
  isObject(value) ? reactive(value) : value
  // 如果值是对象，使用 reactive 进行代理
  // 如果是基本类型，直接返回

// ref 工厂函数
export function ref<T = any>(value?: unknown): Ref<UnwrapRef<T>> {
  return createRef(value, false)
}

function createRef(rawValue: unknown, shallow: boolean) {
  // 如果已经是 ref，直接返回
  if (isRef(rawValue)) {
    return rawValue
  }
  return new RefImpl(rawValue, shallow)
}

// 示例：ref 如何处理不同类型的值
const num = ref(0)           // RefImpl { value: 0 }
const str = ref('hello')     // RefImpl { value: 'hello' }
const obj = ref({ a: 1 })    // RefImpl { value: reactive({ a: 1 }) }
const arr = ref([1, 2, 3])   // RefImpl { value: reactive([1, 2, 3]) }

```

### 依赖收集

```typescript
// 收集 ref 的依赖
export function trackRefValue(ref: RefBase<any>) {
  // 如果应该追踪且有活跃的 effect
  if (shouldTrack && activeEffect) {
    // 获取原始 ref
    ref = toRaw(ref)
    
    // 如果还没有 dep，创建一个
    if (!ref.dep) {
      ref.dep = createDep()
    }

    // 追踪依赖
    trackEffects(ref.dep)
  }
}

export function trackEffects(dep: Dep) {
  let shouldTrack = false
  
  // 检查是否需要追踪
  if (effectTrackDepth <= maxMarkerBits) {
    // 使用位标记优化
    if (!newTracked(dep)) {
      // 标记为新追踪
      dep.n |= trackOpBit
      // 如果已经被追踪过，不需要重复追踪
      shouldTrack = !wasTracked(dep)
    }
  } else {
    // 降级处理
    shouldTrack = !dep.has(activeEffect!)
  }

  if (shouldTrack) {
    // 将 effect 添加到 dep
    dep.add(activeEffect!)
    // 将 dep 添加到 effect
    activeEffect!.deps.push(dep)
  }
}
```

### 触发更新

```typescript
// 触发 ref 的更新
export function triggerRefValue(ref: RefBase<any>, newVal?: any) {
  ref = toRaw(ref)
  
  // 如果有依赖，触发更新
  if (ref.dep) {
    triggerEffects(ref.dep)
  }
}

export function triggerEffects(dep: Dep | ReactiveEffect[]) {
  // 转换为数组
  const effects = isArray(dep) ? dep : [...dep]

  // 先触发计算属性的 effect
  for (const effect of effects) {
    if (effect.computed) {
      triggerEffect(effect)
    }
  }
  
  // 再触发普通 effect
  for (const effect of effects) {
    if (!effect.computed) {
      triggerEffect(effect)
    }
  }
}

function triggerEffect(effect: ReactiveEffect) {
  // 避免无限递归
  if (effect !== activeEffect || effect.allowRecurse) {
    if (effect.scheduler) {
      // 使用调度器
      effect.scheduler()
    } else {
      // 直接执行
      effect.run()
    }
  }
}
```

## shallowRef

`shallowRef` 只对 `.value` 的访问是响应式的，对于 `.value` 的属性访问不是响应式的。

### 实现

```typescript
export function shallowRef<T = any>(value?: T): ShallowRef<T> {
  return createRef(value, true)
}

// 使用示例
const state = shallowRef({ count: 0 })

// 修改 value 会触发更新
state.value = { count: 1 } // ✅ 触发更新

// 修改 value 的属性不会触发更新
state.value.count = 2 // ❌ 不触发更新
```

### 应用场景

```typescript
// 1. 性能优化 - 避免深层响应式转换
const largeObject = shallowRef({
  // 大量嵌套数据
  nested: {
    deep: {
      value: 1
    }
  }
})

// 只在需要时整体替换
largeObject.value = newLargeObject

// 2. 集成第三方库
const echarts = shallowRef(null)

onMounted(() => {
  echarts.value = echarts.init(el)
})
```

## triggerRef

强制触发 ref 的更新，即使值没有变化。

### 实现

```typescript
export function triggerRef(ref: Ref) {
  triggerRefValue(ref, ref.value)
}

// 使用示例 - 配合 shallowRef
const state = shallowRef({ count: 0 })

// 修改属性不会自动触发更新
state.value.count++

// 手动触发更新
triggerRef(state)
```

## customRef

创建一个自定义的 ref，显式控制依赖追踪和触发更新。

### 实现

```typescript
class CustomRefImpl<T> {
  public dep?: Dep = undefined

  private readonly _get: ReturnType<CustomRefFactory<T>>['get']
  private readonly _set: ReturnType<CustomRefFactory<T>>['set']

  public readonly __v_isRef = true

  constructor(factory: CustomRefFactory<T>) {
    // 工厂函数返回 get 和 set
    const { get, set } = factory(
      () => trackRefValue(this),
      () => triggerRefValue(this)
    )
    this._get = get
    this._set = set
  }

  get value() {
    return this._get()
  }

  set value(newVal) {
    this._set(newVal)
  }
}

export function customRef<T>(factory: CustomRefFactory<T>): Ref<T> {
  return new CustomRefImpl(factory) as any
}
```

### 应用场景

#### 1. 防抖 ref

```typescript
function useDebouncedRef<T>(value: T, delay = 200) {
  let timeout: number
  
  return customRef<T>((track, trigger) => {
    return {
      get() {
        // 依赖收集
        track()
        return value
      },
      set(newValue) {
        clearTimeout(timeout)
        timeout = setTimeout(() => {
          value = newValue
          // 触发更新
          trigger()
        }, delay)
      }
    }
  })
}

// 使用
const text = useDebouncedRef('hello')

// 连续修改，只会在最后一次修改后 200ms 触发更新
text.value = 'h'
text.value = 'he'
text.value = 'hel'
text.value = 'hell'
text.value = 'hello'
```

#### 2. 节流 ref

```typescript
function useThrottledRef<T>(value: T, delay = 200) {
  let timeout: number | undefined
  let lastTrigger = 0
  
  return customRef<T>((track, trigger) => {
    return {
      get() {
        track()
        return value
      },
      set(newValue) {
        const now = Date.now()
        
        if (now - lastTrigger >= delay) {
          // 立即触发
          value = newValue
          lastTrigger = now
          trigger()
        } else {
          // 延迟到时间间隔后触发
          clearTimeout(timeout)
          timeout = setTimeout(() => {
            value = newValue
            lastTrigger = Date.now()
            trigger()
          }, delay - (now - lastTrigger))
        }
      }
    }
  })
}
```

#### 3. 双向绑定 ref

```typescript
function useVModel<T>(
  props: any,
  key: string,
  emit: any
) {
  return customRef<T>((track, trigger) => {
    return {
      get() {
        track()
        return props[key]
      },
      set(newValue) {
        emit(`update:${key}`, newValue)
        trigger()
      }
    }
  })
}

// 在组件中使用
export default {
  props: ['modelValue'],
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    const value = useVModel(props, 'modelValue', emit)
    return { value }
  }
}
```

## toRef 和 toRefs

### toRef - 为响应式对象的属性创建 ref

```typescript
class ObjectRefImpl<T extends object, K extends keyof T> {
  public readonly __v_isRef = true

  constructor(
    private readonly _object: T,
    private readonly _key: K,
    private readonly _defaultValue?: T[K]
  ) {}

  get value() {
    const val = this._object[this._key]
    return val === undefined ? this._defaultValue! : val
  }

  set value(newVal) {
    this._object[this._key] = newVal
  }
}

export function toRef<T extends object, K extends keyof T>(
  object: T,
  key: K,
  defaultValue?: T[K]
): ToRef<T[K]> {
  const val = object[key]
  return isRef(val) ? val : (new ObjectRefImpl(object, key, defaultValue) as any)
}

// 使用示例
const state = reactive({
  foo: 1,
  bar: 2
})

// 为 foo 创建一个 ref，保持响应式连接
const fooRef = toRef(state, 'foo')

// 修改 ref 会影响原对象
fooRef.value++
console.log(state.foo) // 2

// 修改原对象也会影响 ref
state.foo++
console.log(fooRef.value) // 3
```

### toRefs - 为响应式对象的所有属性创建 ref

```typescript
export function toRefs<T extends object>(object: T): ToRefs<T> {
  const ret: any = isArray(object) ? new Array(object.length) : {}
  
  for (const key in object) {
    ret[key] = toRef(object, key)
  }
  
  return ret
}

// 使用示例 - 解构响应式对象
const state = reactive({
  foo: 1,
  bar: 2
})

// 直接解构会失去响应式
const { foo, bar } = state // ❌ foo 和 bar 不再是响应式的

// 使用 toRefs 保持响应式
const { foo: fooRef, bar: barRef } = toRefs(state) // ✅ 保持响应式

// 在模板中使用
export default {
  setup() {
    const state = reactive({
      foo: 1,
      bar: 2
    })
    
    // 返回 refs，模板中会自动解包
    return {
      ...toRefs(state)
    }
  }
}
```

## isRef 和 unref

### isRef - 检查是否为 ref

```typescript
export function isRef<T>(r: Ref<T> | unknown): r is Ref<T>
export function isRef(r: any): r is Ref {
  return !!(r && r.__v_isRef === true)
}

// 使用
const count = ref(0)
const state = reactive({ count: 0 })

console.log(isRef(count)) // true
console.log(isRef(state)) // false
console.log(isRef(state.count)) // false
```

### unref - 获取 ref 的值

```typescript
export function unref<T>(ref: T | Ref<T>): T {
  return isRef(ref) ? ref.value : ref
}

// 等价于
const value = isRef(ref) ? ref.value : ref

// 使用示例
function useFeature(maybeRef: number | Ref<number>) {
  // 统一处理 ref 和普通值
  const value = unref(maybeRef)
  console.log(value)
}

useFeature(10) // 10
useFeature(ref(10)) // 10
```

## proxyRefs - 自动解包

在模板中，ref 会被自动解包，这是通过 `proxyRefs` 实现的。

### 实现

```typescript
export function proxyRefs<T extends object>(
  objectWithRefs: T
): ShallowUnwrapRef<T> {
  return isReactive(objectWithRefs)
    ? objectWithRefs
    : new Proxy(objectWithRefs, shallowUnwrapHandlers)
}

// Proxy handlers
const shallowUnwrapHandlers: ProxyHandler<any> = {
  get(target, key, receiver) {
    // 自动解包 ref
    return unref(Reflect.get(target, key, receiver))
  },
  set(target, key, value, receiver) {
    const oldValue = target[key]
    // 如果旧值是 ref 而新值不是，更新 ref.value
    if (isRef(oldValue) && !isRef(value)) {
      oldValue.value = value
      return true
    } else {
      return Reflect.set(target, key, value, receiver)
    }
  }
}

// Vue 组件的 setup 返回值会被 proxyRefs 处理
export default {
  setup() {
    const count = ref(0)
    
    return {
      count // 在模板中可以直接用 count，不需要 count.value
    }
  }
}
```

## computed 的实现

computed 本质上也是一个特殊的 ref。

### ComputedRefImpl 类

```typescript
class ComputedRefImpl<T> {
  public dep?: Dep = undefined

  private _value!: T
  public readonly effect: ReactiveEffect<T>

  public readonly __v_isRef = true
  public readonly __v_isReadonly: boolean
  
  // 是否需要重新计算
  public _dirty = true
  // 是否正在计算
  public _cacheable: boolean

  constructor(
    getter: ComputedGetter<T>,
    private readonly _setter: ComputedSetter<T>,
    isReadonly: boolean,
    isSSR: boolean
  ) {
    // 创建 effect
    this.effect = new ReactiveEffect(getter, () => {
      // 当依赖变化时，标记为 dirty
      if (!this._dirty) {
        this._dirty = true
        // 触发计算属性的更新
        triggerRefValue(this)
      }
    })
    
    this.effect.computed = this
    this.effect.active = this._cacheable = !isSSR
    this.__v_isReadonly = isReadonly
  }

  get value() {
    // 获取原始对象
    const self = toRaw(this)
    // 收集依赖
    trackRefValue(self)
    
    // 如果是 dirty，重新计算
    if (self._dirty || !self._cacheable) {
      self._dirty = false
      // 执行 getter
      self._value = self.effect.run()!
    }
    
    return self._value
  }

  set value(newValue: T) {
    this._setter(newValue)
  }
}

export function computed<T>(
  getterOrOptions: ComputedGetter<T> | WritableComputedOptions<T>,
  debugOptions?: DebuggerOptions,
  isSSR = false
) {
  let getter: ComputedGetter<T>
  let setter: ComputedSetter<T>

  const onlyGetter = isFunction(getterOrOptions)
  if (onlyGetter) {
    getter = getterOrOptions
    setter = NOOP
  } else {
    getter = getterOrOptions.get
    setter = getterOrOptions.set
  }

  const cRef = new ComputedRefImpl(getter, setter, onlyGetter || !setter, isSSR)

  return cRef as any
}
```

### computed 的特性

```typescript
// 1. 懒计算
const count = ref(0)
const double = computed(() => {
  console.log('computing...')
  return count.value * 2
})

// 此时不会执行 getter
console.log('before access')

// 访问时才会计算
console.log(double.value) // 输出: computing... 0

// 2. 缓存
console.log(double.value) // 不会再次计算，直接返回缓存值

// 3. 依赖变化时才重新计算
count.value = 1
console.log(double.value) // 输出: computing... 2

// 4. 可写的 computed
const firstName = ref('John')
const lastName = ref('Doe')

const fullName = computed({
  get() {
    return firstName.value + ' ' + lastName.value
  },
  set(newValue) {
    [firstName.value, lastName.value] = newValue.split(' ')
  }
})

console.log(fullName.value) // John Doe
fullName.value = 'Jane Smith'
console.log(firstName.value) // Jane
console.log(lastName.value) // Smith
```

## 性能优化

### 1. 使用 shallowRef 避免深层响应式

```typescript
// ❌ 不好 - 深层响应式转换有性能开销
const data = ref({
  list: [/* 大量数据 */],
  nested: {
    deep: {
      value: 1
    }
  }
})

// ✅ 好 - 使用 shallowRef
const data = shallowRef({
  list: [/* 大量数据 */],
  nested: {
    deep: {
      value: 1
    }
  }
})

// 需要时整体替换
data.value = newData
```

### 2. 使用 triggerRef 批量更新

```typescript
const state = shallowRef({ count: 0, text: 'hello' })

// 批量修改
state.value.count = 10
state.value.text = 'world'

// 一次性触发更新
triggerRef(state)
```

### 3. computed 的自动缓存

```typescript
// ❌ 不好 - 每次都重新计算
const expensiveValue = () => {
  return expensiveOperation()
}

// ✅ 好 - 自动缓存
const expensiveValue = computed(() => {
  return expensiveOperation()
})
```

## 最佳实践

### 1. 优先使用 ref

```typescript
// ✅ 推荐 - 使用 ref
const count = ref(0)
const message = ref('hello')

// ⚠️ 特殊情况 - reactive 更适合
const state = reactive({
  user: {
    name: 'John',
    age: 30
  },
  settings: {
    theme: 'dark'
  }
})
```

### 2. 解构时使用 toRefs

```typescript
// ✅ 正确
const state = reactive({ foo: 1, bar: 2 })
const { foo, bar } = toRefs(state)

// ❌ 错误 - 失去响应式
const { foo, bar } = state
```

### 3. 使用 customRef 实现特殊逻辑

```typescript
// ✅ 防抖、节流、双向绑定等
const debouncedText = useDebouncedRef('', 300)
const throttledScroll = useThrottledRef(0, 100)
```

### 4. computed vs method

```typescript
// ✅ 使用 computed - 需要缓存
const filteredList = computed(() => {
  return list.value.filter(item => item.active)
})

// ✅ 使用 method - 不需要缓存
function formatDate(date: Date) {
  return date.toLocaleDateString()
}
```

## ref 与 reactive 的深层关系

### 为什么 ref 需要 reactive

```typescript
// ref 处理对象时的内部流程
const user = ref({
  name: 'Alice',
  age: 25,
  address: {
    city: 'Beijing'
  }
})

// 实际发生的事情：
// 1. ref 创建 RefImpl 实例
// 2. 对象值被 reactive() 转换为响应式代理
// 3. 嵌套对象也会被递归转换为响应式

user.value.name = 'Bob'              // ✅ 响应式
user.value.address.city = 'Shanghai' // ✅ 响应式（深层响应式）

// 这就是为什么说：ref 的底层就是 reactive
```

### ref 的完整工作流程

```typescript
// 1. 创建 ref
const state = ref({ count: 0 })

// 内部流程：
// RefImpl {
//   _rawValue: { count: 0 },           // 原始值
//   _value: reactive({ count: 0 }),    // 响应式代理值
//   dep: Set(),                         // 依赖集合
//   __v_isRef: true                     // ref 标记
// }

// 2. 访问 .value
console.log(state.value.count)

// 触发：
// - RefImpl 的 get value() getter
// - trackRefValue(this) 收集 ref 的依赖
// - 返回 this._value（reactive 代理对象）
// - 访问 count 触发 reactive 的 get trap
// - track(target, 'count') 收集属性依赖

// 3. 修改值
state.value.count++

// 触发：
// - 访问 count 触发 reactive 的 get trap
// - 修改 count 触发 reactive 的 set trap
// - trigger(target, 'count') 触发属性依赖
// - 不会触发 ref 的 setter（因为 .value 本身没变）

// 4. 替换整个 .value
state.value = { count: 10 }

// 触发：
// - RefImpl 的 set value() setter
// - 新对象被 reactive() 转换
// - triggerRefValue(this) 触发 ref 的依赖
```

### 统一的响应式系统

```typescript
// Vue 3 的响应式系统是统一的
// ref 和 reactive 都基于 Proxy

// ref 是特殊的响应式容器
// - 外层：RefImpl 拦截 .value 的访问
// - 内层：如果值是对象，使用 reactive 代理

// 所以可以说：
// ref = 响应式容器（RefImpl） + reactive（当值为对象时）
// reactive = 直接的 Proxy 代理

// 示例：
const refState = ref({ count: 0 })
const reactiveState = reactive({ count: 0 })

// refState.value 本质上就是一个 reactive 对象
console.log(toRaw(refState.value) === toRaw(reactiveState)) // 结构相同

// 它们都使用相同的依赖收集和触发机制
effect(() => {
  console.log(refState.value.count)      // 通过 ref 的 getter + reactive 的 getter
  console.log(reactiveState.count)       // 直接通过 reactive 的 getter
})
```

## 总结

ref 是 Vue 3 响应式系统的基础：

1. **ref 的本质** - 将值包装成对象，使用 RefImpl 类管理
2. **ref 与 reactive 的关系** - **ref 的底层就是 reactive**，当值为对象时，内部使用 reactive 进行代理
3. **依赖收集** - 在 get 时通过 trackRefValue 收集依赖
4. **触发更新** - 在 set 时通过 triggerRefValue 触发更新
5. **双层响应式** - RefImpl 管理外层（.value），reactive 管理内层（对象属性）
6. **shallowRef** - 只对 .value 响应式，不对内部对象响应式
7. **customRef** - 自定义依赖追踪和触发逻辑
8. **toRef/toRefs** - 保持解构后的响应式连接
9. **computed** - 特殊的 ref，带缓存的计算属性

### 关键认知

```typescript
// ⭐ 重要：理解这个关系
ref(对象) = RefImpl { value: reactive(对象) }

// 所以：
// - ref 需要 .value 访问
// - reactive 直接访问属性
// - 但它们底层都是 Proxy 代理
// - ref 在对象值的情况下，内部依赖 reactive

// 这就是为什么说：
// "ref 的底层就是 reactive，reactive 是对象代理"
```

理解 ref 的实现原理和与 reactive 的关系，能帮助我们：
- 正确使用各种 ref API
- 理解为什么 ref 需要 .value
- 知道何时使用 ref，何时使用 reactive
- 避免响应式丢失
- 优化应用性能
- 实现自定义响应式逻辑

