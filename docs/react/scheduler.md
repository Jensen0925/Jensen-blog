# React Scheduler

## 什么是 Scheduler

Scheduler（调度器）是 React 的独立包（`scheduler`），负责：

- **任务调度**：根据优先级调度任务的执行顺序
- **时间切片**：将长任务分割成多个小任务，避免阻塞主线程
- **优先级管理**：不同的任务有不同的优先级，高优先级任务可以打断低优先级任务

Scheduler 是 React 实现**并发模式（Concurrent Mode）**的基础。

## 为什么需要 Scheduler

### 浏览器的刷新率

现代浏览器的刷新率通常是 **60 FPS**（每秒 60 帧），即每 **16.6ms** 渲染一帧。

```
一帧的时间分配：
┌────────────────────────────────────┐
│ 输入事件处理                        │
│ requestAnimationFrame 回调          │
│ 样式计算和布局                      │
│ 绘制                                │
│ requestIdleCallback 回调（空闲时间）│
└────────────────────────────────────┘
```

如果 JavaScript 执行时间超过 16.6ms，就会导致：
- 掉帧
- 用户交互卡顿
- 动画不流畅

### 传统 React 的问题

在 React 16 之前，更新是同步且不可中断的：

```javascript
function performWork() {
  while (workInProgress !== null) {
    workInProgress = performUnitOfWork(workInProgress);
  }
}

// 问题：
// 1. 长时间占用主线程
// 2. 无法响应用户交互
// 3. 无法区分任务优先级
```

### Scheduler 的解决方案

Scheduler 通过以下方式解决这些问题：

1. **时间切片**：将长任务分割成多个小任务
2. **可中断**：每个时间切片结束后，检查是否有更高优先级的任务
3. **优先级调度**：根据任务的优先级决定执行顺序

## Scheduler 的核心概念

### 1. 优先级

Scheduler 定义了 5 种优先级：

```javascript
// 优先级级别
const ImmediatePriority = 1;        // 立即执行（最高优先级）
const UserBlockingPriority = 2;     // 用户交互
const NormalPriority = 3;           // 普通优先级（默认）
const LowPriority = 4;              // 低优先级
const IdlePriority = 5;             // 空闲时执行（最低优先级）

// 优先级对应的超时时间
const maxSigned31BitInt = 1073741823;

const IMMEDIATE_PRIORITY_TIMEOUT = -1;           // 立即执行
const USER_BLOCKING_PRIORITY_TIMEOUT = 250;      // 250ms
const NORMAL_PRIORITY_TIMEOUT = 5000;            // 5s
const LOW_PRIORITY_TIMEOUT = 10000;              // 10s
const IDLE_PRIORITY_TIMEOUT = maxSigned31BitInt; // 永不过期
```

### 2. 任务（Task）

每个任务是一个对象：

```javascript
type Task = {
  id: number;                    // 任务 ID
  callback: Function | null;     // 任务回调函数
  priorityLevel: PriorityLevel;  // 优先级
  startTime: number;             // 开始时间
  expirationTime: number;        // 过期时间
  sortIndex: number;             // 排序索引
};
```

### 3. 任务队列

Scheduler 维护两个任务队列：

```javascript
// 待执行的任务队列（已开始）
const taskQueue: Array<Task> = [];

// 延迟任务队列（未开始）
const timerQueue: Array<Task> = [];
```

任务队列使用**最小堆（Min Heap）**实现，保证：
- 最紧急的任务在堆顶
- 插入和删除的时间复杂度是 O(log n)

## Scheduler 的工作流程

### 1. 调度任务

