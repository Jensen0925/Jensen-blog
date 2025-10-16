# React Diff 算法

## 什么是 Diff 算法

Diff 算法是 React 用来比较两棵虚拟 DOM 树的差异，并找出最小的更新操作的算法。通过 Diff 算法，React 可以高效地更新真实 DOM，避免不必要的操作。

## 为什么需要 Diff 算法

直接操作 DOM 是昂贵的，因为：

- DOM 操作会触发浏览器的重排（reflow）和重绘（repaint）
- 频繁的 DOM 操作会导致性能下降
- 完全重建 DOM 树的代价太大

React 通过 Diff 算法，只更新发生变化的部分，从而提高性能。

## 传统 Diff 算法的问题

传统的树对比算法（如 Edit Distance）的时间复杂度是 **O(n³)**，其中 n 是树中节点的数量。对于前端应用来说，这个复杂度是无法接受的。

```
假设有 1000 个节点：
O(n³) = 1000³ = 1,000,000,000 次操作
```

## React Diff 算法的优化策略

React 基于以下三个假设，将 Diff 算法的复杂度降到了 **O(n)**：

### 1. 不同类型的元素会产生不同的树

如果元素的类型不同，React 会直接销毁旧树并创建新树，不会尝试复用。

```jsx
// 旧树
<div>
  <Counter />
</div>

// 新树
<span>
  <Counter />
</span>

// React 会：
// 1. 销毁 div 及其子树（包括 Counter）
// 2. 创建新的 span 及其子树
```

### 2. 通过 key 属性来标识哪些子元素在不同渲染中保持稳定

```jsx
// 没有 key
<ul>
  <li>first</li>
  <li>second</li>
</ul>

// 在头部插入新元素
<ul>
  <li>zero</li>
  <li>first</li>
  <li>second</li>
</ul>

// 如果没有 key，React 会认为：
// - 第一个 li 从 "first" 变成了 "zero"
// - 第二个 li 从 "second" 变成了 "first"
// - 新增了第三个 li "second"
// 结果：所有 li 都需要更新
```

```jsx
// 使用 key
<ul>
  <li key="first">first</li>
  <li key="second">second</li>
</ul>

// 在头部插入新元素
<ul>
  <li key="zero">zero</li>
  <li key="first">first</li>
  <li key="second">second</li>
</ul>

// 有了 key，React 知道：
// - key="first" 和 key="second" 的元素只是移动了位置
// - 只有 key="zero" 是新增的
// 结果：只需要插入一个新元素
```

### 3. 同层级比较

React 只会比较同一层级的节点，不会跨层级比较。

```
旧树：          新树：
  A               A
 / \             / \
B   C           D   E
   /             \
  D               B

React 的处理：
1. 比较第一层：A 和 A 相同
2. 比较第二层：B、C 和 D、E
   - 删除 B 和 C
   - 创建 D 和 E
3. 不会尝试复用跨层级移动的节点
```

## Diff 算法的核心流程

### 1. 单节点 Diff

当新的子节点只有一个时：

```javascript
function reconcileSingleElement(
  returnFiber,
  currentFirstChild,
  element
) {
  const key = element.key;
  let child = currentFirstChild;
  
  // 遍历所有旧的子节点
  while (child !== null) {
    // 比较 key
    if (child.key === key) {
      // key 相同，比较 type
      if (child.type === element.type) {
        // type 也相同，可以复用
        deleteRemainingChildren(returnFiber, child.sibling);
        
        const existing = useFiber(child, element.props);
        existing.return = returnFiber;
        return existing;
      }
      
      // key 相同但 type 不同，删除所有旧节点
      deleteRemainingChildren(returnFiber, child);
      break;
    } else {
      // key 不同，删除当前节点，继续找
      deleteChild(returnFiber, child);
    }
    
    child = child.sibling;
  }
  
  // 没有找到可复用的节点，创建新节点
  const created = createFiberFromElement(element);
  created.return = returnFiber;
  return created;
}
```

### 2. 多节点 Diff

当新的子节点有多个时，Diff 算法分为三轮遍历：

#### 第一轮：处理相同位置的节点

