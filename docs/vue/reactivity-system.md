# Vue 3 响应式系统原理

Vue 3 的响应式系统是框架的核心，它基于 ES6 的 Proxy 实现，相比 Vue 2 的 `Object.defineProperty` 有了质的飞跃。本文将深入解析 Vue 3 响应式系统的实现原理。

## 响应式系统架构

### 核心概念

Vue 3 的响应式系统主要由以下几个部分组成：

1. **响应式对象（Reactive）** - 使用 Proxy 代理原始对象
2. **依赖收集（Track）** - 收集访问响应式数据的依赖
3. **触发更新（Trigger）** - 数据变化时触发相关副作用函数
4. **副作用函数（Effect）** - 依赖响应式数据的函数
5. **调度器（Scheduler）** - 控制副作用函数的执行时机

### 架构图

```
┌─────────────────────────────────────────────────────────┐
│                    响应式系统                             │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ┌──────────┐     ┌──────────┐     ┌──────────┐        │
│  │ Reactive │────▶│ Proxy    │────▶│ Target   │        │
│  └──────────┘     └──────────┘     └──────────┘        │
│                          │                               │
│                          ├── get ──▶ track()            │
│                          │                               │
│                          └── set ──▶ trigger()          │
│                                                           │
│  ┌──────────┐     ┌──────────┐     ┌──────────┐        │
│  │ Effect   │────▶│ Dep      │────▶│ Watcher  │        │
│  └──────────┘     └──────────┘     └──────────┘        │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

## 依赖追踪系统

### 核心数据结构

Vue 3 使用 WeakMap 和 Map 来存储依赖关系：

```typescript
// 全局依赖图
type Dep = Set<ReactiveEffect>
type KeyToDepMap = Map<any, Dep>
const targetMap = new WeakMap<any, KeyToDepMap>()

// 当前活跃的 effect
let activeEffect: ReactiveEffect | undefined

// 依赖关系结构
// WeakMap: {
//   target1: Map {
//     key1: Set [effect1, effect2],
//     key2: Set [effect1, effect3]
//   },
//   target2: Map {
//     key1: Set [effect2]
//   }
// }
```

### track - 依赖收集

```typescript
// 依赖收集函数
export function track(target: object, type: TrackOpTypes, key: unknown) {
  // 如果没有活跃的 effect，或者不应该追踪，直接返回
  if (!shouldTrack || activeEffect === undefined) {
    return
  }

  // 获取 target 对应的依赖 Map
  let depsMap = targetMap.get(target)
  if (!depsMap) {
    targetMap.set(target, (depsMap = new Map()))
  }

  // 获取 key 对应的依赖 Set
  let dep = depsMap.get(key)
  if (!dep) {
    depsMap.set(key, (dep = new Set()))
  }

  // 将当前活跃的 effect 添加到依赖集合中
  if (!dep.has(activeEffect)) {
    dep.add(activeEffect)
    // 双向记录：effect 也记录它依赖的 dep
    activeEffect.deps.push(dep)
  }
}

// 使用示例
const obj = reactive({ count: 0 })

effect(() => {
  // 读取 count 时触发 track
  // track(obj, 'get', 'count')
  console.log(obj.count)
})
```

### trigger - 触发更新

```typescript
// 触发更新函数
export function trigger(
  target: object,
  type: TriggerOpTypes,
  key?: unknown,
  newValue?: unknown,
  oldValue?: unknown
) {
  // 获取 target 的依赖 Map
  const depsMap = targetMap.get(target)
  if (!depsMap) {
    // 从未被追踪过
    return
  }

  // 收集需要执行的 effects
  const effects: Set<ReactiveEffect> = new Set()
  
  const add = (effectsToAdd: Set<ReactiveEffect> | undefined) => {
    if (effectsToAdd) {
      effectsToAdd.forEach(effect => {
        // 避免无限递归
        if (effect !== activeEffect || effect.allowRecurse) {
          effects.add(effect)
        }
      })
    }
  }

  // 根据操作类型收集 effects
  if (type === TriggerOpTypes.CLEAR) {
    // collection 被清空
    depsMap.forEach(add)
  } else if (key === 'length' && Array.isArray(target)) {
    // 数组长度变化
    depsMap.forEach((dep, key) => {
      if (key === 'length' || key >= (newValue as number)) {
        add(dep)
      }
    })
  } else {
    // 普通的 SET | ADD | DELETE
    if (key !== void 0) {
      add(depsMap.get(key))
    }

    // 对于 ADD | DELETE | Map.SET，也需要触发迭代相关的 effects
    switch (type) {
      case TriggerOpTypes.ADD:
        if (!Array.isArray(target)) {
          add(depsMap.get(ITERATE_KEY))
        } else if (isIntegerKey(key)) {
          // 添加数组索引时触发 length 依赖
          add(depsMap.get('length'))
        }
        break
      case TriggerOpTypes.DELETE:
        if (!Array.isArray(target)) {
          add(depsMap.get(ITERATE_KEY))
        }
        break
      case TriggerOpTypes.SET:
        if (isMap(target)) {
          add(depsMap.get(ITERATE_KEY))
        }
        break
    }
  }

  // 执行所有 effects
  const run = (effect: ReactiveEffect) => {
    if (effect.options.scheduler) {
      // 如果有调度器，使用调度器执行
      effect.options.scheduler(effect)
    } else {
      // 否则直接执行
      effect()
    }
  }

  effects.forEach(run)
}
```

### 完整的依赖追踪流程

```typescript
// 1. 创建响应式对象
const state = reactive({
  count: 0,
  message: 'Hello'
})