```javascript
function scheduleCallback(priorityLevel, callback, options) {
  const currentTime = getCurrentTime();
  
  // 计算开始时间
  let startTime;
  if (typeof options === 'object' && options !== null) {
    const delay = options.delay;
    if (typeof delay === 'number' && delay > 0) {
      startTime = currentTime + delay;
    } else {
      startTime = currentTime;
    }
  } else {
    startTime = currentTime;
  }
  
  // 计算超时时间
  let timeout;
  switch (priorityLevel) {
    case ImmediatePriority:
      timeout = IMMEDIATE_PRIORITY_TIMEOUT;
      break;
    case UserBlockingPriority:
      timeout = USER_BLOCKING_PRIORITY_TIMEOUT;
      break;
    case IdlePriority:
      timeout = IDLE_PRIORITY_TIMEOUT;
      break;
    case LowPriority:
      timeout = LOW_PRIORITY_TIMEOUT;
      break;
    case NormalPriority:
    default:
      timeout = NORMAL_PRIORITY_TIMEOUT;
      break;
  }
  
  // 计算过期时间
  const expirationTime = startTime + timeout;
  
  // 创建任务
  const newTask = {
    id: taskIdCounter++,
    callback,
    priorityLevel,
    startTime,
    expirationTime,
    sortIndex: -1,
  };
  
  if (startTime > currentTime) {
    // 延迟任务，加入 timerQueue
    newTask.sortIndex = startTime;
    push(timerQueue, newTask);
    
    // 如果 taskQueue 为空，且当前任务是最早的延迟任务
    if (peek(taskQueue) === null && newTask === peek(timerQueue)) {
      // 取消之前的定时器
      if (isHostTimeoutScheduled) {
        cancelHostTimeout();
      } else {
        isHostTimeoutScheduled = true;
      }
      // 设置新的定时器
      requestHostTimeout(handleTimeout, startTime - currentTime);
    }
  } else {
    // 立即任务，加入 taskQueue
    newTask.sortIndex = expirationTime;
    push(taskQueue, newTask);
    
    // 开始调度
    if (!isHostCallbackScheduled && !isPerformingWork) {
      isHostCallbackScheduled = true;
      requestHostCallback(flushWork);
    }
  }
  
  return newTask;
}
```

### 2. 执行任务

```javascript
function flushWork(hasTimeRemaining, initialTime) {
  // 标记正在执行工作
  isHostCallbackScheduled = false;
  if (isHostTimeoutScheduled) {
    isHostTimeoutScheduled = false;
    cancelHostTimeout();
  }
  
  isPerformingWork = true;
  const previousPriorityLevel = currentPriorityLevel;
  
  try {
    // 执行任务队列中的所有任务
    return workLoop(hasTimeRemaining, initialTime);
  } finally {
    currentTask = null;
    currentPriorityLevel = previousPriorityLevel;
    isPerformingWork = false;
  }
}

function workLoop(hasTimeRemaining, initialTime) {
  let currentTime = initialTime;
  
  // 将到期的延迟任务移到 taskQueue
  advanceTimers(currentTime);
  
  // 获取优先级最高的任务
  currentTask = peek(taskQueue);
  
  while (currentTask !== null) {
    if (
      currentTask.expirationTime > currentTime &&
      (!hasTimeRemaining || shouldYieldToHost())
    ) {
      // 任务未过期，且没有剩余时间，或者需要让出控制权
      break;
    }
    
    const callback = currentTask.callback;
    if (typeof callback === 'function') {
      currentTask.callback = null;
      currentPriorityLevel = currentTask.priorityLevel;
      
      // 检查任务是否过期
      const didUserCallbackTimeout = currentTask.expirationTime <= currentTime;
      
      // 执行任务
      const continuationCallback = callback(didUserCallbackTimeout);
      currentTime = getCurrentTime();
      
      // 如果任务返回了函数，表示任务未完成
      if (typeof continuationCallback === 'function') {
        currentTask.callback = continuationCallback;
      } else {
        // 任务完成，从队列中移除
        if (currentTask === peek(taskQueue)) {
          pop(taskQueue);
        }
      }
      
      // 将到期的延迟任务移到 taskQueue
      advanceTimers(currentTime);
    } else {
      // 回调为空，移除任务
      pop(taskQueue);
    }
    
    // 获取下一个任务
    currentTask = peek(taskQueue);
  }
  
  // 如果还有任务，返回 true，继续调度
  if (currentTask !== null) {
    return true;
  } else {
    // 检查是否有延迟任务
    const firstTimer = peek(timerQueue);
    if (firstTimer !== null) {
      requestHostTimeout(handleTimeout, firstTimer.startTime - currentTime);
    }
    return false;
  }
}
```

