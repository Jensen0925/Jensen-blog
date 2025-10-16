# Vue Diff 算法原理

Diff 算法是虚拟 DOM 的核心，用于比较新旧虚拟节点的差异，并最小化 DOM 操作。Vue 3 对 diff 算法进行了重大优化，引入了更快的算法和编译时优化。

## 什么是 Diff 算法

### 虚拟 DOM 更新流程

```
状态变化
    ↓
生成新的 VNode 树
    ↓
Diff 算法比较新旧 VNode
    ↓
找出差异（Patch）
    ↓
批量更新真实 DOM
```

### 为什么需要 Diff

```typescript
// 直接操作 DOM（低效）
const list = [1, 2, 3]
list.push(4)
// 清空整个列表，重新渲染
ul.innerHTML = ''
list.forEach(item => {
  ul.appendChild(createLi(item))
})

// 使用 Diff（高效）
// 只需要添加一个新的 li 元素
ul.appendChild(createLi(4))
```

### Diff 的核心思想

1. **同层比较** - 只比较同一层级的节点
2. **类型判断** - 不同类型的节点直接替换
3. **key 优化** - 使用 key 标识节点，优化列表更新
4. **最小化操作** - 尽可能复用已有节点

## Vue 2 的 Diff 算法

### 双端比较

Vue 2 使用**双端比较算法**（双指针）。

```typescript
function updateChildren(
  parentElm,
  oldCh,    // 旧子节点数组
  newCh,    // 新子节点数组
) {
  let oldStartIdx = 0              // 旧列表开始索引
  let oldEndIdx = oldCh.length - 1 // 旧列表结束索引
  let oldStartVnode = oldCh[0]     // 旧列表开始节点
  let oldEndVnode = oldCh[oldEndIdx] // 旧列表结束节点

  let newStartIdx = 0              // 新列表开始索引
  let newEndIdx = newCh.length - 1 // 新列表结束索引
  let newStartVnode = newCh[0]     // 新列表开始节点
  let newEndVnode = newCh[newEndIdx] // 新列表结束节点

  while (oldStartIdx <= oldEndIdx && newStartIdx <= newEndIdx) {
    if (isUndef(oldStartVnode)) {
      // 节点已被移动
      oldStartVnode = oldCh[++oldStartIdx]
    } else if (isUndef(oldEndVnode)) {
      oldEndVnode = oldCh[--oldEndIdx]
    }
    // 1. 旧开始 vs 新开始
    else if (sameVnode(oldStartVnode, newStartVnode)) {
      patchVnode(oldStartVnode, newStartVnode)
      oldStartVnode = oldCh[++oldStartIdx]
      newStartVnode = newCh[++newStartIdx]
    }
    // 2. 旧结束 vs 新结束
    else if (sameVnode(oldEndVnode, newEndVnode)) {
      patchVnode(oldEndVnode, newEndVnode)
      oldEndVnode = oldCh[--oldEndIdx]
      newEndVnode = newCh[--newEndIdx]
    }
    // 3. 旧开始 vs 新结束（节点右移）
    else if (sameVnode(oldStartVnode, newEndVnode)) {
      patchVnode(oldStartVnode, newEndVnode)
      nodeOps.insertBefore(parentElm, oldStartVnode.elm, nodeOps.nextSibling(oldEndVnode.elm))
      oldStartVnode = oldCh[++oldStartIdx]
      newEndVnode = newCh[--newEndIdx]
    }
    // 4. 旧结束 vs 新开始（节点左移）
    else if (sameVnode(oldEndVnode, newStartVnode)) {
      patchVnode(oldEndVnode, newStartVnode)
      nodeOps.insertBefore(parentElm, oldEndVnode.elm, oldStartVnode.elm)
      oldEndVnode = oldCh[--oldEndIdx]
      newStartVnode = newCh[++newStartIdx]
    }
    // 5. 使用 key 查找
    else {
      // 在旧节点中查找与新开始节点相同 key 的节点
      const idxInOld = findIdxInOld(newStartVnode, oldCh, oldStartIdx, oldEndIdx)
      
      if (isUndef(idxInOld)) {
        // 新节点，创建插入
        createElm(newStartVnode, parentElm, oldStartVnode.elm)
      } else {
        // 找到了，移动节点
        const vnodeToMove = oldCh[idxInOld]
        if (sameVnode(vnodeToMove, newStartVnode)) {
          patchVnode(vnodeToMove, newStartVnode)
          oldCh[idxInOld] = undefined
          nodeOps.insertBefore(parentElm, vnodeToMove.elm, oldStartVnode.elm)
        } else {
          // key 相同但是元素类型不同，创建新节点
          createElm(newStartVnode, parentElm, oldStartVnode.elm)
        }
      }
      newStartVnode = newCh[++newStartIdx]
    }
  }

  // 处理剩余节点
  if (oldStartIdx > oldEndIdx) {
    // 旧节点已全部处理，添加新节点
    addVnodes(parentElm, newCh, newStartIdx, newEndIdx)
  } else if (newStartIdx > newEndIdx) {
    // 新节点已全部处理，删除旧节点
    removeVnodes(oldCh, oldStartIdx, oldEndIdx)
  }
}
```