// 2. 创建副作用函数
effect(() => {
  // 3. 读取 count 时触发 get trap
  console.log(state.count)
  // 内部调用：track(state, 'get', 'count')
  // 建立依赖关系：targetMap.get(state).get('count').add(currentEffect)
})

// 4. 修改 count 时触发 set trap
state.count++
// 内部调用：trigger(state, 'set', 'count', 1, 0)
// 查找依赖：targetMap.get(state).get('count')
// 执行所有相关的 effect
```

## Effect 副作用系统

### ReactiveEffect 类

```typescript
export class ReactiveEffect<T = any> {
  // effect 是否活跃
  active = true
  // effect 依赖的 dep 集合
  deps: Dep[] = []
  // 父 effect（用于 effect 嵌套）
  parent: ReactiveEffect | undefined = undefined

  // 计算属性相关
  computed?: ComputedRefImpl<T>
  allowRecurse?: boolean

  // 生命周期钩子
  onStop?: () => void
  onTrack?: (event: DebuggerEvent) => void
  onTrigger?: (event: DebuggerEvent) => void

  constructor(
    public fn: () => T,
    public scheduler: EffectScheduler | null = null,
    scope?: EffectScope
  ) {
    recordEffectScope(this, scope)
  }

  run() {
    // 如果不是活跃状态，直接执行函数
    if (!this.active) {
      return this.fn()
    }

    // 保存父 effect（处理嵌套）
    let parent: ReactiveEffect | undefined = activeEffect
    let lastShouldTrack = shouldTrack
    
    // 向上查找，避免重复收集
    while (parent) {
      if (parent === this) {
        return
      }
      parent = parent.parent
    }

    try {
      // 设置父 effect
      this.parent = activeEffect
      // 设置当前活跃的 effect
      activeEffect = this
      shouldTrack = true

      // 清理旧的依赖
      cleanupEffect(this)

      // 执行函数，在执行过程中会触发依赖收集
      return this.fn()
    } finally {
      // 恢复父 effect
      activeEffect = this.parent
      shouldTrack = lastShouldTrack
      this.parent = undefined
    }
  }

  stop() {
    if (this.active) {
      cleanupEffect(this)
      if (this.onStop) {
        this.onStop()
      }
      this.active = false
    }
  }
}

// 清理 effect 的依赖
function cleanupEffect(effect: ReactiveEffect) {
  const { deps } = effect
  if (deps.length) {
    for (let i = 0; i < deps.length; i++) {
      deps[i].delete(effect)
    }
    deps.length = 0
  }
}
```

### effect 函数

```typescript
export interface ReactiveEffectOptions {
  lazy?: boolean
  scheduler?: EffectScheduler
  scope?: EffectScope
  allowRecurse?: boolean
  onStop?: () => void
  onTrack?: (event: DebuggerEvent) => void
  onTrigger?: (event: DebuggerEvent) => void
}