```javascript
function reconcileChildrenArray(
  returnFiber,
  currentFirstChild,
  newChildren
) {
  let oldFiber = currentFirstChild;
  let newIdx = 0;
  let lastPlacedIndex = 0;
  
  // 第一轮遍历：处理更新的节点
  for (; oldFiber !== null && newIdx < newChildren.length; newIdx++) {
    const newChild = newChildren[newIdx];
    
    // 如果 key 不同，跳出循环
    if (oldFiber.key !== newChild.key) {
      break;
    }
    
    // key 相同，检查是否可以复用
    if (oldFiber.type === newChild.type) {
      // 可以复用
      const existing = useFiber(oldFiber, newChild.props);
      existing.index = newIdx;
      existing.return = returnFiber;
      lastPlacedIndex = placeChild(existing, lastPlacedIndex, newIdx);
    } else {
      // 不能复用，创建新节点
      const created = createFiber(newChild);
      created.index = newIdx;
      created.return = returnFiber;
    }
    
    oldFiber = oldFiber.sibling;
  }
  
  // 如果新节点已经遍历完，删除剩余的旧节点
  if (newIdx === newChildren.length) {
    deleteRemainingChildren(returnFiber, oldFiber);
    return;
  }
  
  // 如果旧节点已经遍历完，创建剩余的新节点
  if (oldFiber === null) {
    for (; newIdx < newChildren.length; newIdx++) {
      const created = createFiber(newChildren[newIdx]);
      created.index = newIdx;
      created.return = returnFiber;
    }
    return;
  }
  
  // 进入第二轮和第三轮遍历...
}
```

#### 第二轮：处理节点移动

```javascript
// 第二轮：将剩余的旧节点放入 Map
const existingChildren = new Map();
let existingChild = oldFiber;

while (existingChild !== null) {
  if (existingChild.key !== null) {
    existingChildren.set(existingChild.key, existingChild);
  } else {
    existingChildren.set(existingChild.index, existingChild);
  }
  existingChild = existingChild.sibling;
}

// 第三轮：遍历剩余的新节点
for (; newIdx < newChildren.length; newIdx++) {
  const newChild = newChildren[newIdx];
  
  // 从 Map 中查找可复用的节点
  const matchedFiber = existingChildren.get(
    newChild.key !== null ? newChild.key : newIdx
  );
  
  if (matchedFiber !== undefined) {
    // 找到可复用的节点
    if (matchedFiber.type === newChild.type) {
      // 类型相同，复用
      existingChildren.delete(
        newChild.key !== null ? newChild.key : newIdx
      );
      
      const existing = useFiber(matchedFiber, newChild.props);
      existing.index = newIdx;
      existing.return = returnFiber;
      
      // 判断是否需要移动
      if (matchedFiber.index < lastPlacedIndex) {
        // 需要移动
        existing.flags |= Placement;
      } else {
        // 不需要移动
        lastPlacedIndex = matchedFiber.index;
      }
    }
  } else {
    // 没有找到可复用的节点，创建新节点
    const created = createFiber(newChild);
    created.index = newIdx;
    created.return = returnFiber;
    created.flags |= Placement;
  }
}

// 删除 Map 中剩余的旧节点
existingChildren.forEach(child => {
  deleteChild(returnFiber, child);
});
```

### 3. 移动判断的关键：lastPlacedIndex

`lastPlacedIndex` 是已遍历的新节点中，在旧节点中索引最大的那个节点的索引。

```javascript
// 示例：
旧节点：A(0) B(1) C(2) D(3)
新节点：C(2) A(0) B(1) D(3)

遍历过程：
1. C: oldIndex=2, lastPlacedIndex=0
   2 >= 0，不需要移动，lastPlacedIndex=2

2. A: oldIndex=0, lastPlacedIndex=2
   0 < 2，需要移动（向右移动）

3. B: oldIndex=1, lastPlacedIndex=2
   1 < 2，需要移动（向右移动）

4. D: oldIndex=3, lastPlacedIndex=2
   3 >= 2，不需要移动，lastPlacedIndex=3

结果：A 和 B 需要移动到 C 的后面
```

## Diff 算法的详细示例

### 示例 1：节点更新

```jsx
// 旧树
<div>
  <span>Hello</span>
</div>

// 新树
<div>
  <span>World</span>
</div>

// Diff 过程：
// 1. div 类型相同，复用
// 2. span 类型相同，复用
// 3. 文本内容不同，更新文本节点
// 结果：只更新文本内容
```

### 示例 2：节点插入

```jsx
// 旧树
<ul>
  <li key="a">A</li>
  <li key="b">B</li>
</ul>

// 新树
<ul>
  <li key="a">A</li>
  <li key="b">B</li>
  <li key="c">C</li>
</ul>

// Diff 过程：
// 第一轮：
// - li(a) 匹配，复用
// - li(b) 匹配，复用
// 第二轮：
// - 旧节点遍历完了
// 第三轮：
// - 创建新的 li(c)
// 结果：插入一个新节点
```

