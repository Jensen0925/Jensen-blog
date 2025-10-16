# React Fiber 原理

## 什么是 Fiber

Fiber 是 React 16 引入的新的协调引擎（Reconciliation Engine），它是 React 核心算法的重新实现。Fiber 的主要目标是实现**增量渲染**（incremental rendering），即将渲染工作分割成多个小块，并能够暂停、中止或重用工作。

## 为什么需要 Fiber

在 React 16 之前，React 的调和算法采用递归的方式遍历整个虚拟 DOM 树，这个过程是**同步且不可中断**的。这会导致以下问题：

- **长时间占用主线程**：如果组件树很大，递归遍历会花费较长时间
- **阻塞用户交互**：在渲染期间，浏览器无法响应用户输入
- **动画卡顿**：无法及时处理动画帧，导致页面卡顿
- **无法区分任务优先级**：所有更新都是同等重要的

## Fiber 的核心思想

### 1. 可中断的渲染

Fiber 将渲染工作分解为多个小的工作单元（unit of work），每完成一个工作单元后，React 会检查是否有更高优先级的任务需要处理，如果有就暂停当前工作。

```javascript
// 伪代码示例
function workLoop(deadline) {
  let shouldYield = false;
  
  while (nextUnitOfWork && !shouldYield) {
    // 执行一个工作单元
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork);
    
    // 检查是否需要让出控制权
    shouldYield = deadline.timeRemaining() < 1;
  }
  
  // 如果还有工作要做，继续调度
  if (nextUnitOfWork) {
    requestIdleCallback(workLoop);
  }
}

requestIdleCallback(workLoop);
```

### 2. 任务优先级

Fiber 引入了任务优先级的概念，不同类型的更新有不同的优先级：

- **Immediate**（立即）：用户输入等需要立即响应的任务
- **UserBlocking**（用户阻塞）：用户交互，如点击、滚动
- **Normal**（普通）：网络请求、动画
- **Low**（低优先级）：分析统计
- **Idle**（空闲）：不需要立即完成的任务

```javascript
// 优先级示例
const priorities = {
  ImmediatePriority: 1,
  UserBlockingPriority: 2,
  NormalPriority: 3,
  LowPriority: 4,
  IdlePriority: 5,
};
```

### 3. 增量渲染

Fiber 将渲染过程分为两个阶段：

#### Render 阶段（可中断）

- 构建 Fiber 树
- 标记需要更新的节点
- 可以被打断和恢复
- 这个阶段是纯粹的计算，没有副作用

#### Commit 阶段（不可中断）

- 将变更应用到 DOM
- 执行生命周期方法
- 必须同步完成，不能被打断
- 这个阶段会产生副作用

```javascript
// React 工作流程
function performWork() {
  // Render 阶段：构建 Fiber 树，可中断
  workInProgress = createWorkInProgress(current);
  
  while (workInProgress && !shouldYield()) {
    workInProgress = performUnitOfWork(workInProgress);
  }
  
  // Commit 阶段：应用变更，不可中断
  if (workInProgress === null) {
    commitRoot();
  }
}
```

## Fiber 的数据结构

每个 Fiber 节点是一个 JavaScript 对象，包含了组件的类型、props、state 等信息：

```javascript
type Fiber = {
  // 标识 Fiber 类型的标签
  tag: WorkTag,
  
  // 唯一标识符
  key: null | string,
  
  // 元素类型
  type: any,
  
  // 与此 Fiber 关联的本地状态
  stateNode: any,
  
  // 指向父节点
  return: Fiber | null,
  
  // 指向第一个子节点
  child: Fiber | null,
  
  // 指向下一个兄弟节点
  sibling: Fiber | null,
  
  // 输入的 props
  pendingProps: any,
  
  // 上一次渲染时的 props
  memoizedProps: any,
  
  // 上一次渲染时的 state
  memoizedState: any,
  
  // 副作用标记
  flags: Flags,
  
  // 副作用链表
  nextEffect: Fiber | null,
  
  // 对应的旧 Fiber（current tree）
  alternate: Fiber | null,
  
  // 优先级
  lanes: Lanes,
};
```

## Fiber 树的遍历

Fiber 使用**深度优先遍历**算法来遍历 Fiber 树：

```javascript
function performUnitOfWork(fiber) {
  // 1. 处理当前节点
  beginWork(fiber);
  
  // 2. 如果有子节点，返回第一个子节点
  if (fiber.child) {
    return fiber.child;
  }
  
  // 3. 如果没有子节点，完成当前节点的工作
  let nextFiber = fiber;
  while (nextFiber) {
    completeWork(nextFiber);
    
    // 4. 如果有兄弟节点，返回兄弟节点
    if (nextFiber.sibling) {
      return nextFiber.sibling;
    }
    
    // 5. 如果没有兄弟节点，返回父节点
    nextFiber = nextFiber.return;
  }
  
  return null;
}
```

