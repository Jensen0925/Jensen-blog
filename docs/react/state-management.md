# React 状态管理源码解析

## 概述

状态管理是 React 应用的核心。本文将深入解析 React 内部的状态管理机制，包括：

- useState 的实现原理
- useReducer 的实现原理
- 状态更新的调度机制
- 批量更新（Batching）
- 状态更新的优先级

## 状态的数据结构

### Hook 对象

每个 Hook 都是一个对象，存储在 Fiber 节点的 `memoizedState` 中：

```javascript
type Hook = {
  // 当前状态值
  memoizedState: any,
  
  // 初始状态（useReducer 中使用）
  baseState: any,
  
  // 基础更新队列
  baseQueue: Update<any, any> | null,
  
  // 待处理的更新队列
  queue: UpdateQueue<any, any> | null,
  
  // 指向下一个 Hook
  next: Hook | null,
};
```

### Update 对象

每次调用 `setState` 都会创建一个 Update 对象：

```javascript
type Update<S, A> = {
  // 更新的优先级
  lane: Lane,
  
  // 更新的类型（setState 或 reducer action）
  action: A,
  
  // 预计算的 reducer
  eagerReducer: ((S, A) => S) | null,
  
  // 预计算的 state
  eagerState: S | null,
  
  // 指向下一个 Update（环形链表）
  next: Update<S, A>,
};
```

### UpdateQueue

更新队列存储所有的 Update：

```javascript
type UpdateQueue<S, A> = {
  // 待处理的更新（环形链表）
  pending: Update<S, A> | null,
  
  // dispatch 函数
  dispatch: ((A) => mixed) | null,
  
  // 最后一次渲染使用的 reducer
  lastRenderedReducer: ((S, A) => S) | null,
  
  // 最后一次渲染的 state
  lastRenderedState: S | null,
};
```

## useState 的实现

### 1. 挂载阶段（Mount）

首次渲染时调用 `mountState`：

```javascript
function mountState<S>(
  initialState: (() => S) | S
): [S, Dispatch<BasicStateAction<S>>] {
  // 1. 创建 Hook 对象
  const hook = mountWorkInProgressHook();
  
  // 2. 处理初始状态
  if (typeof initialState === 'function') {
    // 惰性初始化
    initialState = initialState();
  }
  hook.memoizedState = hook.baseState = initialState;
  
  // 3. 创建更新队列
  const queue: UpdateQueue<S, BasicStateAction<S>> = {
    pending: null,
    dispatch: null,
    lastRenderedReducer: basicStateReducer,
    lastRenderedState: initialState,
  };
  hook.queue = queue;
  
  // 4. 创建 dispatch 函数
  const dispatch: Dispatch<BasicStateAction<S>> = 
    (queue.dispatch = dispatchSetState.bind(
      null,
      currentlyRenderingFiber,
      queue
    ));
  
  // 5. 返回状态和 dispatch 函数
  return [hook.memoizedState, dispatch];
}

// 创建 Hook 对象
function mountWorkInProgressHook(): Hook {
  const hook: Hook = {
    memoizedState: null,
    baseState: null,
    baseQueue: null,
    queue: null,
    next: null,
  };
  
  if (workInProgressHook === null) {
    // 第一个 Hook
    currentlyRenderingFiber.memoizedState = workInProgressHook = hook;
  } else {
    // 后续的 Hook，添加到链表末尾
    workInProgressHook = workInProgressHook.next = hook;
  }
  
  return workInProgressHook;
}
```

### 2. 更新阶段（Update）

后续渲染时调用 `updateState`：

```javascript
function updateState<S>(
  initialState: (() => S) | S
): [S, Dispatch<BasicStateAction<S>>] {
  return updateReducer(basicStateReducer, initialState);
}

// basicStateReducer 是最简单的 reducer
function basicStateReducer<S>(state: S, action: BasicStateAction<S>): S {
  // action 可以是值或函数
  return typeof action === 'function' ? action(state) : action;
}
```

### 3. dispatch 函数（dispatchSetState）

调用 `setState` 时执行：