### 示例 3：节点删除

```jsx
// 旧树
<ul>
  <li key="a">A</li>
  <li key="b">B</li>
  <li key="c">C</li>
</ul>

// 新树
<ul>
  <li key="a">A</li>
  <li key="b">B</li>
</ul>

// Diff 过程：
// 第一轮：
// - li(a) 匹配，复用
// - li(b) 匹配，复用
// 第二轮：
// - 新节点遍历完了，删除剩余的旧节点 li(c)
// 结果：删除一个节点
```

### 示例 4：节点移动

```jsx
// 旧树
<ul>
  <li key="a">A</li>
  <li key="b">B</li>
  <li key="c">C</li>
  <li key="d">D</li>
</ul>

// 新树
<ul>
  <li key="d">D</li>
  <li key="a">A</li>
  <li key="b">B</li>
  <li key="c">C</li>
</ul>

// Diff 过程：
// 第一轮：
// - li(d).key !== li(a).key，跳出第一轮
// 
// 第二轮：
// - 建立 Map: { a: Fiber(a,0), b: Fiber(b,1), c: Fiber(c,2), d: Fiber(d,3) }
//
// 第三轮：
// - 处理 li(d): oldIndex=3, lastPlacedIndex=0
//   3 >= 0，不移动，lastPlacedIndex=3
//
// - 处理 li(a): oldIndex=0, lastPlacedIndex=3
//   0 < 3，需要移动
//
// - 处理 li(b): oldIndex=1, lastPlacedIndex=3
//   1 < 3，需要移动
//
// - 处理 li(c): oldIndex=2, lastPlacedIndex=3
//   2 < 3，需要移动
//
// 结果：A、B、C 需要移动到 D 后面
```

### 示例 5：复杂场景

```jsx
// 旧树
<ul>
  <li key="a">A</li>
  <li key="b">B</li>
  <li key="c">C</li>
  <li key="d">D</li>
</ul>

// 新树
<ul>
  <li key="b">B</li>
  <li key="c">C</li>
  <li key="e">E</li>
  <li key="d">D</li>
</ul>

// Diff 过程：
// 第一轮：
// - li(b).key !== li(a).key，跳出
//
// 第二轮：
// - 建立 Map: { a: Fiber(a,0), b: Fiber(b,1), c: Fiber(c,2), d: Fiber(d,3) }
//
// 第三轮：
// - 处理 li(b): oldIndex=1, lastPlacedIndex=0
//   1 >= 0，不移动，lastPlacedIndex=1
//
// - 处理 li(c): oldIndex=2, lastPlacedIndex=1
//   2 >= 1，不移动，lastPlacedIndex=2
//
// - 处理 li(e): 在 Map 中找不到，创建新节点
//
// - 处理 li(d): oldIndex=3, lastPlacedIndex=2
//   3 >= 2，不移动，lastPlacedIndex=3
//
// - 删除 Map 中剩余的 li(a)
//
// 结果：删除 A，在 C 和 D 之间插入 E
```

## Key 的重要性

### 为什么需要 key？

```jsx
// 没有 key 的情况
<ul>
  {items.map(item => (
    <li>{item.text}</li>
  ))}
</ul>

// React 会：
// 1. 按顺序比较
// 2. 如果列表顺序改变，会导致不必要的更新
```

### Key 的最佳实践

#### ✅ 好的做法

```jsx
// 使用稳定的、唯一的 ID
<ul>
  {users.map(user => (
    <li key={user.id}>
      <UserProfile user={user} />
    </li>
  ))}
</ul>
```

#### ❌ 不好的做法

```jsx
// 1. 使用索引作为 key（列表顺序可能改变时）
<ul>
  {items.map((item, index) => (
    <li key={index}>{item.text}</li>
  ))}
</ul>

// 2. 使用不稳定的值
<ul>
  {items.map(item => (
    <li key={Math.random()}>{item.text}</li>
  ))}
</ul>

// 3. 使用对象或数组作为 key
<ul>
  {items.map(item => (
    <li key={item}>{item.text}</li>
  ))}
</ul>
```

### 使用索引作为 key 的问题