### 双端比较示例

```typescript
// 旧: [A, B, C, D]
// 新: [D, A, B, C]

// 第 1 轮比较:
// 旧: [A, B, C, D]
//      ↑        ↑
// 新: [D, A, B, C]
//      ↑        ↑
// 旧结束 D === 新开始 D ✓ → D 移到最前面

// 第 2 轮比较:
// 旧: [A, B, C]
//      ↑     ↑
// 新: [A, B, C]
//         ↑  ↑
// 旧开始 A === 新开始 A ✓ → 位置不变

// 第 3 轮比较:
// 旧: [B, C]
//      ↑  ↑
// 新: [B, C]
//         ↑
// 旧开始 B === 新开始 B ✓ → 位置不变

// 第 4 轮比较:
// 旧: [C]
//      ↑
// 新: [C]
//      ↑
// 旧开始 C === 新开始 C ✓ → 位置不变

// 完成: [D, A, B, C]
// DOM 操作: 1 次移动
```

## Vue 3 的 Diff 算法

### 快速 Diff 算法

Vue 3 采用了更快的 diff 算法，借鉴了 [inferno](https://github.com/infernojs/inferno) 和 [ivi](https://github.com/localvoid/ivi)。

### 核心优化策略

1. **编译时优化** - 静态标记（PatchFlag、Block）
2. **快速路径** - 处理常见的简单情况
3. **最长递增子序列** - 最小化移动操作

### 完整的 Diff 流程

```typescript
function patchKeyedChildren(
  c1: VNode[],           // 旧子节点
  c2: VNode[],           // 新子节点
  container: Element,
  parentAnchor: Node | null
) {
  let i = 0
  const l2 = c2.length
  let e1 = c1.length - 1  // 旧节点尾部索引
  let e2 = l2 - 1         // 新节点尾部索引

  // 1. 从头部开始同步（sync from start）
  // (a b) c
  // (a b) d e
  while (i <= e1 && i <= e2) {
    const n1 = c1[i]
    const n2 = c2[i]
    if (isSameVNodeType(n1, n2)) {
      patch(n1, n2, container)
    } else {
      break
    }
    i++
  }

  // 2. 从尾部开始同步（sync from end）
  // a (b c)
  // d e (b c)
  while (i <= e1 && i <= e2) {
    const n1 = c1[e1]
    const n2 = c2[e2]
    if (isSameVNodeType(n1, n2)) {
      patch(n1, n2, container)
    } else {
      break
    }
    e1--
    e2--
  }

  // 3. 同序列挂载（common sequence + mount）
  // (a b)
  // (a b) c
  // i = 2, e1 = 1, e2 = 2
  if (i > e1) {
    if (i <= e2) {
      const nextPos = e2 + 1
      const anchor = nextPos < l2 ? c2[nextPos].el : parentAnchor
      while (i <= e2) {
        patch(null, c2[i], container, anchor)
        i++
      }
    }
  }

  // 4. 同序列卸载（common sequence + unmount）
  // (a b) c
  // (a b)
  // i = 2, e1 = 2, e2 = 1
  else if (i > e2) {
    while (i <= e1) {
      unmount(c1[i])
      i++
    }
  }

  // 5. 未知序列（unknown sequence）
  // [i ... e1 + 1]: a b [c d e] f g
  // [i ... e2 + 1]: a b [e d c h] f g
  // i = 2, e1 = 4, e2 = 5
  else {
    const s1 = i  // 旧节点开始索引
    const s2 = i  // 新节点开始索引

    // 5.1 为新子节点构建 key:index 映射
    const keyToNewIndexMap: Map<string | number, number> = new Map()
    for (i = s2; i <= e2; i++) {
      const nextChild = c2[i]
      if (nextChild.key != null) {
        keyToNewIndexMap.set(nextChild.key, i)
      }
    }

    // 5.2 遍历旧子节点，尝试 patch 匹配的节点并移除不存在的节点
    let j
    let patched = 0
    const toBePatched = e2 - s2 + 1  // 需要 patch 的节点数量
    let moved = false                 // 是否有节点需要移动
    let maxNewIndexSoFar = 0          // 用于判断是否需要移动

    // 用于存储新节点在旧节点中的位置
    // 新节点索引 → 旧节点索引 + 1（0 表示新增节点）
    const newIndexToOldIndexMap = new Array(toBePatched)
    for (i = 0; i < toBePatched; i++) newIndexToOldIndexMap[i] = 0

    for (i = s1; i <= e1; i++) {
      const prevChild = c1[i]
      
      // 如果已经 patch 的节点数量超过需要 patch 的数量
      // 说明剩下的都是要删除的
      if (patched >= toBePatched) {
        unmount(prevChild)
        continue
      }

      // 查找旧节点在新节点中的位置
      let newIndex
      if (prevChild.key != null) {
        newIndex = keyToNewIndexMap.get(prevChild.key)
      } else {
        // 没有 key，尝试查找相同类型的节点
        for (j = s2; j <= e2; j++) {
          if (
            newIndexToOldIndexMap[j - s2] === 0 &&
            isSameVNodeType(prevChild, c2[j])
          ) {
            newIndex = j
            break
          }
        }
      }

      if (newIndex === undefined) {
        // 旧节点不存在于新节点中，删除
        unmount(prevChild)
      } else {
        // 记录位置映射
        newIndexToOldIndexMap[newIndex - s2] = i + 1
        
        // 判断是否需要移动
        // 如果新节点的索引一直递增，说明不需要移动
        if (newIndex >= maxNewIndexSoFar) {
          maxNewIndexSoFar = newIndex
        } else {
          moved = true
        }
        
        // patch 节点
        patch(prevChild, c2[newIndex], container)
        patched++
      }
    }

    // 5.3 移动和挂载
    // 生成最长递增子序列（需要移动时）
    const increasingNewIndexSequence = moved
      ? getSequence(newIndexToOldIndexMap)
      : []
    
    j = increasingNewIndexSequence.length - 1
    
    // 从后向前遍历，以便使用已处理的节点作为锚点
    for (i = toBePatched - 1; i >= 0; i--) {
      const nextIndex = s2 + i
      const nextChild = c2[nextIndex]
      const anchor = nextIndex + 1 < l2 ? c2[nextIndex + 1].el : parentAnchor

      if (newIndexToOldIndexMap[i] === 0) {
        // 新增节点
        patch(null, nextChild, container, anchor)
      } else if (moved) {
        // 需要移动
        if (j < 0 || i !== increasingNewIndexSequence[j]) {
          // 不在最长递增子序列中，需要移动
          move(nextChild, container, anchor)
        } else {
          // 在最长递增子序列中，不需要移动
          j--
        }
      }
    }
  }
}
```

### 最长递增子序列（LIS）

最长递增子序列算法用于找出哪些节点不需要移动。

```typescript
// 求最长递增子序列
function getSequence(arr: number[]): number[] {
  const p = arr.slice()        // 用于追踪前驱索引
  const result = [0]           // 存储最长递增子序列的索引
  let i, j, u, v, c
  const len = arr.length

  for (i = 0; i < len; i++) {
    const arrI = arr[i]
    if (arrI !== 0) {
      j = result[result.length - 1]
      // 如果当前值大于结果数组的最后一个值
      if (arr[j] < arrI) {
        p[i] = j              // 记录前驱
        result.push(i)
        continue
      }
      
      // 二分查找，找到第一个大于 arrI 的位置
      u = 0
      v = result.length - 1
      while (u < v) {
        c = (u + v) >> 1
        if (arr[result[c]] < arrI) {
          u = c + 1
        } else {
          v = c
        }
      }
      
      if (arrI < arr[result[u]]) {
        if (u > 0) {
          p[i] = result[u - 1]
        }
        result[u] = i
      }
    }
  }

  // 回溯构建最长递增子序列
  u = result.length
  v = result[u - 1]
  while (u-- > 0) {
    result[u] = v
    v = p[v]
  }

  return result
}

// 示例
const arr = [2, 3, 1, 5, 6, 4, 8, 9, 7]
const lis = getSequence(arr)
console.log(lis) // [2, 3, 5, 6, 8, 9] 对应的索引
// 最长递增子序列：[1, 5, 6, 8, 9]
```

### LIS 在 Diff 中的应用

```typescript
// 旧: [A, B, C, D, E, F, G]
// 新: [A, B, E, C, D, H, F, G]

// 前置和后置相同节点处理后
// 旧: [C, D, E, F]  索引: [2, 3, 4, 5]
// 新: [E, C, D, H, F]

// 构建新节点在旧节点中的位置映射
// newIndexToOldIndexMap = [4, 2, 3, 0, 5]
//                         E  C  D  H  F
// (4 表示 E 在旧数组索引 4-1=3 的位置，0 表示 H 是新增节点)

// 求最长递增子序列（去掉 0）
// [4, 2, 3, 5] → LIS 索引: [1, 2, 3]
// 对应 newIndexToOldIndexMap 中索引 1,2,3 的节点: C, D, F
// 这些节点的相对顺序不变，不需要移动

// 需要移动的节点: E（不在 LIS 中）
// 需要新增的节点: H（值为 0）

// 最终操作:
// 1. 移动 E 到 C 前面
// 2. 新增 H
// 3. C, D, F 位置不变（最长递增子序列）
```

## key 的作用

### 为什么需要 key

```vue
<!-- ❌ 不使用 key -->
<div v-for="item in items">
  {{ item.text }}
</div>

<!-- 当列表更新时，Vue 无法准确判断哪些节点可以复用 -->
```

```vue
<!-- ✅ 使用 key -->
<div v-for="item in items" :key="item.id">
  {{ item.text }}
</div>

<!-- Vue 可以准确追踪每个节点的身份 -->
```

### key 的作用

1. **提高复用率** - 准确判断节点是否可以复用
2. **减少操作** - 避免不必要的 DOM 销毁和创建
3. **保持状态** - 组件状态和 DOM 状态得以保留

### 错误的 key 使用

```vue
<!-- ❌ 使用索引作为 key -->
<div v-for="(item, index) in items" :key="index">
  <input v-model="item.text" />
</div>

<!-- 问题：当列表顺序改变时，索引对应的节点改变 -->
<!-- 旧: [A(0), B(1), C(2)] -->
<!-- 新: [C(0), A(1), B(2)] -->
<!-- Vue 会认为节点没变，只是内容变了，导致输入框状态错误 -->
```

```vue
<!-- ✅ 使用唯一 ID 作为 key -->
<div v-for="item in items" :key="item.id">
  <input v-model="item.text" />
</div>

<!-- Vue 能正确识别节点移动，保持输入框状态 -->
```

### key 对比示例

```typescript
// 不使用 key
// 旧: [A, B, C]
// 新: [C, B, A]
// 
// Diff 过程：
// - 比较位置 0: A vs C，不同，更新内容 A → C
// - 比较位置 1: B vs B，相同，不更新
// - 比较位置 2: C vs A，不同，更新内容 C → A
// 结果：2 次 DOM 更新

// 使用 key
// 旧: [A(key:1), B(key:2), C(key:3)]
// 新: [C(key:3), B(key:2), A(key:1)]
//
// Diff 过程：
// - 通过 key 找到对应关系
// - C 移到最前
// - A 移到最后
// - B 位置不变
// 结果：2 次 DOM 移动（复用节点）
```

## Vue 2 vs Vue 3 Diff 对比

| 特性           | Vue 2      | Vue 3              |
| -------------- | ---------- | ------------------ |
| **算法**       | 双端比较   | 快速 Diff + LIS    |
| **时间复杂度** | O(n)       | O(n)               |
| **编译优化**   | 无         | PatchFlag + Block  |
| **静态节点**   | 每次都比较 | 静态提升，跳过比较 |
| **移动优化**   | 四次判断   | 最长递增子序列     |
| **性能**       | 较好       | 更优               |

### 性能对比示例

```typescript
// 测试场景：列表反转
// 旧: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
// 新: [10, 9, 8, 7, 6, 5, 4, 3, 2, 1]

// Vue 2 双端比较:
// - 需要多次四向比较
// - 约 50+ 次比较操作

// Vue 3 快速 Diff:
// - 前后缀优化后，使用 LIS
// - 找到最长递增子序列
// - 约 30+ 次比较操作
// 性能提升 30-40%
```

## 实战优化技巧

### 1. 合理使用 key

```vue
<!-- ✅ 列表项有唯一 ID -->
<div v-for="user in users" :key="user.id">
  {{ user.name }}
</div>

<!-- ⚠️ 列表顺序不会改变，可以用索引 -->
<div v-for="(tab, index) in tabs" :key="index">
  {{ tab.label }}
</div>

<!-- ❌ 列表顺序会改变，不要用索引 -->
<div v-for="(item, index) in sortedItems" :key="index">
  <input v-model="item.value" />
</div>
```

### 2. 使用静态标记

```vue
<!-- 利用编译优化 -->
<template>
  <div>
    <!-- 静态节点会被提升 -->
    <h1>Title</h1>
    <p>Static text</p>
    
    <!-- 只有这个会被标记为动态 -->
    <span>{{ dynamicText }}</span>
  </div>
</template>
```

### 3. v-once 优化静态内容

```vue
<template>
  <div>
    <!-- 只渲染一次，后续更新跳过 -->
    <div v-once>
      <h1>{{ expensiveComputation() }}</h1>
      <p>This content never changes</p>
    </div>
  </div>
</template>
```

### 4. 使用 v-memo 缓存子树

```vue
<template>
  <div v-for="item in list" :key="item.id" v-memo="[item.id, item.name]">
    <!-- 只有 item.id 或 item.name 变化时才重新渲染 -->
    <ComplexComponent :item="item" />
  </div>
</template>
```

### 5. 避免不必要的嵌套

```vue
<!-- ❌ 不好 -->
<template>
  <div>
    <div v-for="item in items" :key="item.id">
      <div>
        <div>
          <span>{{ item.text }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<!-- ✅ 好 -->
<template>
  <div>
    <span v-for="item in items" :key="item.id">
      {{ item.text }}
    </span>
  </div>
</template>
```

## Diff 算法调试

### 使用 onTrack 和 onTrigger

```vue
<script setup>
import { ref, watchEffect } from 'vue'

const items = ref([1, 2, 3])

watchEffect(
  () => {
    console.log('Items:', items.value)
  },
  {
    onTrack(e) {
      console.log('Tracked:', e)
    },
    onTrigger(e) {
      console.log('Triggered:', e)
    }
  }
)
</script>
```

### Vue DevTools

```typescript
// Vue DevTools 可以查看：
// 1. 组件树的变化
// 2. 哪些组件重新渲染了
// 3. 渲染性能
// 4. 虚拟 DOM 树
```

## 总结

Vue 3 的 Diff 算法优化：

1. **编译时优化** - PatchFlag、Block、静态提升
2. **快速路径** - 前后缀优化，快速处理简单情况
3. **最长递增子序列** - 最小化节点移动
4. **更好的性能** - 相比 Vue 2 提升 30-40%

### 核心要点

```typescript
// Diff 算法的本质
// 1. 同层比较（深度优先遍历）
// 2. 类型判断（不同类型直接替换）
// 3. key 标识（准确复用节点）
// 4. 最小化 DOM 操作（通过算法优化）

// Vue 3 的优化
// 1. 编译时：静态提升 + PatchFlag
// 2. 运行时：快速 Diff + LIS
// 3. 结果：更少的比较 + 更少的 DOM 操作
```

理解 Diff 算法原理，能帮助我们：
- 正确使用 key
- 避免性能陷阱
- 编写更高效的组件
- 优化大列表渲染
- 理解 Vue 的更新机制