export function effect<T = any>(
  fn: () => T,
  options?: ReactiveEffectOptions
): ReactiveEffectRunner {
  // 如果 fn 已经是一个 effect，获取原始函数
  if ((fn as ReactiveEffectRunner).effect) {
    fn = (fn as ReactiveEffectRunner).effect.fn
  }

  // 创建 effect 实例
  const _effect = new ReactiveEffect(fn)
  
  // 合并选项
  if (options) {
    extend(_effect, options)
    if (options.scope) recordEffectScope(_effect, options.scope)
  }

  // 如果不是 lazy，立即执行
  if (!options || !options.lazy) {
    _effect.run()
  }

  // 返回 runner 函数
  const runner = _effect.run.bind(_effect) as ReactiveEffectRunner
  runner.effect = _effect
  return runner
}

// 使用示例
const runner = effect(
  () => {
    console.log(state.count)
  },
  {
    scheduler: (effect) => {
      // 自定义调度逻辑
      queueJob(effect)
    },
    onTrack: (e) => {
      console.log('tracked:', e)
    },
    onTrigger: (e) => {
      console.log('triggered:', e)
    }
  }
)

// 停止 effect
runner.effect.stop()
```

### Effect 嵌套

```typescript
// Vue 3 支持 effect 嵌套
const state = reactive({ count: 0, nested: { value: 1 } })

effect(() => {
  console.log('outer effect', state.count)
  
  effect(() => {
    console.log('inner effect', state.nested.value)
  })
})

// 输出：
// outer effect 0
// inner effect 1

state.count++
// 输出：outer effect 1
// 注意：不会触发 inner effect

state.nested.value++
// 输出：inner effect 2
```

## 调度器系统

### 为什么需要调度器

```typescript
// 没有调度器的情况
const state = reactive({ count: 0 })

effect(() => {
  console.log(state.count)
})

// 连续修改会触发多次更新
state.count++ // 输出: 1
state.count++ // 输出: 2
state.count++ // 输出: 3
```

### 实现调度器

```typescript
// 任务队列
const queue: Set<ReactiveEffect> = new Set()
let isFlushing = false
let isFlushPending = false

// 将 effect 加入队列
export function queueJob(job: ReactiveEffect) {
  queue.add(job)
  queueFlush()
}

// 刷新队列
function queueFlush() {
  if (!isFlushing && !isFlushPending) {
    isFlushPending = true
    // 在微任务中执行
    Promise.resolve().then(flushJobs)
  }
}

// 执行所有任务
function flushJobs() {
  isFlushPending = false
  isFlushing = true

  // 按创建顺序执行
  const jobs = Array.from(queue)
  queue.clear()

  jobs.forEach(job => {
    job()
  })

  isFlushing = false
}

// 使用调度器
effect(
  () => {
    console.log(state.count)
  },
  {
    scheduler: queueJob
  }
)

// 连续修改只会触发一次更新
state.count++
state.count++
state.count++

// 在下一个微任务中输出: 3
```

## 响应式对象创建

### reactive 函数

```typescript
export function reactive<T extends object>(target: T): UnwrapNestedRefs<T> {
  // 如果是只读对象，直接返回
  if (isReadonly(target)) {
    return target
  }
  
  return createReactiveObject(
    target,
    false,
    mutableHandlers,
    mutableCollectionHandlers,
    reactiveMap
  )
}