```javascript
function dispatchSetState<S, A>(
  fiber: Fiber,
  queue: UpdateQueue<S, A>,
  action: A
) {
  // 1. 获取当前时间和优先级
  const eventTime = requestEventTime();
  const lane = requestUpdateLane(fiber);
  
  // 2. 创建 update 对象
  const update: Update<S, A> = {
    lane,
    action,
    eagerReducer: null,
    eagerState: null,
    next: null,
  };
  
  // 3. 将 update 加入队列（环形链表）
  const pending = queue.pending;
  if (pending === null) {
    // 第一个 update，指向自己
    update.next = update;
  } else {
    // 插入到链表中
    update.next = pending.next;
    pending.next = update;
  }
  queue.pending = update;
  
  // 4. 尝试提前计算状态（优化）
  const alternate = fiber.alternate;
  if (
    fiber === currentlyRenderingFiber ||
    (alternate !== null && alternate === currentlyRenderingFiber)
  ) {
    // 正在渲染中，标记需要重新渲染
    didScheduleRenderPhaseUpdateDuringThisPass = didScheduleRenderPhaseUpdate = true;
  } else {
    if (
      fiber.lanes === NoLanes &&
      (alternate === null || alternate.lanes === NoLanes)
    ) {
      // 队列当前为空，尝试提前计算
      const lastRenderedReducer = queue.lastRenderedReducer;
      if (lastRenderedReducer !== null) {
        try {
          const currentState = queue.lastRenderedState;
          const eagerState = lastRenderedReducer(currentState, action);
          
          // 保存预计算的结果
          update.eagerReducer = lastRenderedReducer;
          update.eagerState = eagerState;
          
          // 如果状态没有变化，可以跳过更新
          if (is(eagerState, currentState)) {
            return;
          }
        } catch (error) {
          // 预计算失败，继续正常流程
        }
      }
    }
    
    // 5. 调度更新
    scheduleUpdateOnFiber(fiber, lane, eventTime);
  }
}
```

### 4. 计算新状态（updateReducer）

```javascript
function updateReducer<S, I, A>(
  reducer: (S, A) => S,
  initialArg: I,
  init?: I => S
): [S, Dispatch<A>] {
  // 1. 获取当前 Hook
  const hook = updateWorkInProgressHook();
  const queue = hook.queue;
  
  queue.lastRenderedReducer = reducer;
  
  const current = currentHook;
  
  // 2. 获取基础队列
  let baseQueue = current.baseQueue;
  
  // 3. 获取待处理的更新
  const pendingQueue = queue.pending;
  if (pendingQueue !== null) {
    // 有待处理的更新
    if (baseQueue !== null) {
      // 合并 baseQueue 和 pendingQueue
      const baseFirst = baseQueue.next;
      const pendingFirst = pendingQueue.next;
      baseQueue.next = pendingFirst;
      pendingQueue.next = baseFirst;
    }
    
    current.baseQueue = baseQueue = pendingQueue;
    queue.pending = null;
  }
  
  // 4. 计算新状态
  if (baseQueue !== null) {
    const first = baseQueue.next;
    let newState = current.baseState;
    
    let newBaseState = null;
    let newBaseQueueFirst = null;
    let newBaseQueueLast = null;
    let update = first;
    
    do {
      const updateLane = update.lane;
      
      // 检查优先级
      if (!isSubsetOfLanes(renderLanes, updateLane)) {
        // 优先级不够，跳过这个更新
        const clone: Update<S, A> = {
          lane: updateLane,
          action: update.action,
          eagerReducer: update.eagerReducer,
          eagerState: update.eagerState,
          next: null,
        };
        
        // 将跳过的更新添加到新的 baseQueue
        if (newBaseQueueLast === null) {
          newBaseQueueFirst = newBaseQueueLast = clone;
          newBaseState = newState;
        } else {
          newBaseQueueLast = newBaseQueueLast.next = clone;
        }
        
        // 更新优先级
        currentlyRenderingFiber.lanes = mergeLanes(
          currentlyRenderingFiber.lanes,
          updateLane
        );
      } else {
        // 优先级足够，应用这个更新
        if (newBaseQueueLast !== null) {
          const clone: Update<S, A> = {
            lane: NoLane,
            action: update.action,
            eagerReducer: update.eagerReducer,
            eagerState: update.eagerState,
            next: null,
          };
          newBaseQueueLast = newBaseQueueLast.next = clone;
        }
        
        // 计算新状态
        const action = update.action;
        if (update.eagerReducer === reducer) {
          // 使用预计算的状态
          newState = update.eagerState;
        } else {
          // 调用 reducer 计算新状态
          newState = reducer(newState, action);
        }
      }
      
      update = update.next;
    } while (update !== null && update !== first);
    
    // 5. 更新 Hook
    if (newBaseQueueLast === null) {
      newBaseState = newState;
    } else {
      newBaseQueueLast.next = newBaseQueueFirst;
    }
    
    hook.memoizedState = newState;
    hook.baseState = newBaseState;
    hook.baseQueue = newBaseQueueLast;
    
    queue.lastRenderedState = newState;
  }
  
  // 6. 返回状态和 dispatch
  const dispatch = queue.dispatch;
  return [hook.memoizedState, dispatch];
}
```