遍历顺序示例：

```
     A
   /   \
  B     C
 / \
D   E

遍历顺序：A → B → D → E → C
```

## 双缓冲技术

React 使用**双缓冲技术**来实现 Fiber 树的更新：

- **current 树**：当前屏幕上显示的 Fiber 树
- **workInProgress 树**：正在内存中构建的 Fiber 树

```javascript
// 双缓冲示例
function createWorkInProgress(current) {
  let workInProgress = current.alternate;
  
  if (workInProgress === null) {
    // 首次渲染，创建新的 Fiber
    workInProgress = createFiber(
      current.tag,
      current.pendingProps,
      current.key,
      current.mode
    );
    
    workInProgress.alternate = current;
    current.alternate = workInProgress;
  } else {
    // 复用已有的 Fiber
    workInProgress.pendingProps = current.pendingProps;
    workInProgress.flags = NoFlags;
    workInProgress.nextEffect = null;
  }
  
  // 复制属性
  workInProgress.child = current.child;
  workInProgress.memoizedProps = current.memoizedProps;
  workInProgress.memoizedState = current.memoizedState;
  
  return workInProgress;
}
```

当更新完成后，workInProgress 树会成为新的 current 树：

```javascript
function commitRoot() {
  // 将 workInProgress 树应用到 DOM
  commitWork(workInProgress);
  
  // 切换指针，workInProgress 成为新的 current
  root.current = workInProgress;
}
```

## Fiber 的工作流程

### 1. beginWork

`beginWork` 负责创建或更新 Fiber 节点：

```javascript
function beginWork(current, workInProgress, renderLanes) {
  // 如果 props 和 type 都没变，尝试复用
  if (current !== null) {
    const oldProps = current.memoizedProps;
    const newProps = workInProgress.pendingProps;
    
    if (oldProps === newProps && !hasContextChanged()) {
      // 可以复用，跳过更新
      return bailoutOnAlreadyFinishedWork(current, workInProgress);
    }
  }
  
  // 根据 tag 类型处理不同的组件
  switch (workInProgress.tag) {
    case FunctionComponent:
      return updateFunctionComponent(current, workInProgress);
    case ClassComponent:
      return updateClassComponent(current, workInProgress);
    case HostComponent:
      return updateHostComponent(current, workInProgress);
    // ...其他类型
  }
}
```

### 2. completeWork

`completeWork` 负责完成 Fiber 节点的处理，创建或更新 DOM：

```javascript
function completeWork(current, workInProgress) {
  const newProps = workInProgress.pendingProps;
  
  switch (workInProgress.tag) {
    case HostComponent: {
      if (current !== null && workInProgress.stateNode != null) {
        // 更新现有的 DOM 节点
        updateHostComponent(current, workInProgress, newProps);
      } else {
        // 创建新的 DOM 节点
        const instance = createInstance(workInProgress.type, newProps);
        appendAllChildren(instance, workInProgress);
        workInProgress.stateNode = instance;
      }
      break;
    }
    // ...其他类型
  }
}
```

### 3. commitWork

`commitWork` 负责将变更提交到 DOM：

```javascript
function commitWork(finishedWork) {
  switch (finishedWork.tag) {
    case FunctionComponent:
    case ClassComponent: {
      // 执行副作用
      commitLifeCycles(finishedWork);
      return;
    }
    case HostComponent: {
      const instance = finishedWork.stateNode;
      if (instance != null) {
        // 更新 DOM 属性
        const newProps = finishedWork.memoizedProps;
        updateProperties(instance, newProps);
      }
      return;
    }
    // ...其他类型
  }
}
```

## 副作用（Effects）

Fiber 使用标记来追踪需要执行的副作用：

```javascript
// 副作用标记
const Placement = 0b00000000000010;  // 插入
const Update = 0b00000000000100;     // 更新
const Deletion = 0b00000000001000;   // 删除
const ChildDeletion = 0b00000000010000; // 子节点删除

// 标记副作用
function markUpdate(fiber) {
  fiber.flags |= Update;
}

// 检查是否有副作用
function hasEffect(fiber, effect) {
  return (fiber.flags & effect) !== 0;
}
```

副作用会被收集到一个链表中，在 commit 阶段统一执行：