### 3. 检查是否应该让出控制权

```javascript
// 默认的时间切片大小：5ms
let yieldInterval = 5;

function shouldYieldToHost() {
  const currentTime = getCurrentTime();
  return currentTime >= deadline;
}

// 使用 MessageChannel 实现时间切片
const channel = new MessageChannel();
const port = channel.port2;

channel.port1.onmessage = performWorkUntilDeadline;

function performWorkUntilDeadline() {
  if (scheduledHostCallback !== null) {
    const currentTime = getCurrentTime();
    
    // 设置截止时间
    deadline = currentTime + yieldInterval;
    
    const hasTimeRemaining = true;
    let hasMoreWork = true;
    
    try {
      hasMoreWork = scheduledHostCallback(hasTimeRemaining, currentTime);
    } finally {
      if (hasMoreWork) {
        // 还有更多工作，继续调度
        port.postMessage(null);
      } else {
        isMessageLoopRunning = false;
        scheduledHostCallback = null;
      }
    }
  } else {
    isMessageLoopRunning = false;
  }
  
  // 重置为下一帧做准备
  needsPaint = false;
}

function requestHostCallback(callback) {
  scheduledHostCallback = callback;
  if (!isMessageLoopRunning) {
    isMessageLoopRunning = true;
    port.postMessage(null);
  }
}
```

## 时间切片的实现

### 为什么使用 MessageChannel？

React 使用 `MessageChannel` 而不是 `setTimeout` 或 `requestIdleCallback`：

```javascript
// 1. setTimeout - 有 4ms 的延迟，不够精确
setTimeout(() => {
  // 至少延迟 4ms
}, 0);

// 2. requestIdleCallback - 执行时机不可控，可能很久才执行一次
requestIdleCallback(() => {
  // 只在浏览器空闲时执行
});

// 3. MessageChannel - 宏任务，没有延迟，执行时机可控
const channel = new MessageChannel();
channel.port1.onmessage = () => {
  // 在下一个事件循环中执行
};
channel.port2.postMessage(null);
```

### 时间切片示例

```javascript
// 模拟 Scheduler 的时间切片
function performConcurrentWorkOnRoot(root) {
  // 开始工作
  let exitStatus = renderRootConcurrent(root, lanes);
  
  if (exitStatus !== RootInProgress) {
    // 工作完成
    completeRoot(root, exitStatus, lanes);
  } else {
    // 工作未完成，继续调度
    ensureRootIsScheduled(root, now());
  }
}

function renderRootConcurrent(root, lanes) {
  do {
    try {
      workLoopConcurrent();
      break;
    } catch (thrownValue) {
      handleError(root, thrownValue);
    }
  } while (true);
  
  if (workInProgress !== null) {
    // 工作未完成
    return RootInProgress;
  } else {
    // 工作完成
    return workInProgressRootExitStatus;
  }
}

function workLoopConcurrent() {
  // 只要还有工作，且不需要让出控制权，就继续工作
  while (workInProgress !== null && !shouldYield()) {
    performUnitOfWork(workInProgress);
  }
}
```

## 优先级的应用

### 1. 用户输入 - 高优先级

```javascript
// 用户输入使用 UserBlockingPriority
function dispatchDiscreteEvent(domEventName, eventSystemFlags, container) {
  const previousPriority = getCurrentUpdatePriority();
  const prevTransition = ReactCurrentBatchConfig.transition;
  ReactCurrentBatchConfig.transition = null;
  
  try {
    // 设置为用户阻塞优先级
    setCurrentUpdatePriority(DiscreteEventPriority);
    dispatchEvent(domEventName, eventSystemFlags, container);
  } finally {
    setCurrentUpdatePriority(previousPriority);
    ReactCurrentBatchConfig.transition = prevTransition;
  }
}
```