// 创建响应式对象的核心函数
function createReactiveObject(
  target: Target,
  isReadonly: boolean,
  baseHandlers: ProxyHandler<any>,
  collectionHandlers: ProxyHandler<any>,
  proxyMap: WeakMap<Target, any>
) {
  // 如果不是对象，直接返回
  if (!isObject(target)) {
    return target
  }

  // 如果已经是代理对象，直接返回
  if (
    target[ReactiveFlags.RAW] &&
    !(isReadonly && target[ReactiveFlags.IS_REACTIVE])
  ) {
    return target
  }

  // 如果已经有对应的代理，返回缓存的代理
  const existingProxy = proxyMap.get(target)
  if (existingProxy) {
    return existingProxy
  }

  // 只有白名单中的类型才能被代理
  const targetType = getTargetType(target)
  if (targetType === TargetType.INVALID) {
    return target
  }

  // 创建代理对象
  const proxy = new Proxy(
    target,
    targetType === TargetType.COLLECTION ? collectionHandlers : baseHandlers
  )
  
  // 缓存代理对象
  proxyMap.set(target, proxy)
  
  return proxy
}
```

### Proxy Handlers

```typescript
// 基础类型的 Handlers
export const mutableHandlers: ProxyHandler<object> = {
  get(target, key, receiver) {
    // 处理特殊标记
    if (key === ReactiveFlags.IS_REACTIVE) {
      return true
    } else if (key === ReactiveFlags.IS_READONLY) {
      return false
    } else if (key === ReactiveFlags.RAW) {
      return target
    }

    const targetIsArray = Array.isArray(target)

    // 拦截数组方法
    if (targetIsArray && hasOwn(arrayInstrumentations, key)) {
      return Reflect.get(arrayInstrumentations, key, receiver)
    }

    // 获取值
    const res = Reflect.get(target, key, receiver)

    // 依赖收集
    track(target, TrackOpTypes.GET, key)

    // 如果是对象，递归转换为响应式
    if (isObject(res)) {
      return reactive(res)
    }

    return res
  },

  set(target, key, value, receiver) {
    // 获取旧值
    const oldValue = (target as any)[key]

    // 设置新值
    const result = Reflect.set(target, key, value, receiver)

    // 只有当目标对象是 receiver 的原始对象时才触发更新
    if (target === toRaw(receiver)) {
      // 判断是新增还是修改
      const hadKey = Array.isArray(target) && isIntegerKey(key)
        ? Number(key) < target.length
        : hasOwn(target, key)

      if (!hadKey) {
        // 新增属性
        trigger(target, TriggerOpTypes.ADD, key, value)
      } else if (hasChanged(value, oldValue)) {
        // 修改属性
        trigger(target, TriggerOpTypes.SET, key, value, oldValue)
      }
    }

    return result
  },

  deleteProperty(target, key) {
    const hadKey = hasOwn(target, key)
    const oldValue = (target as any)[key]
    const result = Reflect.deleteProperty(target, key)
    
    // 删除成功且属性存在时触发更新
    if (result && hadKey) {
      trigger(target, TriggerOpTypes.DELETE, key, undefined, oldValue)
    }
    
    return result
  },

  has(target, key) {
    const result = Reflect.has(target, key)
    // 依赖收集
    track(target, TrackOpTypes.HAS, key)
    return result
  },

  ownKeys(target) {
    // 依赖收集（用于 Object.keys(), for...in 等）
    track(target, TrackOpTypes.ITERATE, Array.isArray(target) ? 'length' : ITERATE_KEY)
    return Reflect.ownKeys(target)
  }
}

// 数组方法拦截
const arrayInstrumentations: Record<string, Function> = {}

// 重写会修改数组的方法
;(['push', 'pop', 'shift', 'unshift', 'splice'] as const).forEach(key => {
  arrayInstrumentations[key] = function (this: any[], ...args: any[]) {
    // 暂停依赖收集
    pauseTracking()
    // 执行原始方法
    const res = (toRaw(this) as any)[key].apply(this, args)
    // 恢复依赖收集
    resetTracking()
    return res
  }
})

// 重写数组查找方法
;(['includes', 'indexOf', 'lastIndexOf'] as const).forEach(key => {
  arrayInstrumentations[key] = function (this: any[], ...args: any[]) {
    const arr = toRaw(this) as any
    
    // 对数组的每个元素进行依赖收集
    for (let i = 0, l = this.length; i < l; i++) {
      track(arr, TrackOpTypes.GET, i + '')
    }

    // 先用代理对象查找
    const res = arr[key](...args)
    if (res === -1 || res === false) {
      // 如果没找到，用原始对象再找一次
      return arr[key](...args.map(toRaw))
    } else {
      return res
    }
  }
})
```

### Collection 类型的 Handlers

```typescript
// Map, Set, WeakMap, WeakSet 的 Handlers
function createInstrumentationGetter(isReadonly: boolean, shallow: boolean) {
  const instrumentations = shallow
    ? shallowInstrumentations
    : isReadonly
    ? readonlyInstrumentations
    : mutableInstrumentations

  return (target: CollectionTypes, key: string | symbol, receiver: any) => {
    if (key === ReactiveFlags.IS_REACTIVE) {
      return !isReadonly
    } else if (key === ReactiveFlags.IS_READONLY) {
      return isReadonly
    } else if (key === ReactiveFlags.RAW) {
      return target
    }

    return Reflect.get(
      hasOwn(instrumentations, key) && key in target
        ? instrumentations
        : target,
      key,
      receiver
    )
  }
}