```javascript
// 收集副作用
function collectEffects(fiber) {
  let firstEffect = null;
  let lastEffect = null;
  
  // 遍历 Fiber 树
  let child = fiber.child;
  while (child !== null) {
    const childEffects = collectEffects(child);
    
    if (childEffects !== null) {
      if (lastEffect === null) {
        firstEffect = childEffects;
      } else {
        lastEffect.nextEffect = childEffects;
      }
      lastEffect = childEffects;
    }
    
    child = child.sibling;
  }
  
  // 添加当前节点的副作用
  if (fiber.flags !== NoFlags) {
    if (lastEffect === null) {
      firstEffect = fiber;
    } else {
      lastEffect.nextEffect = fiber;
    }
    lastEffect = fiber;
  }
  
  return firstEffect;
}
```

## 时间切片（Time Slicing）

Fiber 使用时间切片来实现可中断的渲染：

```javascript
// 简化的调度器实现
let isPerformingWork = false;
let currentTask = null;

function scheduleCallback(priority, callback) {
  const task = {
    callback,
    priority,
    expirationTime: getCurrentTime() + timeout(priority),
  };
  
  taskQueue.push(task);
  
  if (!isPerformingWork) {
    isPerformingWork = true;
    requestIdleCallback(flushWork);
  }
  
  return task;
}

function flushWork(deadline) {
  isPerformingWork = true;
  
  try {
    while (currentTask !== null && deadline.timeRemaining() > 0) {
      const callback = currentTask.callback;
      
      if (typeof callback === 'function') {
        currentTask.callback = null;
        const continuationCallback = callback();
        
        // 如果返回了函数，表示工作还没完成
        if (typeof continuationCallback === 'function') {
          currentTask.callback = continuationCallback;
        } else {
          // 工作完成，移除任务
          taskQueue.shift();
          currentTask = taskQueue[0];
        }
      }
    }
    
    // 如果还有任务，继续调度
    if (currentTask !== null) {
      requestIdleCallback(flushWork);
    }
  } finally {
    isPerformingWork = false;
  }
}
```

## Fiber 与 Hooks

Hooks 依赖于 Fiber 的架构。每个 Fiber 节点维护了一个 Hook 链表：

```javascript
type Hook = {
  memoizedState: any,      // 当前状态
  baseState: any,          // 基础状态
  baseQueue: Update<any>,  // 基础更新队列
  queue: UpdateQueue<any>, // 更新队列
  next: Hook | null,       // 下一个 Hook
};

// Fiber 中存储 Hooks
fiber.memoizedState = firstHook;
```

## 实际应用场景

### 1. 高优先级打断低优先级

```javascript
function App() {
  const [count, setCount] = useState(0);
  const [text, setText] = useState('');
  
  // 低优先级更新：渲染大列表
  const handleCountClick = () => {
    startTransition(() => {
      setCount(c => c + 1);
    });
  };
  
  // 高优先级更新：用户输入
  const handleTextChange = (e) => {
    setText(e.target.value); // 会打断 count 的更新
  };
  
  return (
    <div>
      <input value={text} onChange={handleTextChange} />
      <button onClick={handleCountClick}>Count: {count}</button>
      <ExpensiveList count={count} />
    </div>
  );
}
```

### 2. Suspense 的实现

```javascript
function MySuspenseComponent() {
  return (
    <Suspense fallback={<Loading />}>
      <AsyncComponent />
    </Suspense>
  );
}

// Fiber 会捕获 Promise，显示 fallback
// 当 Promise resolve 后，重新渲染 AsyncComponent
```

## Fiber 的优势

1. **更好的用户体验**
   - 避免长时间阻塞主线程
   - 保持界面的响应性
   - 动画更流畅

2. **更灵活的调度**
   - 可以暂停、中止、重用工作
   - 支持不同的优先级
   - 更好地利用浏览器空闲时间

3. **更强大的功能**
   - 支持并发模式（Concurrent Mode）
   - 支持 Suspense
   - 支持 Time Slicing

4. **更好的错误处理**
   - 错误边界（Error Boundaries）
   - 可以在渲染过程中捕获错误

## 总结

Fiber 是 React 的核心创新之一，它通过以下方式重塑了 React 的渲染机制：

- 将渲染工作分解为小的工作单元
- 引入优先级概念，实现可中断的渲染
- 使用双缓冲技术优化更新过程
- 为并发特性（Concurrent Features）奠定基础

理解 Fiber 的工作原理，有助于我们：
- 写出更高性能的 React 应用
- 更好地理解 React 的调度机制
- 合理使用并发特性
- 优化大型应用的性能

## 相关阅读

- [React Reconciler](/react/reconciler)
- [React Scheduler](/react/scheduler)
- [React Diff 算法](/react/diff-algorithm)
- [React Hooks](/react/hooks)