### 2. startTransition - 低优先级

```javascript
function startTransition(scope) {
  const prevTransition = ReactCurrentBatchConfig.transition;
  ReactCurrentBatchConfig.transition = {};
  
  try {
    // transition 更新使用较低的优先级
    scope();
  } finally {
    ReactCurrentBatchConfig.transition = prevTransition;
  }
}

// 使用示例
function App() {
  const [text, setText] = useState('');
  const [items, setItems] = useState([]);
  
  function handleChange(e) {
    // 高优先级：立即更新输入框
    setText(e.target.value);
    
    // 低优先级：可以被打断
    startTransition(() => {
      setItems(filterItems(e.target.value));
    });
  }
  
  return (
    <div>
      <input value={text} onChange={handleChange} />
      <List items={items} />
    </div>
  );
}
```

### 3. useTransition

```javascript
function useTransition() {
  const [isPending, setPending] = useState(false);
  
  const startTransition = useCallback(callback => {
    setPending(true);
    
    const prevTransition = ReactCurrentBatchConfig.transition;
    ReactCurrentBatchConfig.transition = {};
    
    try {
      callback();
    } finally {
      ReactCurrentBatchConfig.transition = prevTransition;
      setPending(false);
    }
  }, []);
  
  return [isPending, startTransition];
}

// 使用示例
function App() {
  const [isPending, startTransition] = useTransition();
  const [count, setCount] = useState(0);
  
  function handleClick() {
    startTransition(() => {
      setCount(c => c + 1);
    });
  }
  
  return (
    <div>
      <button onClick={handleClick}>
        {isPending ? 'Loading...' : `Count: ${count}`}
      </button>
    </div>
  );
}
```

### 4. useDeferredValue

```javascript
function useDeferredValue(value) {
  const [prevValue, setPrevValue] = useState(value);
  
  useEffect(() => {
    // 使用 transition 优先级更新
    startTransition(() => {
      setPrevValue(value);
    });
  }, [value]);
  
  return prevValue;
}

// 使用示例
function App() {
  const [text, setText] = useState('');
  const deferredText = useDeferredValue(text);
  
  return (
    <div>
      <input value={text} onChange={e => setText(e.target.value)} />
      {/* 渲染可以被延迟 */}
      <ExpensiveList text={deferredText} />
    </div>
  );
}
```

## 饥饿问题的处理

如果低优先级任务一直被打断，会导致**饥饿问题**。Scheduler 通过**过期时间**解决：

```javascript
function workLoop(hasTimeRemaining, initialTime) {
  let currentTime = initialTime;
  advanceTimers(currentTime);
  currentTask = peek(taskQueue);
  
  while (currentTask !== null) {
    // 检查任务是否过期
    const didUserCallbackTimeout = currentTask.expirationTime <= currentTime;
    
    if (
      currentTask.expirationTime > currentTime &&
      (!hasTimeRemaining || shouldYieldToHost())
    ) {
      // 任务未过期，且需要让出控制权
      break;
    }
    
    // 任务过期了，必须执行
    const callback = currentTask.callback;
    if (typeof callback === 'function') {
      // 执行任务，传入 didUserCallbackTimeout
      const continuationCallback = callback(didUserCallbackTimeout);
      // ...
    }
    
    currentTask = peek(taskQueue);
  }
}
```

## Scheduler 与 Reconciler 的配合