## useReducer 的实现

### 1. 挂载阶段

```javascript
function mountReducer<S, I, A>(
  reducer: (S, A) => S,
  initialArg: I,
  init?: I => S
): [S, Dispatch<A>] {
  // 1. 创建 Hook
  const hook = mountWorkInProgressHook();
  
  // 2. 计算初始状态
  let initialState;
  if (init !== undefined) {
    initialState = init(initialArg);
  } else {
    initialState = initialArg;
  }
  
  hook.memoizedState = hook.baseState = initialState;
  
  // 3. 创建更新队列
  const queue: UpdateQueue<S, A> = {
    pending: null,
    dispatch: null,
    lastRenderedReducer: reducer,
    lastRenderedState: initialState,
  };
  hook.queue = queue;
  
  // 4. 创建 dispatch 函数
  const dispatch: Dispatch<A> = (queue.dispatch = dispatchReducerAction.bind(
    null,
    currentlyRenderingFiber,
    queue
  ));
  
  return [hook.memoizedState, dispatch];
}
```

### 2. 更新阶段

```javascript
function updateReducer<S, I, A>(
  reducer: (S, A) => S,
  initialArg: I,
  init?: I => S
): [S, Dispatch<A>] {
  // 与 updateState 类似，但使用自定义的 reducer
  // 实现逻辑与上面的 updateReducer 函数相同
}
```

### 3. dispatchReducerAction

```javascript
function dispatchReducerAction<S, A>(
  fiber: Fiber,
  queue: UpdateQueue<S, A>,
  action: A
) {
  const eventTime = requestEventTime();
  const lane = requestUpdateLane(fiber);
  
  const update: Update<S, A> = {
    lane,
    action,
    eagerReducer: null,
    eagerState: null,
    next: null,
  };
  
  // 将 update 加入队列
  const pending = queue.pending;
  if (pending === null) {
    update.next = update;
  } else {
    update.next = pending.next;
    pending.next = update;
  }
  queue.pending = update;
  
  // 调度更新
  scheduleUpdateOnFiber(fiber, lane, eventTime);
}
```

## 批量更新（Batching）

### React 17 的批量更新

在 React 17 中，只有在 React 事件处理函数中的更新才会被批量处理：

```javascript
// React 17
function handleClick() {
  // 这些更新会被批量处理，只触发一次重新渲染
  setCount(c => c + 1);
  setFlag(f => !f);
}

// 但在 Promise、setTimeout 等异步操作中不会被批量处理
setTimeout(() => {
  // 这些更新会分别触发重新渲染
  setCount(c => c + 1);
  setFlag(f => !f);
}, 1000);
```

批量更新的实现：

```javascript
let executionContext = NoContext;
const BatchedContext = 0b0001;

function batchedEventUpdates(fn, a, b) {
  const prevExecutionContext = executionContext;
  executionContext |= BatchedContext;
  
  try {
    return fn(a, b);
  } finally {
    executionContext = prevExecutionContext;
    
    // 批量更新结束，刷新同步队列
    if (executionContext === NoContext) {
      flushSyncCallbackQueue();
    }
  }
}
```