```jsx
function TodoList() {
  const [todos, setTodos] = useState([
    { text: 'Learn React', done: false },
    { text: 'Learn Vue', done: false },
  ]);
  
  // 使用索引作为 key
  return (
    <ul>
      {todos.map((todo, index) => (
        <li key={index}>
          <input type="checkbox" checked={todo.done} />
          <span>{todo.text}</span>
        </li>
      ))}
    </ul>
  );
}

// 问题：
// 1. 在列表头部插入新项时：
//    旧：[0: Learn React, 1: Learn Vue]
//    新：[0: New Todo, 1: Learn React, 2: Learn Vue]
//    React 会认为：
//    - 索引 0 的内容从 "Learn React" 变成了 "New Todo"
//    - 索引 1 的内容从 "Learn Vue" 变成了 "Learn React"
//    - 新增了索引 2 "Learn Vue"
//    结果：所有项都会重新渲染，checkbox 状态会错乱

// 2. 正确做法：使用唯一 ID
<ul>
  {todos.map(todo => (
    <li key={todo.id}>
      <input type="checkbox" checked={todo.done} />
      <span>{todo.text}</span>
    </li>
  ))}
</ul>
```

## Diff 算法的性能优化

### 1. 使用 PureComponent 或 React.memo

```jsx
// 使用 React.memo 避免不必要的重新渲染
const ExpensiveComponent = React.memo(({ data }) => {
  return <div>{/* 复杂的渲染逻辑 */}</div>;
});

// 只有 data 改变时才会重新渲染
```

### 2. 使用 useMemo 缓存计算结果

```jsx
function List({ items, filter }) {
  // 缓存过滤后的结果
  const filteredItems = useMemo(() => {
    return items.filter(item => item.category === filter);
  }, [items, filter]);
  
  return (
    <ul>
      {filteredItems.map(item => (
        <li key={item.id}>{item.name}</li>
      ))}
    </ul>
  );
}
```

### 3. 合理使用 key

```jsx
// 场景：Tab 切换
function Tabs() {
  const [activeTab, setActiveTab] = useState('tab1');
  
  return (
    <div>
      <TabContent key={activeTab} tab={activeTab} />
    </div>
  );
}

// 使用 tab 作为 key，切换 tab 时会重新挂载组件
// 这样可以重置组件的状态
```

### 4. 避免在渲染中创建新对象

```jsx
// ❌ 不好的做法
function Parent() {
  return <Child style={{ color: 'red' }} />;
  // 每次渲染都会创建新的 style 对象
}

// ✅ 好的做法
const style = { color: 'red' };
function Parent() {
  return <Child style={style} />;
}

// 或者使用 useMemo
function Parent() {
  const style = useMemo(() => ({ color: 'red' }), []);
  return <Child style={style} />;
}
```

## React 18 中的 Diff 改进

React 18 引入了自动批处理（Automatic Batching）和并发渲染（Concurrent Rendering），这些特性对 Diff 算法有影响：

### 1. 自动批处理

```jsx
function App() {
  const [count, setCount] = useState(0);
  const [flag, setFlag] = useState(false);
  
  function handleClick() {
    // React 18 会自动批处理这些更新
    setCount(c => c + 1);
    setFlag(f => !f);
    // 只会触发一次 Diff 和重新渲染
  }
  
  return (
    <div>
      <button onClick={handleClick}>Next</button>
      <h1 style={{ color: flag ? 'blue' : 'black' }}>{count}</h1>
    </div>
  );
}
```

### 2. 并发渲染

```jsx
function App() {
  const [text, setText] = useState('');
  const [items, setItems] = useState([]);
  
  function handleChange(e) {
    // 高优先级更新
    setText(e.target.value);
    
    // 低优先级更新
    startTransition(() => {
      setItems(filterItems(e.target.value));
    });
  }
  
  // React 会：
  // 1. 立即处理 text 的更新
  // 2. 可以打断 items 的 Diff 过程
  // 3. 保持输入框的响应性
}
```

## 总结

React Diff 算法的核心特点：

1. **O(n) 的时间复杂度**
   - 只比较同层节点
   - 不跨层级比较

2. **基于 key 的优化**
   - 通过 key 识别节点
   - 避免不必要的销毁和创建

3. **三轮遍历策略**
   - 第一轮：处理相同位置的节点
   - 第二轮：建立 Map
   - 第三轮：处理剩余节点

4. **移动判断**
   - 使用 lastPlacedIndex
   - 最小化 DOM 操作

理解 Diff 算法有助于：
- 写出更高性能的 React 代码
- 正确使用 key 属性
- 优化列表渲染
- 理解 React 的更新机制

## 相关阅读

- [React Fiber 原理](/react/fiber)
- [React Reconciler](/react/reconciler)
- [React 性能优化](/react/hooks#性能优化)