```javascript
// 1. React 调用 Scheduler 调度任务
function ensureRootIsScheduled(root, currentTime) {
  // 获取下一个需要处理的 lanes
  const nextLanes = getNextLanes(root, NoLanes);
  
  if (nextLanes === NoLanes) {
    // 没有工作要做
    return;
  }
  
  // 获取优先级
  const newCallbackPriority = getHighestPriorityLane(nextLanes);
  
  // 如果已经有相同优先级的任务在调度，直接返回
  const existingCallbackPriority = root.callbackPriority;
  if (existingCallbackPriority === newCallbackPriority) {
    return;
  }
  
  // 取消旧的任务
  if (existingCallbackNode !== null) {
    cancelCallback(existingCallbackNode);
  }
  
  // 调度新任务
  let newCallbackNode;
  if (newCallbackPriority === SyncLane) {
    // 同步任务
    scheduleSyncCallback(performSyncWorkOnRoot.bind(null, root));
    scheduleCallback(ImmediatePriority, flushSyncCallbacks);
    newCallbackNode = null;
  } else {
    // 异步任务
    const schedulerPriorityLevel = 
      lanesToSchedulerPriority(newCallbackPriority);
    
    newCallbackNode = scheduleCallback(
      schedulerPriorityLevel,
      performConcurrentWorkOnRoot.bind(null, root)
    );
  }
  
  root.callbackPriority = newCallbackPriority;
  root.callbackNode = newCallbackNode;
}

// 2. Scheduler 执行任务时，调用 Reconciler
function performConcurrentWorkOnRoot(root, didTimeout) {
  // 执行渲染工作
  const exitStatus = renderRootConcurrent(root, lanes);
  
  if (exitStatus === RootInProgress) {
    // 工作未完成，返回函数继续执行
    return performConcurrentWorkOnRoot.bind(null, root);
  }
  
  // 工作完成
  return null;
}
```

## 性能优化技巧

### 1. 使用 startTransition 降低优先级

```javascript
function SearchResults({ query }) {
  const [results, setResults] = useState([]);
  
  function handleSearch(newQuery) {
    startTransition(() => {
      // 搜索结果的更新是低优先级的
      const newResults = search(newQuery);
      setResults(newResults);
    });
  }
  
  return <div>{/* 渲染结果 */}</div>;
}
```

### 2. 使用 useDeferredValue 延迟更新

```javascript
function App() {
  const [text, setText] = useState('');
  const deferredText = useDeferredValue(text);
  
  return (
    <>
      {/* 输入立即响应 */}
      <input value={text} onChange={e => setText(e.target.value)} />
      
      {/* 列表延迟更新 */}
      <List text={deferredText} />
    </>
  );
}
```

### 3. 合理拆分组件

```javascript
// ❌ 不好：一个大组件
function App() {
  const [text, setText] = useState('');
  const [count, setCount] = useState(0);
  
  return (
    <div>
      <input value={text} onChange={e => setText(e.target.value)} />
      <button onClick={() => setCount(c => c + 1)}>{count}</button>
      <ExpensiveList count={count} />
    </div>
  );
}

// ✅ 好：拆分组件
function App() {
  const [text, setText] = useState('');
  
  return (
    <div>
      <input value={text} onChange={e => setText(e.target.value)} />
      <Counter />
    </div>
  );
}

function Counter() {
  const [count, setCount] = useState(0);
  
  return (
    <>
      <button onClick={() => setCount(c => c + 1)}>{count}</button>
      <ExpensiveList count={count} />
    </>
  );
}
```

## 总结

React Scheduler 是并发模式的基础，它通过：

1. **时间切片**
   - 将长任务分割成小任务
   - 避免阻塞主线程
   - 保持页面响应性

2. **优先级调度**
   - 高优先级任务优先执行
   - 低优先级任务可以被打断
   - 通过过期时间避免饥饿

3. **可中断渲染**
   - 在时间切片之间检查更高优先级任务
   - 必要时中断当前任务
   - 保证用户体验

4. **与 Reconciler 配合**
   - Scheduler 负责"何时执行"
   - Reconciler 负责"执行什么"
   - 共同实现并发渲染

理解 Scheduler 有助于：
- 更好地使用并发特性
- 优化应用性能
- 理解 React 的调度机制
- 合理使用 startTransition 和 useDeferredValue

## 相关阅读

- [React Fiber 原理](/react/fiber)
- [React Reconciler](/react/reconciler)
- [React 18 新特性](/react/react-18)
- [React 19 新特性](/react/react-19)