### React 18 的自动批量更新

React 18 引入了自动批量更新，所有更新都会被批量处理：

```javascript
// React 18
function handleClick() {
  // 批量处理
  setCount(c => c + 1);
  setFlag(f => !f);
}

setTimeout(() => {
  // 也会批量处理！
  setCount(c => c + 1);
  setFlag(f => !f);
}, 1000);

fetch('/api').then(() => {
  // 也会批量处理！
  setCount(c => c + 1);
  setFlag(f => !f);
});
```

自动批量更新的实现基于 `startTransition` 和新的并发特性。

### 退出批量更新

如果需要退出批量更新，可以使用 `flushSync`：

```javascript
import { flushSync } from 'react-dom';

function handleClick() {
  flushSync(() => {
    setCount(c => c + 1);
  });
  // DOM 已经更新
  
  flushSync(() => {
    setFlag(f => !f);
  });
  // DOM 再次更新
}
```

## 优先级和并发更新

### Lane 模型

React 18 使用 Lane 模型表示优先级：

```javascript
type Lane = number;
type Lanes = number;

// Lane 定义
const SyncLane = 0b0000000000000000000000000000001;
const InputContinuousLane = 0b0000000000000000000000000000100;
const DefaultLane = 0b0000000000000000000000000010000;
const TransitionLane1 = 0b0000000000000000000000010000000;
const IdleLane = 0b0100000000000000000000000000000;
```

### 不同优先级的更新

```javascript
function dispatchSetState<S, A>(
  fiber: Fiber,
  queue: UpdateQueue<S, A>,
  action: A
) {
  // 1. 请求优先级
  const lane = requestUpdateLane(fiber);
  
  // 2. 创建 update
  const update: Update<S, A> = {
    lane, // 携带优先级信息
    action,
    eagerReducer: null,
    eagerState: null,
    next: null,
  };
  
  // 3. 调度更新
  scheduleUpdateOnFiber(fiber, lane, eventTime);
}

function requestUpdateLane(fiber: Fiber): Lane {
  // 检查是否在 transition 中
  const transition = ReactCurrentBatchConfig.transition;
  if (transition !== null) {
    // Transition 更新，使用较低优先级
    return claimTransitionLane();
  }
  
  // 获取当前事件的优先级
  const updateLane = getCurrentUpdatePriority();
  if (updateLane !== NoLane) {
    return updateLane;
  }
  
  // 获取事件优先级
  const eventLane = getCurrentEventPriority();
  return eventLane;
}
```

### 高优先级打断低优先级

```javascript
function ensureRootIsScheduled(root: FiberRoot, currentTime: number) {
  const existingCallbackNode = root.callbackNode;
  
  // 获取下一个需要处理的 lanes
  const nextLanes = getNextLanes(
    root,
    root === workInProgressRoot ? workInProgressRootRenderLanes : NoLanes
  );
  
  const newCallbackPriority = getHighestPriorityLane(nextLanes);
  
  // 如果优先级相同，复用现有的任务
  if (
    existingCallbackNode !== null &&
    existingCallbackPriority === newCallbackPriority
  ) {
    return;
  }
  
  // 取消低优先级的任务
  if (existingCallbackNode !== null) {
    cancelCallback(existingCallbackNode);
  }
  
  // 调度新的高优先级任务
  let newCallbackNode;
  if (newCallbackPriority === SyncLane) {
    // 同步任务
    newCallbackNode = scheduleSyncCallback(
      performSyncWorkOnRoot.bind(null, root)
    );
  } else {
    // 异步任务
    const schedulerPriorityLevel = 
      lanesToSchedulerPriority(newCallbackPriority);
    
    newCallbackNode = scheduleCallback(
      schedulerPriorityLevel,
      performConcurrentWorkOnRoot.bind(null, root)
    );
  }
  
  root.callbackNode = newCallbackNode;
  root.callbackPriority = newCallbackPriority;
}
```

### 跳过低优先级更新

在 `updateReducer` 中，会跳过优先级不够的更新：