// Map 和 Set 的方法拦截
const mutableInstrumentations: Record<string, Function> = {
  get(this: MapTypes, key: unknown) {
    return get(this, key)
  },
  get size() {
    return size(this as unknown as IterableCollections)
  },
  has,
  add,
  set,
  delete: deleteEntry,
  clear,
  forEach: createForEach(false, false)
}

function get(target: MapTypes, key: unknown) {
  target = toRaw(target)
  const rawKey = toRaw(key)
  
  // 依赖收集
  track(target, TrackOpTypes.GET, rawKey)
  
  const { has } = getProto(target)
  const wrap = isReactive ? toReactive : toReadonly
  
  if (has.call(target, key)) {
    return wrap(target.get(key))
  } else if (has.call(target, rawKey)) {
    return wrap(target.get(rawKey))
  }
}

function set(this: MapTypes, key: unknown, value: unknown) {
  value = toRaw(value)
  const target = toRaw(this)
  const { has, get } = getProto(target)

  let hadKey = has.call(target, key)
  if (!hadKey) {
    key = toRaw(key)
    hadKey = has.call(target, key)
  }

  const oldValue = get.call(target, key)
  target.set(key, value)

  // 触发更新
  if (!hadKey) {
    trigger(target, TriggerOpTypes.ADD, key, value)
  } else if (hasChanged(value, oldValue)) {
    trigger(target, TriggerOpTypes.SET, key, value, oldValue)
  }

  return this
}
```

## 性能优化

### 1. 使用 WeakMap 避免内存泄漏

```typescript
// 使用 WeakMap 存储依赖关系
const targetMap = new WeakMap<any, KeyToDepMap>()

// 当 target 对象被垃圾回收时，对应的依赖关系也会被自动清理
```

### 2. 延迟创建深层响应式对象

```typescript
// 只在访问时才将嵌套对象转换为响应式
get(target, key, receiver) {
  const res = Reflect.get(target, key, receiver)
  
  if (isObject(res)) {
    // 延迟转换，只在访问时才创建响应式对象
    return reactive(res)
  }
  
  return res
}
```

### 3. 缓存响应式对象

```typescript
// 使用 Map 缓存已创建的响应式对象
const reactiveMap = new WeakMap<Target, any>()

function createReactiveObject(target, ...) {
  // 如果已经有代理，直接返回
  const existingProxy = proxyMap.get(target)
  if (existingProxy) {
    return existingProxy
  }
  
  // 创建新代理
  const proxy = new Proxy(target, handlers)
  proxyMap.set(target, proxy)
  
  return proxy
}
```

### 4. 批量更新

```typescript
// 使用调度器批量执行更新
const queue: Set<ReactiveEffect> = new Set()

state.count++
state.count++
state.count++

// 只会在下一个微任务中执行一次更新
```

## 调试技巧

### 使用 onTrack 和 onTrigger

```typescript
effect(
  () => {
    console.log(state.count)
  },
  {
    onTrack(e) {
      console.log('Track:', e)
      // { effect, target, type, key }
    },
    onTrigger(e) {
      console.log('Trigger:', e)
      // { effect, target, type, key, oldValue, newValue }
    }
  }
)
```

### 使用 toRaw 获取原始对象

```typescript
const state = reactive({ count: 0 })
const raw = toRaw(state)

// 修改原始对象不会触发响应式更新
raw.count++ // 不会触发 effect
```

### 使用 isReactive 检查对象

```typescript
const state = reactive({ count: 0 })
const plain = { count: 0 }

console.log(isReactive(state)) // true
console.log(isReactive(plain)) // false
```

## 总结

Vue 3 的响应式系统通过以下机制实现：

1. **Proxy** - 拦截对象操作
2. **依赖收集（track）** - 在 get 时收集依赖
3. **触发更新（trigger）** - 在 set 时触发更新
4. **Effect 系统** - 管理副作用函数
5. **调度器** - 控制更新时机
6. **WeakMap 存储** - 避免内存泄漏

这套系统相比 Vue 2：
- ✅ 支持动态添加/删除属性
- ✅ 支持数组索引和 length 修改
- ✅ 支持 Map、Set、WeakMap、WeakSet
- ✅ 性能更好（延迟创建、批量更新）
- ✅ 内存占用更低（WeakMap）

理解响应式系统的原理，有助于我们更好地使用 Vue 3，避免常见的陷阱，写出更高效的代码。