```javascript
do {
  const updateLane = update.lane;
  
  if (!isSubsetOfLanes(renderLanes, updateLane)) {
    // 优先级不够，跳过这个更新
    // 将更新保存到 baseQueue，等待下次渲染
    const clone = {
      lane: updateLane,
      action: update.action,
      eagerReducer: update.eagerReducer,
      eagerState: update.eagerState,
      next: null,
    };
    
    if (newBaseQueueLast === null) {
      newBaseQueueFirst = newBaseQueueLast = clone;
      newBaseState = newState;
    } else {
      newBaseQueueLast = newBaseQueueLast.next = clone;
    }
  } else {
    // 优先级足够，应用更新
    newState = reducer(newState, action);
  }
  
  update = update.next;
} while (update !== null && update !== first);
```

## 实战示例

### 1. 多次 setState 的合并

```javascript
function App() {
  const [count, setCount] = useState(0);
  
  function handleClick() {
    // 这些更新会被合并
    setCount(count + 1); // count = 1
    setCount(count + 1); // count = 1 (还是1！)
    setCount(count + 1); // count = 1
  }
  
  // 正确的做法：使用函数式更新
  function handleClickCorrect() {
    setCount(c => c + 1); // count = 1
    setCount(c => c + 1); // count = 2
    setCount(c => c + 1); // count = 3
  }
  
  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={handleClick}>Wrong</button>
      <button onClick={handleClickCorrect}>Correct</button>
    </div>
  );
}
```

### 2. 在渲染中更新状态

```javascript
function App() {
  const [count, setCount] = useState(0);
  
  // ⚠️ 危险：可能导致无限循环
  setCount(count + 1);
  
  // ✅ 正确：在副作用中更新
  useEffect(() => {
    setCount(c => c + 1);
  }, []);
  
  return <div>Count: {count}</div>;
}
```

### 3. 优先级示例

```javascript
function App() {
  const [text, setText] = useState('');
  const [items, setItems] = useState([]);
  
  function handleChange(e) {
    // 高优先级：立即更新输入框
    setText(e.target.value);
    
    // 低优先级：延迟更新列表
    startTransition(() => {
      const filtered = items.filter(item => 
        item.includes(e.target.value)
      );
      setItems(filtered);
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

## 性能优化建议

### 1. 使用函数式更新

```javascript
// ❌ 不好
setCount(count + 1);

// ✅ 好
setCount(c => c + 1);
```

### 2. 合并状态

```javascript
// ❌ 不好：多个 state
const [firstName, setFirstName] = useState('');
const [lastName, setLastName] = useState('');

// ✅ 好：合并相关的 state
const [name, setName] = useState({ first: '', last: '' });
```

### 3. 使用 useReducer 处理复杂状态

```javascript
// ❌ 不好：多个 useState
const [loading, setLoading] = useState(false);
const [error, setError] = useState(null);
const [data, setData] = useState(null);

// ✅ 好：使用 useReducer
const [state, dispatch] = useReducer(reducer, initialState);
```

### 4. 避免在渲染中创建新对象

```javascript
// ❌ 不好
function Parent() {
  return <Child style={{ color: 'red' }} />;
}

// ✅ 好
const style = { color: 'red' };
function Parent() {
  return <Child style={style} />;
}
```

## 总结

React 的状态管理机制：

1. **数据结构**
   - Hook 对象存储状态
   - Update 对象表示更新
   - UpdateQueue 管理更新队列

2. **更新流程**
   - 创建 Update 对象
   - 加入更新队列
   - 调度更新
   - 计算新状态

3. **批量更新**
   - React 17：只在事件处理函数中批量更新
   - React 18：自动批量更新所有更新

4. **优先级**
   - 使用 Lane 模型
   - 高优先级可以打断低优先级
   - 跳过的更新会保存到 baseQueue

理解状态管理的原理有助于：
- 正确使用 useState 和 useReducer
- 避免常见的错误
- 优化应用性能
- 理解 React 的更新机制

## 相关阅读

- [React Fiber 原理](/react/fiber)
- [React Reconciler](/react/reconciler)
- [React Hooks](/react/hooks)
- [React 18 新特性](/react/react-18)

